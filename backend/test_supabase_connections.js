const postgres = require('postgres');

const urls = [
  "postgresql://postgres.qijheygofqdfxdemcoqw:1234Adelino%40@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  "postgresql://postgres.qijheygofqdfxdemcoqw:1234Adelino%40@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres:1234Adelino%40@db.qijheygofqdfxdemcoqw.supabase.co:5432/postgres",
  "postgresql://postgres:1234Adelino%40@db.qijheygofqdfxdemcoqw.supabase.co:6543/postgres"
];

async function testAll() {
  for (const url of urls) {
    console.log(`\nTesting: ${url.replace(/1234Adelino%40/, '***')}`);
    try {
      const sql = postgres(url, { ssl: 'require', connect_timeout: 5 });
      const res = await sql`SELECT 1 as test`;
      console.log('✅ SUCCESS!', res);
      await sql.end();
    } catch (err) {
      console.error('❌ FAILED:', err.message);
    }
  }
}

testAll();
