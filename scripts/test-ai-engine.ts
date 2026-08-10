// Test AI engine baru
process.env.TZ = 'Asia/Jakarta'

import {
  analyzeSentiment, calculatePriority, extractKeywords, detectCategory,
  aiGenerateEssayQuestionLLM, aiAnalyzeEssayResponseLLM, aiGenerateOpinionSummaryLLM
} from '../src/lib/ai-engine'
import { detectLocationFromDB, loadTerritories } from '../src/lib/ai-engine'

async function main() {
  console.log('=== TEST 1: Sentiment Analyzer (LENGKAP) ===')
  const testCases = [
    'Saya kecewa berat dengan kinerja LAPRA 08, janji tidak ditepati',
    'LAPRA 08 luar biasa, terima kasih atas bantuannya',
    'DPC Pontianak tidur, keluhan warga tidak ditangani sudah 2 minggu',
    'Pupuk bersubsidi di Grobogan habis, petani kesulitan',
    'Hashim resmikan markas baru LAPRA 08 di Jakarta',
    'LAPRA 08 Sumut apresiasi pelayanan Satlantas Polrestabes Medan',
    'Saya marah besar, DPC tidak pernah respon keluhan kami',
    'Terima kasih LAPRA 08 sudah advokasi keluhan kami',
    'DPD Aceh raih penghargaan dari DPN atas dedikasi kawal Asta Cita',
    'Bantuan sosial tidak cair, warga protes ke DPC',
  ]
  let correct = 0
  const expected = ['NEGATIVE', 'POSITIVE', 'NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'NEGATIVE', 'POSITIVE', 'POSITIVE', 'NEGATIVE']
  testCases.forEach((t, i) => {
    const result = analyzeSentiment(t)
    const isCorrect = result.sentiment === expected[i]
    if (isCorrect) correct++
    const icon = isCorrect ? '✅' : '❌'
    console.log(`${icon} [${result.sentiment}] (score: ${result.score}, neg: ${result.matchedNegative.length}, pos: ${result.matchedPositive.length}) — "${t.substring(0, 60)}..."`)
    if (!isCorrect) console.log(`   Expected: ${expected[i]}, Got: ${result.sentiment}`)
  })
  console.log(`\nAkurasi sentiment: ${correct}/${testCases.length} (${Math.round((correct/testCases.length)*100)}%)`)
  
  console.log('\n=== TEST 2: Location Detection dari DB ===')
  await loadTerritories() // cache
  const testLoc = [
    'LAPRA 08 Cianjur gelar rapat',
    'LAPRA 08 Tulungagung pelatihan kader',
    'LAPRA 08 Jayapura koordinasi dengan Pemda',
    'LAPRA 08 Bima NTT bersama nelayan',
    'LAPRA 08 Sabang apresiasi KKP',
  ]
  let locDetected = 0
  for (const t of testLoc) {
    const loc = await detectLocationFromDB(t)
    if (loc.regencyCode || loc.provinceCode) locDetected++
    console.log(`  ${t.substring(0, 45)} → ${loc.regencyName || loc.provinceName || 'TIDAK DETEKSI'}`)
  }
  console.log(`Detection: ${locDetected}/${testLoc.length}`)
  
  console.log('\n=== TEST 3: Keyword Extraction ===')
  const sampleAnswer = 'Saya sebagai petani di Grobogan sangat kecewa dengan kenaikan harga pupuk. Hasil panen saya menurun karena tidak mampu beli pupuk.'
  const keywords = extractKeywords(sampleAnswer)
  console.log('Keywords:', keywords)
  console.log('Stop word "sebagai" excluded:', !keywords.includes('sebagai') ? 'YES ✅' : 'NO ❌')
  
  console.log('\n=== TEST 4: LLM Generate Essay Question ===')
  try {
    const q = await aiGenerateEssayQuestionLLM({
      sourceTopic: 'Kenaikan harga pupuk bersubsidi di Grobogan',
      sourceContent: 'Petani Grobogan mengeluhkan kenaikan harga pupuk 30% yang membuat mereka kesulitan membiayai musim tanam.',
      detectedLocation: 'Grobogan, Jawa Tengah',
      detectedOccupation: 'PETANI',
      detectedSentiment: 'NEGATIVE',
    })
    console.log('Title:', q.title)
    console.log('Question:', q.question)
    console.log('Description:', q.description)
    console.log('Target Occupation:', q.targetOccupation)
  } catch (e: any) {
    console.log('LLM failed:', e.message)
  }
  
  console.log('\n=== TEST 5: LLM Analyze Essay Response ===')
  try {
    const analysis = await aiAnalyzeEssayResponseLLM(
      'Saya sangat kecewa karena harga pupuk naik. Sebagai petani kecil, saya tidak mampu beli pupuk untuk musim tanam tahun ini. Mohon LAPRA 08 bantu advokasi ke pemerintah agar harga pupuk dikendalikan.',
      'Sebagai petani, bagaimana pendapat Anda tentang kenaikan harga pupuk?'
    )
    console.log('Sentiment:', analysis.sentiment)
    console.log('Score:', analysis.score)
    console.log('Category:', analysis.category)
    console.log('Summary:', analysis.summary)
    console.log('Keywords:', analysis.keywords)
  } catch (e: any) {
    console.log('LLM failed:', e.message)
  }
  
  console.log('\n=== TEST 6: LLM Generate Opinion Summary ===')
  try {
    const summary = await aiGenerateOpinionSummaryLLM(
      'Hashim Resmikan Markas Baru Laskar Prabowo 08 di Jakarta',
      'Hashim Djojohadikusumo meresmikan markas baru Laskar Prabowo 08 di Jakarta. Acara ini dihadiri ribuan kader dari berbagai daerah.'
    )
    console.log('Summary:', summary.summary)
    console.log('Sentiment:', summary.sentiment)
    console.log('Category:', summary.category)
    console.log('Priority:', summary.priority)
    console.log('Keywords:', summary.keywords)
  } catch (e: any) {
    console.log('LLM failed:', e.message)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
