const http = require('http');

function postJson(path, body, headers = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8080,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on('error', e => {
      resolve({ error: e.message });
    });
    req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== Teste 1: Registo de Novo Estudante no Firebase/Firestore ===');
  const regEmail = `aluno.${Date.now()}@gmail.com`;
  const regRes = await postJson('/api/auth/register', {
    name: 'Estudante Teste Firebase',
    email: regEmail,
    password: 'Password123!'
  });
  console.log('Registo:', regRes);

  console.log('\n=== Teste 2: Autenticação via Google Sign-In ===');
  const googleRes = await postJson('/api/auth/google', {
    idToken: 'mock-google-id-token-' + Date.now(),
    email: 'emanueldejesus617@gmail.com',
    name: 'Emanuel de Jesus'
  });
  console.log('Google Auth:', googleRes);
}

test().catch(console.error);
