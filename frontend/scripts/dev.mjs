import { spawn } from 'node:child_process';

const openUrl = `http://localhost:3000/?v=trugo-${Date.now()}`;

const child = spawn('npx', ['vite', '--open', openUrl], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
