#!/usr/bin/env node
// Interactive encrypt script for Groq API key
// Usage: node scripts/encrypt_groq_key.js

import readline from 'readline';
import crypto from 'crypto';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(q, silent = false) {
  return new Promise((resolve) => {
    if (!silent) return rl.question(q, ans => resolve(ans));
    // silent: hide input (password)
    const stdin = process.openStdin();
    process.stdin.on('data', char => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        default:
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(q + Array(rl.line.length + 1).join('*'));
          break;
      }
    });
    rl.question(q, answer => {
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

function encryptApiKey(apiKey, password) {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64')
  };
}

(async () => {
  try {
    const apiKey = (await question('Paste Groq API key (will not be saved): ')).trim();
    if (!apiKey) {
      console.error('No API key provided. Aborting.');
      process.exit(1);
    }
    const password = await question('Choose a password to encrypt the key (kept only in your head): ', true);
    if (!password) {
      console.error('No password provided. Aborting.');
      process.exit(1);
    }
    const encrypted = encryptApiKey(apiKey, password);
    console.log('\n✅ Encrypted key JSON (copy this into groq-key-manager.js ENCRYPTED_KEY):\n');
    console.log(JSON.stringify(encrypted, null, 2));
    console.log('\nKeep the password safe — it is required to decrypt the key on startup.');
    rl.close();
  } catch (e) {
    console.error('Encryption failed:', e);
    rl.close();
    process.exit(1);
  }
})();
