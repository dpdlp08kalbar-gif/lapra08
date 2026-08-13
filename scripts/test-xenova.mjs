// Test Xenova model loading + sentiment inference
(async () => {
  console.log('=== Test 1: Xenova sentiment ===\n');
  try {
    const { analyzeSentimentXenova } = await import('/home/z/my-project/src/lib/xenova-engine.ts');
    console.log('Loading model (first call downloads ~125MB, may take 1-2 min)...');
    const t0 = Date.now();
    const result = await analyzeSentimentXenova('LAPRA 08 mengadakan aksi sosial yang sangat membantu masyarakat');
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`✅ Result (in ${elapsed}s):`, result);

    console.log('\n=== Test 2: Negative sentiment ===');
    const t1 = Date.now();
    const result2 = await analyzeSentimentXenova('Saya kecewa dengan lambatnya respon LAPRA 08 terhadap keluhan warga');
    console.log(`✅ Result (in ${((Date.now() - t1) / 1000).toFixed(1)}s):`, result2);

    console.log('\n=== Test 3: Embedding generation ===');
    const { generateEmbedding } = await import('/home/z/my-project/src/lib/xenova-engine.ts');
    const t2 = Date.now();
    const emb = await generateEmbedding('LAPRA 08 aksi sosial Pontianak');
    console.log(`✅ Embedding (in ${((Date.now() - t2) / 1000).toFixed(1)}s):`, emb ? `dim=${emb.length}, first5=[${Array.from(emb.slice(0, 5)).map(v => v.toFixed(4)).join(', ')}]` : 'NULL');
  } catch (e) {
    console.error('❌ Test failed:', e.message);
    console.error(e.stack);
  }
})();
