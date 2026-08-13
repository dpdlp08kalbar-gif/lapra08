// LAPRA 08 - FOSS AI Engine (Xenova Transformers.js)
// =====================================================
// 100% local AI inference — no external API calls, no paid services.
// Models loaded on-demand from HuggingFace Hub (cached after first download).
//
// MODELS USED:
//   - Sentiment:  Xenova/bert-base-multilingual-cased-sentiments-student
//                 (3-class: positive/neutral/negative, multilingual incl. Indonesian)
//   - Embeddings: Xenova/paraphrase-multilingual-MiniLM-L12-v2
//                 (384-dim vectors, multilingual, ~470MB on disk after cache)
//
// COVERAGE:
//   - analyzeSentimentXenova(text) → { sentiment, confidence }
//   - generateEmbedding(text)      → Float32Array(384) for similarity search
//   - findSimilarOpinions(text, k)  → top-k most similar PublicOpinionLink rows
//   - generateExtractiveSummary(text, maxSentences) → top-K sentences by relevance
//
// FALLBACK CHAIN:
//   Xenova model load fails → lexicon-based analyzeSentiment() in ai-engine.ts
//   Embedding generation fails → empty array (caller handles)
//
// RUNTIME:
//   - Vercel serverless: cold start ~3-8s (downloads model from HF Hub on first call,
//     cached in /tmp/.cache/huggingface for subsequent invocations)
//   - Worker process (Railway/Fly.io): warm in-memory after first call, ~50ms/inference
import type { TextClassificationPipeline, FeatureExtractionPipeline } from '@xenova/transformers'

// === SINGLETON MODEL CACHE (avoid reloading on every call) ===
let _sentimentPipeline: TextClassificationPipeline | null = null
let _sentimentPromise: Promise<TextClassificationPipeline> | null = null
let _embeddingPipeline: FeatureExtractionPipeline | null = null
let _embeddingPromise: Promise<FeatureExtractionPipeline> | null = null

// === MODEL CONFIG ===
const SENTIMENT_MODEL = 'Xenova/bert-base-multilingual-cased-sentiments-student'
const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
const EMBEDDING_DIM = 384 // matches schema: vector(384)

// Truncate text to avoid OOM on long articles (model max: 512 tokens ≈ 2000 chars Indonesian)
const MAX_TEXT_LEN_SENTIMENT = 1000
const MAX_TEXT_LEN_EMBEDDING = 1500

/**
 * Lazy-load Xenova sentiment pipeline (singleton).
 * First call downloads model (~125MB), subsequent calls use cache.
 */
export async function getSentimentPipeline(): Promise<TextClassificationPipeline> {
  if (_sentimentPipeline) return _sentimentPipeline
  if (_sentimentPromise) return _sentimentPromise

  _sentimentPromise = (async () => {
    const { pipeline, env } = await import('@xenova/transformers')
    // Allow remote model download (default). Set env.localModelPath for offline.
    env.allowLocalModels = false
    // Disable remote file system (we want HF Hub only)
    env.useFS = false
    console.log(`[Xenova] Loading sentiment model: ${SENTIMENT_MODEL}`)
    const pipe = await pipeline('text-classification', SENTIMENT_MODEL, {
      quantized: true, // smaller, faster (40MB vs 125MB)
    }) as TextClassificationPipeline
    _sentimentPipeline = pipe
    console.log(`[Xenova] Sentiment model loaded`)
    return pipe
  })()

  try {
    return await _sentimentPromise
  } catch (e) {
    _sentimentPromise = null // reset so retry is possible
    throw e
  }
}

/**
 * Lazy-load Xenova embedding pipeline (singleton).
 * First call downloads model (~470MB after quantization), subsequent calls use cache.
 */
export async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (_embeddingPipeline) return _embeddingPipeline
  if (_embeddingPromise) return _embeddingPromise

  _embeddingPromise = (async () => {
    const { pipeline, env } = await import('@xenova/transformers')
    env.allowLocalModels = false
    env.useFS = false
    console.log(`[Xenova] Loading embedding model: ${EMBEDDING_MODEL}`)
    const pipe = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      quantized: true, // ~120MB instead of ~470MB
    }) as FeatureExtractionPipeline
    _embeddingPipeline = pipe
    console.log(`[Xenova] Embedding model loaded`)
    return pipe
  })()

  try {
    return await _embeddingPromise
  } catch (e) {
    _embeddingPromise = null
    throw e
  }
}

/**
 * Analyze sentiment using local Xenova model.
 * Falls back to null if model fails to load (caller should use lexicon).
 *
 * @returns { sentiment: 'POSITIVE'|'NEUTRAL'|'NEGATIVE', confidence: 0-1 }
 */
export async function analyzeSentimentXenova(text: string): Promise<{
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  confidence: number
} | null> {
  try {
    const truncated = text.substring(0, MAX_TEXT_LEN_SENTIMENT)
    const pipe = await getSentimentPipeline()
    const output = await pipe(truncated, { topk: 3 })
    // output: [{ label: 'positive', score: 0.85 }, { label: 'neutral', score: 0.10 }, { label: 'negative', score: 0.05 }]
    const top = (output as any[])[0]
    if (!top || !top.label) return null
    const label = top.label.toUpperCase()
    if (label !== 'POSITIVE' && label !== 'NEUTRAL' && label !== 'NEGATIVE') return null
    return { sentiment: label, confidence: top.score }
  } catch (e: any) {
    console.error('[Xenova sentiment] failed:', e.message.substring(0, 100))
    return null
  }
}

/**
 * Generate 384-dim embedding for a text (concatenation of title + content recommended).
 * Returns Float32Array(384) — pass directly to pgvector via raw SQL.
 *
 * Returns null on failure (caller should skip embedding update).
 */
export async function generateEmbedding(text: string): Promise<Float32Array | null> {
  try {
    const truncated = text.substring(0, MAX_TEXT_LEN_EMBEDDING)
    const pipe = await getEmbeddingPipeline()
    // pooling: 'mean' averages all token embeddings → single 384-dim vector
    // normalize: true → unit-length vector (better for cosine similarity)
    const output = await pipe(truncated, { pooling: 'mean', normalize: true })
    // output.data is Float32Array(384)
    const vec = (output as any).data as Float32Array
    if (!vec || vec.length !== EMBEDDING_DIM) {
      console.error(`[Xenova embedding] expected dim ${EMBEDDING_DIM}, got ${vec?.length}`)
      return null
    }
    return vec
  } catch (e: any) {
    console.error('[Xenova embedding] failed:', e.message.substring(0, 100))
    return null
  }
}

/**
 * Convert Float32Array to PostgreSQL vector literal string.
 * e.g. [0.1, 0.2, 0.3] → '[0.1,0.2,0.3]'
 */
export function embeddingToPgVector(vec: Float32Array): string {
  return '[' + Array.from(vec).map(v => v.toFixed(6)).join(',') + ']'
}

/**
 * Convert PostgreSQL vector string back to Float32Array.
 * e.g. '[0.1,0.2,0.3]' → Float32Array(3)
 */
export function pgVectorToEmbedding(s: string): Float32Array | null {
  if (!s || !s.startsWith('[') || !s.endsWith(']')) return null
  const inner = s.slice(1, -1)
  const parts = inner.split(',')
  const arr = new Float32Array(parts.length)
  for (let i = 0; i < parts.length; i++) {
    arr[i] = parseFloat(parts[i])
  }
  return arr
}

export const EMBEDDING_DIMENSION = EMBEDDING_DIM

/**
 * Generate extractive summary — pick top-K most relevant sentences
 * by computing sentence embedding similarity to overall document embedding.
 *
 * This is a FOSS alternative to LLM-based summarization (no text generation,
 * just ranking existing sentences by relevance).
 *
 * @param text Full article text
 * @param maxSentences Number of sentences to include in summary (default 3)
 */
export async function generateExtractiveSummary(
  text: string,
  maxSentences = 3
): Promise<string> {
  if (!text || text.trim().length < 100) return text || ''

  // 1. Split into sentences (Indonesian punctuation-aware)
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length >= 20 && s.length <= 500) // skip very short/long

  if (sentences.length <= maxSentences) return text

  try {
    // 2. Generate embeddings for each sentence + overall
    const [docEmbedding, ...sentenceEmbeddings] = await Promise.all([
      generateEmbedding(text.substring(0, MAX_TEXT_LEN_EMBEDDING)),
      ...sentences.map(s => generateEmbedding(s.substring(0, MAX_TEXT_LEN_EMBEDDING)))
    ])

    if (!docEmbedding || sentenceEmbeddings.some(e => !e)) {
      // Fallback: first N sentences
      return sentences.slice(0, maxSentences).join(' ')
    }

    // 3. Score each sentence by cosine similarity to document
    const scored = sentences.map((sentence, i) => ({
      sentence,
      score: cosineSimilarity(sentenceEmbeddings[i]!, docEmbedding),
      index: i,
    }))

    // 4. Pick top-K by score, preserve original order
    const topK = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)

    return topK.map(s => s.sentence).join(' ')
  } catch (e: any) {
    console.error('[Xenova extractive summary] failed:', e.message.substring(0, 100))
    // Last-resort fallback: first N sentences
    return sentences.slice(0, maxSentences).join(' ')
  }
}

/**
 * Cosine similarity between two unit-normalized vectors.
 * Output range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite).
 * For embeddings produced with normalize:true, this is just dot product.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }
  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }
  return dot // already normalized
}
