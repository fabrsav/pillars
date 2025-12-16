import fs from 'fs';
import path from 'path';
import { decryptPayload } from './encryption.js';

const DB_DIR = path.join(process.cwd(), 'db');
const FILE = path.join(DB_DIR, 'matched_betting_oauth.json');

export function loadTokenRecordRaw() {
  try {
    if (!fs.existsSync(FILE)) return null;
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function getDecryptedToken(secret) {
  const rec = loadTokenRecordRaw();
  if (!rec || !rec.token) return null;
  if (secret) {
    try {
      const dec = decryptPayload(rec.token, secret);
      return typeof dec === 'string' ? JSON.parse(dec) : dec;
    } catch (e) {
      console.warn('Failed to decrypt token with provided secret', e.message);
      return null;
    }
  }
  return rec.token;
}

export function getStoredAccountEmail() {
  const rec = loadTokenRecordRaw();
  return rec && rec.email ? rec.email : null;
}

export function saveLastOffers(obj) {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch(_) {}
  fs.writeFileSync(path.join(DB_DIR, 'matched_betting_last_offers.json'), JSON.stringify(obj, null, 2), 'utf8');
}

export function loadLastOffers() {
  try {
    const p = path.join(DB_DIR, 'matched_betting_last_offers.json');
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return null; }
}