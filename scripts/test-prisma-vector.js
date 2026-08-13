// Test if Prisma $executeRaw handles the embedding + geoPoint pattern correctly
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

(async () => {
  console.log('=== Testing Prisma raw SQL with vector + geography casts ===\n');

  // Test 1: Try the EXACT pattern used in src/worker/index.ts (BUG)
  console.log('Test 1: Pattern from worker (db.$queryRaw inside $executeRaw)');
  try {
    const embeddingSql = '[0.1,0.2,0.3]';
    const r = await prisma.$executeRaw`
      SELECT ${embeddingSql ? prisma.$queryRaw`${embeddingSql}::vector` : null} AS test_vec
    `;
    console.log('  Result:', r);
  } catch (e) {
    console.log('  ❌ FAILED:', e.message.substring(0, 200));
  }

  // Test 2: Pass embedding as parameter with cast (should work)
  console.log('\nTest 2: Parameterized string with ::vector cast');
  try {
    const embeddingSql = '[0.1,0.2,0.3]';
    const r = await prisma.$queryRaw`
      SELECT ${embeddingSql}::vector AS test_vec
    `;
    console.log('  ✅ Result:', r);
  } catch (e) {
    console.log('  ❌ FAILED:', e.message.substring(0, 200));
  }

  // Test 3: Use Prisma.raw for raw SQL fragment
  console.log('\nTest 3: Prisma.raw() for raw SQL');
  try {
    const embeddingSql = "'[0.1,0.2,0.3]'";
    const r = await prisma.$queryRaw`
      SELECT ${Prisma.raw(embeddingSql)}::vector AS test_vec
    `;
    console.log('  ✅ Result:', r);
  } catch (e) {
    console.log('  ❌ FAILED:', e.message.substring(0, 200));
  }

  // Test 4: Real INSERT attempt with embedding
  console.log('\nTest 4: Real INSERT with embedding column');
  try {
    const id = 'test_' + Date.now();
    const embeddingSql = '[0.1,0.2,0.3,0.4,0.5]';
    // Note: vector column is vector(384) — wrong dimension should fail
    await prisma.$executeRaw`
      INSERT INTO "PublicOpinionLink" (
        "id", "url", "platform", "title", "content", "embedding",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${'https://test.com/' + id}, ${'GOOGLE'}, ${'Test'}, ${'Test content'},
        ${embeddingSql}::vector,
        NOW(), NOW()
      )
      ON CONFLICT ("url") DO NOTHING
    `;
    console.log('  ✅ INSERT succeeded');
    // Cleanup
    await prisma.$executeRaw`DELETE FROM "PublicOpinionLink" WHERE id = ${id}`;
  } catch (e) {
    console.log('  ❌ FAILED:', e.message.substring(0, 300));
  }

  await prisma.$disconnect();
})();
