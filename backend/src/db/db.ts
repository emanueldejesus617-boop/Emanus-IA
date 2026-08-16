import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcrypt';

// Initialize Firebase Admin App singleton
let app: any;

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "emanus-ia";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Robust sanitization: trim, remove surrounding quotes (single or double), then replace escaped newlines
    privateKey = privateKey.trim().replace(/^["']+|["']+$/g, '').replace(/\r/g, '').replace(/\\n/g, '\n');
  }

  let initialized = false;
  if (clientEmail && privateKey) {
    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("🔥 Firebase Admin inicializado com Chave de Serviço.");
      initialized = true;
    } catch (certErr: any) {
      console.warn("⚠️ Aviso ao carregar Chave de Serviço do Firebase, a utilizar ID de Projeto como fallback:", certErr.message || certErr);
    }
  }
  
  if (!initialized) {
    app = initializeApp({
      projectId,
    });
    console.log(`🔥 Firebase Admin inicializado com ID de Projeto: ${projectId}`);
  }
} else {
  app = getApps()[0];
}

const databaseId = process.env.FIREBASE_DATABASE_ID || "emanus-ia";
export const firestore = getFirestore(app, databaseId);
export const adminAuth = getAuth(app);

export async function seedAdminUser() {
  const adminEmail = "EMANUELDEJESUS617@GMAIL.COM";
  const adminPassword = process.env.ADMIN_PASSWORD || "TutorIA@Admin2026!";

  try {
    const userSnapshot = await firestore.collection('users').where('email', '==', adminEmail.toUpperCase()).limit(1).get();
    
    if (userSnapshot.empty) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminId = "admin-default-id";
      await firestore.collection('users').doc(adminId).set({
        id: adminId,
        name: "Administrador",
        email: adminEmail.toUpperCase(),
        password: passwordHash,
        role: "admin",
        xp: 100,
        streak: 1,
        createdAt: new Date().toISOString()
      });
      console.log("✅ Utilizador Administrador semeado no Firebase Firestore.");
    }
  } catch (err: any) {
    console.warn("Aviso na sementeira de admin no Firestore:", err.message || err);
  }
}
