const { spawn } = require('child_process');

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

console.log('Iniciando os servidores...');
run('npm', ['run', 'dev'], './backend', 'Backend');
run('npm', ['run', 'dev'], './frontend', 'Frontend');
