const postgres = require('postgres');
require('dotenv').config();

const url = process.env.DATABASE_URL;
console.log('Tentando ligar a:', url ? url.replace(/:([^:@]+)@/, ':***@') : 'URL não definida');

const sql = postgres(url, { ssl: 'require', connect_timeout: 10 });

sql`SELECT 1 as test`
  .then(r => {
    console.log('✅ Ligação à base de dados OK:', r);
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ ERRO na ligação:', e.message);
    process.exit(1);
  });
