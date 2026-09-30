const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env'), override: true });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bcrypt = require('bcrypt');

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.trim().replace(/^["']+|["']+$/g, '').replace(/\r/g, '').replace(/\\n/g, '\n');
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || 'emanus-ia',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey
  })
});

const firestore = getFirestore(app, process.env.FIREBASE_DATABASE_ID || 'emanus-ia');

async function diagnose() {
  console.log("🔍 Diagnóstico do Firestore e Contas...");
  try {
    const snapshot = await firestore.collection('users').get();
    console.log(`Total de utilizadores no Firestore: ${snapshot.size}`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Email: "${data.email}"`);
      console.log(`  Role: ${data.role}`);
      console.log(`  HasPassword: ${!!data.password} (len: ${data.password ? data.password.length : 0})`);
      console.log(`  AuthProvider: ${data.authProvider || 'email'}`);
    });
    const adminDoc = await firestore.collection('users').doc('admin-default-id').get();
    if (adminDoc.exists) {
      const data = adminDoc.data();
      console.log("\n🔑 Dados da conta Admin:");
      console.log("Email:", data.email);
      console.log("Role:", data.role);
      const isMatch1 = await bcrypt.compare("TutorIA@Admin2026!", data.password);
      const isMatch2 = await bcrypt.compare("tutoria007", data.password);
      console.log("Palavra-passe é 'TutorIA@Admin2026!':", isMatch1);
      console.log("Palavra-passe é 'tutoria007':", isMatch2);
      
      // Para garantir que ambas funcionam ou garantir que TutorIA@Admin2026! funciona perfeitamente:
      if (!isMatch1 && !isMatch2) {
        const hash = await bcrypt.hash("TutorIA@Admin2026!", 10);
        await firestore.collection('users').doc('admin-default-id').update({ password: hash });
        console.log("✅ Palavra-passe atualizada para 'TutorIA@Admin2026!'");
      }
    }
  } catch (err) {
    console.error("Erro ao ler Firestore:", err);
  }
}

diagnose();
