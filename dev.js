const { spawn } = require('child_process');
const path = require('path');

// NOTE: Do NOT load .env here. The backend loads its own backend/.env via dotenv/config in server.ts.
// Loading multiline values (like FIREBASE_PRIVATE_KEY) in the parent process corrupts them
// when passed to child processes. Each subprocess handles its own env loading.

// Force Node.js to use IPv4 DNS resolution first to avoid connection hangs with Gemini API
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || "") + " --dns-result-order=ipv4first";

function run(command, args, cwd, prefix) {
  const child = spawn(command, args, { cwd, shell: true });

  child.stdout.on('data', (data) => {
    // Split by newlines and print each line with prefix
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`[${prefix}] ${trimmed}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        console.error(`[${prefix}] ERR: ${trimmed}`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`[${prefix}] exited with code ${code}`);
  });

  return child;
}

const useHttps = process.env.USE_HTTPS === 'true';
console.log(`Iniciando os servidores (Modo HTTPS: ${useHttps ? 'ATIVO' : 'INATIVO'})...`);
run('npm', ['run', 'dev'], './backend', 'Backend');
run('npm', ['run', useHttps ? 'dev:https' : 'dev'], './frontend', 'Frontend');
