import 'dotenv/config';
import postgres from 'postgres';

import bcrypt from 'bcrypt';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function test() {
  try {
    const email = "EMANUELDEJESUS617@GMAIL.COM";
    const passwordHash = await bcrypt.hash("tutoria007", 10);
    
    const result = await sql`
      UPDATE users 
      SET password = ${passwordHash} 
      WHERE email = ${email}
      RETURNING id
    `;
    
    if (result.length > 0) {
      console.log('✅ Senha do admin atualizada com sucesso no banco de dados!');
    } else {
      console.log('⚠️ Usuário admin não encontrado para atualizar a senha.');
    }
    
    await sql.end();
  } catch (err) {
    console.error('❌ Falha ao atualizar senha:', err.message);
    process.exit(1);
  }
}

test();
