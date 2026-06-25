import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['api-server.mjs'], {
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(process.execPath, [
    'node_modules/@angular/cli/bin/ng.js',
    'serve',
    '--proxy-config',
    'proxy.conf.json',
  ], {
    stdio: 'inherit',
    env: process.env,
  }),
];

let shuttingDown = false;

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  children.forEach((child) => {
    if (!child.killed) child.kill();
  });

  setTimeout(() => process.exit(exitCode), 100);
};

children.forEach((child) => {
  child.on('exit', (code, signal) => {
    if (shuttingDown || signal === 'SIGTERM') return;
    stopAll(code ?? 1);
  });
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
