const dotenv = require('dotenv');
dotenv.config({ path: './.env', override: true });
const { cert } = require('firebase-admin/app');

let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
// Simulate quotes with trailing spaces and newlines
rawKey = `  "${rawKey}" \n `;

let cleanedKey = rawKey.trim().replace(/^["']+|["']+$|\r/g, '').replace(/\\n/g, '\n');

console.log('Cleaned key start:', JSON.stringify(cleanedKey.substring(0, 35)));
console.log('Cleaned key end:', JSON.stringify(cleanedKey.substring(cleanedKey.length - 35)));

try {
  const credential = cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: cleanedKey
  });
  console.log('✅ CERT SUCCESSFUL! Private key parsed 100% correctly.');
} catch (err) {
  console.error('❌ CERT FAILED:', err.message);
}
