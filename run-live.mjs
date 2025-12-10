import { spawn } from 'child_process';
import localtunnel from 'localtunnel';
import fs from 'fs';
import net from 'net';

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`)));
    p.on('error', err => reject(err));
  });
}

async function run() {
  try {
    console.log('1) Building app (vite)...');
    await runCommand('npm', ['run', 'build']);

    console.log('2) Checking server port (3001)...');
    const port = 3001;

    const isPortOpen = (portToCheck) => new Promise((resolve) => {
      const s = net.createConnection({ port: portToCheck, host: '127.0.0.1' });
      s.on('connect', () => { s.end(); resolve(true); });
      s.on('error', () => resolve(false));
    });

    const portUsed = await isPortOpen(port);
    let server = null;
    if (!portUsed) {
      console.log('Port free — starting server (node server.js)...');
      server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

      server.on('exit', (code) => {
        console.log('Server exited with code', code);
        process.exit(code || 0);
      });

      // Wait a short time for server to bind
      await new Promise(resolve => setTimeout(resolve, 1200));
    } else {
      console.log('Port 3001 already in use — assuming server already running.');
    }

    console.log('3) Opening public tunnel (localtunnel) to port', port, '...');
    const tunnel = await localtunnel({ port });

    console.log('Public URL:', tunnel.url);
    try { fs.writeFileSync('./LIVE_URL.txt', tunnel.url + '\n'); } catch (e) { console.warn('Could not write LIVE_URL.txt', e.message); }

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      if (server) server.kill();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, closing tunnel and server...');
      tunnel.close();
      if (server) server.kill();
      process.exit(0);
    });

  } catch (err) {
    console.error('run-live failed:', err);
    process.exit(1);
  }
}

run();
