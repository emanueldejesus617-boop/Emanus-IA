require('dotenv').config();
const postgres = require('postgres');
const connectionString = process.env.DATABASE_URL;
console.log("Connection string is set:", !!connectionString);
const client = postgres(connectionString, { ssl: 'require' });

async function main() {
  try {
    const res = await client`SELECT 1 as result`;
    console.log("DB connection successful!", res);
  } catch (err) {
    console.error("DB connection error:", err);
  } finally {
    await client.end();
  }
}

main();
