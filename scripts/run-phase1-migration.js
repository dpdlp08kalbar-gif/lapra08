// LAPRA 08 - Robust SQL migration runner
// Handles dollar-quoted strings ($$ ... $$) correctly
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_COTQsW4bY6Zd@ep-lingering-unit-az9uc0ms-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } }
});

// SQL splitter that respects $$ ... $$ blocks and string literals
function splitSQL(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.substring(i);
    // Check for $$ tag start/end
    if (!inDollarQuote) {
      const tagMatch = rest.match(/^\$[\w]*\$([\s\S]*?)\$[\w]*\$/);
      if (tagMatch && rest.indexOf('$$') !== -1) {
        // Find the dollar tag (could be $body$, $$, $func$, etc.)
        const tagStart = rest.indexOf('$');
        const tagEnd = rest.indexOf('$', tagStart + 1) + 1;
        const tag = rest.substring(tagStart, tagEnd); // e.g. "$$"
        const tagContent = tagStart >= 0 ? rest.substring(tagStart) : '';
        // Find closing tag
        const closeIdx = tagContent.indexOf(tag, tag.length);
        if (closeIdx > 0) {
          // This is a dollar-quoted block
          const fullBlock = rest.substring(tagStart, tagStart + closeIdx + tag.length);
          // Append everything before the $$
          current += rest.substring(0, tagStart);
          current += fullBlock;
          i += tagStart + closeIdx + tag.length;
          continue;
        }
      }
      // Normal char
      current += ch;
      i++;
      if (ch === ';') {
        // Statement boundary
        const stmt = current.trim();
        if (stmt && stmt !== ';') statements.push(stmt);
        current = '';
      }
    } else {
      current += ch;
      i++;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

(async () => {
  try {
    const sql = fs.readFileSync('/home/z/my-project/prisma/migrations/phase1_extensions.sql', 'utf8');
    
    // Remove comment-only lines but preserve -- inside strings
    const cleanedSQL = sql.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Keep lines that are pure SQL or comments inside $$ blocks
        if (trimmed.startsWith('--')) return false;
        return true;
      })
      .join('\n');
    
    const statements = splitSQL(cleanedSQL);
    console.log(`▶ Parsed ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt === 'BEGIN' || stmt === 'COMMIT') continue;
      try {
        await prisma.$executeRawUnsafe(stmt);
        const preview = stmt.substring(0, 70).replace(/\s+/g, ' ');
        console.log(`  [${i+1}/${statements.length}] ✅ ${preview}...`);
      } catch (e) {
        const msg = e.message.substring(0, 150);
        const preview = stmt.substring(0, 70).replace(/\s+/g, ' ');
        if (msg.includes('already exists')) {
          console.log(`  [${i+1}] ⏭ Skip (exists): ${preview.substring(0, 50)}...`);
        } else {
          console.error(`  [${i+1}] ❌ FAILED: ${preview.substring(0, 50)}`);
          console.error(`      Error: ${msg}`);
        }
      }
    }
    
    console.log('\n=== Verification ===');
    
    const exts = await prisma.$queryRaw`SELECT extname, extversion FROM pg_extension ORDER BY extname`;
    console.log('Extensions:');
    exts.forEach(e => console.log(`  ${e.extname} ${e.extversion}`));
    
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'PublicOpinionLink'
        AND column_name IN ('geoPoint','embedding','tsv','language','rawPayload','confidenceScore','topicCluster')
      ORDER BY column_name
    `;
    console.log('\nPublicOpinionLink new columns:');
    cols.forEach(c => console.log(`  ${c.column_name} | ${c.data_type} | ${c.udt_name}`));
    
    const idx = await prisma.$queryRaw`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'PublicOpinionLink' AND indexname LIKE '%_idx'
      ORDER BY indexname
    `;
    console.log('\nPublicOpinionLink indexes:');
    idx.forEach(i => console.log(`  ${i.indexname}`));
    
  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
