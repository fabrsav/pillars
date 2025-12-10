#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { PLAINTEXT_GROQ_KEY } from '../groq-key-manager.js';

const DB_DIR = path.join(process.cwd(), 'db');
const TOKEN_FILE = path.join(DB_DIR, 'groq_recovery_token.json');

function question(q, silent = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!silent) return rl.question(q, ans => { rl.close(); resolve(ans); });

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
    rl.question(q, answer => { process.stdout.write('\n'); rl.close(); resolve(answer); });
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

function saveRecoveryTokenHash(token) {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ hash }, null, 2), { encoding: 'utf8' });
}

function loadRecoveryTokenHash() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return j.hash || null;
  } catch (e) {
    return null;
  }
}

async function cmdSetPassphrase() {
  console.log('This will generate an encrypted JSON for the hardcoded Groq key and a recovery token.');
  const password = await question('Choose a password to encrypt the key (kept only in your head): ', true);
  if (!password) { console.error('No password provided. Aborting.'); process.exit(1); }

  const encrypted = encryptApiKey(PLAINTEXT_GROQ_KEY, password);

  // generate recovery token and save its hash
  const recoveryToken = crypto.randomBytes(32).toString('base64');
  saveRecoveryTokenHash(recoveryToken);

  console.log('\n✅ Encrypted key JSON (copy this into groq-key-manager.js ENCRYPTED_KEY):\n');
  console.log(JSON.stringify(encrypted, null, 2));
  console.log('\nIMPORTANT: Save the following recovery token somewhere safe — it will be required to reset the passphrase if you forget it.');
  console.log('\nRecovery token (store it now):\n' + recoveryToken + '\n');
  console.log('A hash of the recovery token has been stored in `db/groq_recovery_token.json`.');
}

async function cmdResetPassphrase() {
  const storedHash = loadRecoveryTokenHash();
  if (!storedHash) { console.error('No recovery token hash found. Run set-passphrase first.'); process.exit(1); }

  const provided = await question('Paste your recovery token: ');
  const providedHash = crypto.createHash('sha256').update(provided).digest('hex');
  if (providedHash !== storedHash) { console.error('Invalid recovery token. Aborting.'); process.exit(1); }

  const newPassword = await question('Choose a NEW password to encrypt the key: ', true);
  if (!newPassword) { console.error('No password provided. Aborting.'); process.exit(1); }

  const encrypted = encryptApiKey(PLAINTEXT_GROQ_KEY, newPassword);
  console.log('\n✅ New encrypted key JSON (copy this into groq-key-manager.js ENCRYPTED_KEY):\n');
  console.log(JSON.stringify(encrypted, null, 2));
  console.log('\nYou may keep the existing recovery token or generate a new one by running set-passphrase again.');
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'set-passphrase') {
    await cmdSetPassphrase();
  } else if (cmd === 'reset-passphrase') {
    await cmdResetPassphrase();
  } else {
    console.log('Usage: node scripts/groq_key_tools.js <command>');
    console.log('\nCommands:');
    console.log('  set-passphrase    - Encrypt hardcoded key and generate recovery token');
    console.log('  reset-passphrase  - Reset passphrase using recovery token');
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
