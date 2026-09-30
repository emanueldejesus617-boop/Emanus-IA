const http = require('http');

async function testEndpoint(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🔒 INICIANDO SUÍTE DE TESTES DE SEGURANÇA E LOGIN...\n");

  let passed = 0;
  let total = 0;

  // TESTE 1: Google Auth Bypass Mitigation
  total++;
  try {
    const res = await testEndpoint({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/google',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      idToken: 'fake-invalid-token-123',
      email: 'admin_impersonator@emanus.ia',
      name: 'Hacker'
    });

    if (res.statusCode === 401 && res.body?.error) {
      console.log("✅ [TESTE 1] Proteção Google Auth: Token inválido rejeitado com 401 Unauthorized.");
      passed++;
    } else {
      console.error("❌ [TESTE 1] Falha: Retornou status", res.statusCode, res.body);
    }
  } catch (err) {
    console.error("❌ [TESTE 1] Erro de conexão:", err.message);
  }

  // TESTE 2: Registro com senha fraca
  total++;
  try {
    const res = await testEndpoint({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Teste',
      email: 'test' + Date.now() + '@teste.com',
      password: '123'
    });

    if (res.statusCode === 400 && res.body?.error) {
      console.log("✅ [TESTE 2] Validação de Senha: Senha fraca rejeitada com 400 Bad Request (" + res.body.error + ").");
      passed++;
    } else {
      console.error("❌ [TESTE 2] Falha: Retornou status", res.statusCode, res.body);
    }
  } catch (err) {
    console.error("❌ [TESTE 2] Erro de conexão:", err.message);
  }

  // TESTE 3: Verificação de Cabeçalhos de Segurança (HSTS / Frameguard / NoSniff)
  total++;
  try {
    const res = await testEndpoint({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    const hsts = res.headers['strict-transport-security'];
    const xFrame = res.headers['x-frame-options'];
    const noSniff = res.headers['x-content-type-options'];

    if (res.statusCode === 401 && hsts && xFrame && noSniff) {
      console.log("✅ [TESTE 3] Cabeçalhos de Segurança HTTP e HSTS ativos:", {
        hsts,
        xFrame,
        noSniff
      });
      passed++;
    } else {
      console.error("❌ [TESTE 3] Cabeçalhos ausentes ou status incorreto:", res.headers, res.statusCode);
    }
  } catch (err) {
    console.error("❌ [TESTE 3] Erro de conexão:", err.message);
  }

  console.log(`\n========================================`);
  console.log(`🎯 RESULTADO FINAL: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
  console.log(`========================================\n`);
}

// Iniciar servidor em background se não estiver rodando ou rodar testes
runTests();
