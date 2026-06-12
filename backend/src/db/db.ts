import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

const client = createClient({ url: 'file:sqlite.db' });
export const db = drizzle(client, { schema });

export async function seedAdminUser() {
  const adminEmail = "EMANUELDEJESUS617@GMAIL.COM";
  try {
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1);
    
    if (existing.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD || "SONHOSGRANDES,MERECEM,SACRIFICIOS,GRANDES";
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.insert(schema.users).values({
        id: crypto.randomUUID(),
        name: "Administrador",
        email: adminEmail,
        password: passwordHash,
        role: "admin",
        xp: 0,
        streak: 0,
        createdAt: new Date().toISOString()
      });
      console.log("Admin user seeded in SQLite.");
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

