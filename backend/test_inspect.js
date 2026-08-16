const postgres = require('postgres');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Load .env from root
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    const parts = trimmedLine.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'MISSING');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
  try {
    const users = await sql`SELECT * FROM users`;
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        classe: u.classe,
        subjects: u.subjects,
        subjectsType: typeof u.subjects,
        lastLoginAt: u.last_login_at || u.lastLoginAt
      });
      const match = await bcrypt.compare('tutoria007', u.password);
      console.log(`Password match with 'tutoria007' for ${u.email}:`, match);
    }
    await sql.end();
  } catch (err) {
    console.error('DB ERROR:', err);
  }
}

run();
