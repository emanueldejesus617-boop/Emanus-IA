const http = require('http');

async function test() {
  const data = JSON.stringify({
    name: 'Teste Emanuel',
    email: 'teste.emanuel@gmail.com',
    password: 'Password123!'
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 8080,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('HEADERS:', res.headers);
      console.log('BODY:', body);
    });
  });

  req.on('error', e => console.error('Erro de requisição:', e.message));
  req.write(data);
  req.end();
}

test();
