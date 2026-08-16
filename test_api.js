const http = require('http');

function testEndpoint(path, body, description) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`\n[${description}]`);
        console.log('  STATUS:', res.statusCode);
        console.log('  BODY:', body.substring(0, 300));
        resolve();
      });
    });
    req.on('error', e => {
      console.log(`\n[${description}] ERROR: ${e.message}`);
      resolve();
    });
    req.setTimeout(10000, () => {
      console.log(`\n[${description}] TIMEOUT`);
      req.destroy();
      resolve();
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Testing API endpoints ===\n');

  // Test AI Chat
  await testEndpoint('/api/ai/chat', {
    message: 'Olá, o que é fotossíntese?',
    history: [],
    subject: 'Biologia'
  }, 'AI Chat (no auth)');

  // Test Exam Generate (needs auth - will get 401)
  await testEndpoint('/api/exams/generate', {
    subject: 'Matemática'
  }, 'Exams Generate (no auth)');

  // Test Lessons Generate (needs auth - will get 401)
  await testEndpoint('/api/lessons/generate-lesson', {
    subject: 'Física',
    topicName: 'Cinemática'
  }, 'Lessons Generate (no auth)');

  // Test Schedule Generate (needs auth - will get 401)
  await testEndpoint('/api/schedule/generate', {}, 'Schedule Generate (no auth)');

  console.log('\n=== Done ===');
}

main().catch(console.error);
