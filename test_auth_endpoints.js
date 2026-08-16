const http = require('http');

function postJson(path, body, headers = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
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
    req.setTimeout(60000, () => { // 60s timeout for AI generation
      req.destroy();
      resolve({ error: 'TIMEOUT' });
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Step 1: Logging in as Admin ===');
  const loginRes = await postJson('/api/auth/login', {
    email: 'EMANUELDEJESUS617@GMAIL.COM',
    password: 'tutoria007'
  });
  
  if (loginRes.error || loginRes.statusCode !== 200) {
    console.error('Login failed!', loginRes);
    process.exit(1);
  }
  
  const loginData = JSON.parse(loginRes.body);
  const token = loginData.token;
  console.log('Login successful! Token acquired.');
  
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log('\n=== Step 2: Testing /api/exams/generate ===');
  const examRes = await postJson('/api/exams/generate', {
    subject: 'Biologia'
  }, authHeaders);
  console.log('Status:', examRes.statusCode);
  console.log('Body:', examRes.body.substring(0, 300));

  console.log('\n=== Step 3: Testing /api/lessons/generate-lesson ===');
  const lessonRes = await postJson('/api/lessons/generate-lesson', {
    subject: 'Física',
    topicName: 'Cinemática'
  }, authHeaders);
  console.log('Status:', lessonRes.statusCode);
  console.log('Body:', lessonRes.body.substring(0, 300));

  console.log('\n=== Step 4: Testing /api/schedule/generate ===');
  const scheduleRes = await postJson('/api/schedule/generate', {}, authHeaders);
  console.log('Status:', scheduleRes.statusCode);
  console.log('Body:', scheduleRes.body.substring(0, 300));

  console.log('\n=== Testing Complete ===');
}

main().catch(console.error);
