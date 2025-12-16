import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fetchRecentEmails } from '../../scripts/matched_betting_mail.js';

const router = express.Router();
const DB_DIR = path.join(process.cwd(), 'db');

const requireAuthLocal = (req, res, next) => {
  const AUTH_TOKEN = process.env.PILLARS_TOKEN || process.env.VITE_PILLARS_TOKEN || null;
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  return next();
};

function encryptObj(obj, secret) {
  if (!secret) return obj; // store plaintext if no secret
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: true, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
}

function decryptObj(obj, secret) {
  if (!obj || !obj.encrypted) return obj;
  if (!secret) throw new Error('Server secret not configured');
  const salt = Buffer.from(obj.salt, 'base64');
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const data = Buffer.from(obj.data, 'base64');
  const key = crypto.scryptSync(secret, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

function getStoredCredentials() {
  try {
    const file = path.join(DB_DIR, 'matched_betting_credentials.json');
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.encrypted) {
      try {
        const dec = decryptObj(parsed, process.env.GROQ_SECRET || null);
        // mark that this was encrypted on disk
        dec.__wasEncrypted = true;
        return dec;
      } catch (e) {
        // return the blob but mark encrypted
        parsed.__wasEncrypted = true;
        return parsed; // encrypted blob
      }
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

router.post('/store-credentials', requireAuthLocal, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email_password_required' });
    fs.mkdirSync(DB_DIR, { recursive: true });
    const secret = process.env.GROQ_SECRET || null;
    const payload = secret ? encryptObj({ email, password }, secret) : { email, password };
    fs.writeFileSync(path.join(DB_DIR, 'matched_betting_credentials.json'), JSON.stringify(payload, null, 2), 'utf8');
    return res.json({ success: true, encrypted: !!secret });
  } catch (e) {
    console.error('[/api/matched-betting/store-credentials] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/credentials', requireAuthLocal, (req, res) => {
  try {
    const stored = getStoredCredentials();
    if (!stored) return res.status(404).json({ error: 'no_credentials' });
    // stored may be decrypted object but we attach __wasEncrypted if it was encrypted on disk
    const wasEncrypted = !!stored.__wasEncrypted || !!stored.encrypted;
    const visible = { email: stored.email || (wasEncrypted ? '*** encrypted ***' : undefined) };
    return res.json({ success: true, ...visible, encrypted: wasEncrypted });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/check-emails', requireAuthLocal, async (req, res) => {
  try {
    let { email, password, days } = req.body || {};
    if (!email || !password) {
      // try env vars
      email = process.env.MATCHED_EMAIL || process.env.MATCHED_BETTING_EMAIL || email;
      password = process.env.MATCHED_EMAIL_PASSWORD || process.env.MATCHED_BETTING_PASSWORD || password;
    }

    if (!email || !password) {
      // try stored credentials file
      const stored = getStoredCredentials();
      if (stored) {
        if (stored.encrypted && !(stored.email && stored.password)) {
          // cannot decrypt: require GROQ_SECRET
          return res.status(400).json({ error: 'credentials_encrypted', message: 'Server GROQ_SECRET is required to decrypt stored credentials' });
        }
        email = email || stored.email;
        password = password || stored.password;
      }
    }

    if (!email || !password) return res.status(400).json({ error: 'email_or_password_missing', message: 'Provide email/password in request or set MATCHED_EMAIL and MATCHED_EMAIL_PASSWORD env vars or store credentials via /api/matched-betting/store-credentials' });

    const n = Number(days) || 7;
    const offers = await fetchRecentEmails({ email, password, days: n });
    return res.json({ success: true, offers, checkedDays: n });
  } catch (e) {
    console.error('[/api/matched-betting/check-emails] Error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'internal_error', message: e && e.message ? e.message : String(e) });
  }
});

export default router;