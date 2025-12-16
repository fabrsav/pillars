import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fetchRecentEmails } from './scripts/matched_betting_mail.js';
import { parseDir as parseAnkiDir } from './scripts/parse_anki_pdf.js';

// Load environment variables from .env if present
dotenv.config();
import { google } from 'googleapis';
import { getGroqApiKey, PLAINTEXT_GROQ_KEY, updateEncryptedKey } from './groq-key-manager.js';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_DIR = path.join(__dirname, 'db');

// Optional server auth token: if set, endpoints that proxy or store secrets require this token
const AUTH_TOKEN = process.env.PILLARS_TOKEN || process.env.VITE_PILLARS_TOKEN || null;

// Secret used to encrypt/decrypt the Groq API key at-rest
const GROQ_SECRET = process.env.GROQ_SECRET || null;

// In-memory Groq key (decrypted) kept only in RAM when available
let GROQ_KEY = process.env.GROQ_KEY || null;

// Middleware: require auth when AUTH_TOKEN is configured
const requireAuth = (req, res, next) => {
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const encryptPayload = (plaintext, secret) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: true,
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  };
};

const decryptPayload = (obj, secret) => {
  if (!obj || !obj.encrypted) return obj;
  if (!secret) throw new Error('GROQ_SECRET not configured');
  const salt = Buffer.from(obj.salt, 'base64');
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const encrypted = Buffer.from(obj.data, 'base64');
  const key = crypto.scryptSync(secret, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

// If GROQ_SECRET is present and there's a stored key file, try to load/decrypt it into memory
// Helper: password-based PBKDF2 derive (matches groq-key-manager/scripts)
function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

function decryptWithPassword(obj, password) {
  const salt = Buffer.from(obj.salt, 'base64');
  const iv = Buffer.from(obj.iv, 'base64');
  const data = Buffer.from(obj.data, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const key = deriveKeyFromPassword(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

function encryptWithPassword(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const key = deriveKeyFromPassword(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64')
  };
}

function saveRecoveryTokenHash(token) {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch(_) {}
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  fs.writeFileSync(path.join(DB_DIR, 'groq_recovery_token.json'), JSON.stringify({ hash }, null, 2), 'utf8');
}

async function promptHidden(questionText) {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
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
          process.stdout.write(questionText + Array(rl.line.length + 1).join('*'));
          break;
      }
    });
    rl.question(questionText, answer => { process.stdout.write('\n'); rl.close(); resolve(answer); });
  });
}

try {
  const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
  if (!GROQ_KEY && fs.existsSync(groqFile)) {
    const raw = fs.readFileSync(groqFile, 'utf8');
    try {
      const parsed = JSON.parse(raw);

      // Detect password-encrypted object (has data + tag)
          if (parsed && parsed.data && parsed.tag && parsed.salt && parsed.iv) {
            // Password-encrypted format detected. We no longer require encryption
            // for normal usage; if an opertor wants to decrypt they can use
            // /api/groq-key/decrypt, but absence of a password should not cause
            // hard failures on startup.
            console.log('[server] Found password-encrypted Groq key on disk; encryption is optional now.');
          } else if (parsed && parsed.encrypted) {
            // scrypt/GROQ_SECRET format - preserve for compatibility but do not
            // fail startup when secret is missing.
            console.log('[server] Found GROQ_SECRET-encrypted key on disk; encryption is optional now.');
          } else if (typeof parsed === 'string') {
            GROQ_KEY = parsed;
          }
    } catch (e) {
      // If parsing fails, assume plaintext string
      if (raw && raw.trim().length) GROQ_KEY = raw.trim();
    }
  }
} catch (e) {
  console.warn('[server] Failed to load groq key at startup:', e.message || e);
}

// NOTE: Previous behavior prompted for passphrase or key on the server console at first run.
// To provide a better UX, we now handle initial passphrase/key setup from the client UI.
// The server will no longer prompt interactively on startup. Use the `/api/groq-key/setup`
// endpoint from the UI to persist an encrypted key (or to encrypt the hardcoded key).

// New endpoint: setup encrypted Groq key (called from UI on first-run)
app.post('/api/groq-key/setup', async (req, res) => {
  try {
    const { apiKey: providedKey, updateSource } = req.body || {};

    // Decide which plaintext key to persist: provided in request or fallback to PLAINTEXT_GROQ_KEY
    let plaintext = (providedKey && providedKey.trim()) ? providedKey.trim() : null;
    if (!plaintext && typeof PLAINTEXT_GROQ_KEY === 'string' && PLAINTEXT_GROQ_KEY.length > 0) {
      plaintext = PLAINTEXT_GROQ_KEY;
    }

    if (!plaintext) return res.status(400).json({ error: 'No API key provided and no hardcoded key available' });

    // Persist plaintext key (encryption is intentionally disabled per user request)
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(groqFile, JSON.stringify(plaintext, null, 2), 'utf8');

    // generate and persist recovery token hash for compatibility
    const recoveryToken = crypto.randomBytes(32).toString('base64');
    saveRecoveryTokenHash(recoveryToken);

    // Keep key available in memory for this session
    decryptedGroqApiKey = plaintext;

    // Optionally update groq-key-manager.js to clear any previous encrypted payload
    let updatedSource = false;
    let updateError = null;
    if (updateSource) {
      try {
        const mgrPath = path.join(__dirname, 'groq-key-manager.js');
        let mgr = fs.readFileSync(mgrPath, 'utf8');
        // Clear ENCRYPTED_KEY and set PLAINTEXT_GROQ_KEY to empty (avoid hardcoding sensitive values)
        if (/const ENCRYPTED_KEY = \{[\s\S]*?\};/m.test(mgr)) {
          mgr = mgr.replace(/const ENCRYPTED_KEY = \{[\s\S]*?\};/m, `const ENCRYPTED_KEY = {};`);
        }
        if (/export const PLAINTEXT_GROQ_KEY = [\s\S]*?;/.test(mgr)) {
          mgr = mgr.replace(/export const PLAINTEXT_GROQ_KEY = [\s\S]*?;/, "export const PLAINTEXT_GROQ_KEY = '';" );
        }
        fs.writeFileSync(mgrPath, mgr, 'utf8');
        updatedSource = true;
      } catch (e) {
        console.warn('[server] Failed to update groq-key-manager.js during setup:', e.message || e);
        updateError = e.message || String(e);
      }
    }

    return res.json({ success: true, recoveryToken, key: decryptedGroqApiKey, updatedSource, updateError });
  } catch (e) {
    console.error('[/api/groq-key/setup] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// TEMP DEBUG: Force-create encrypted pillars_groq_key.json using provided password+apiKey
// This endpoint is intended for debugging during setup when the UI flow is problematic.
app.post('/api/groq-key/force-setup', (req, res) => {
  try {
    const { apiKey } = req.body || {};
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(groqFile, JSON.stringify(apiKey, null, 2), 'utf8');
    // persist recovery token for compatibility
    const recoveryToken = crypto.randomBytes(32).toString('base64');
    saveRecoveryTokenHash(recoveryToken);
    // also set in-memory
    decryptedGroqApiKey = apiKey;
    return res.json({ success: true, recoveryToken });
  } catch (e) {
    console.error('[/api/groq-key/force-setup] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});
// Global encrypted API key - will be decrypted once at startup
let decryptedGroqApiKey = null;

try {
  fs.mkdirSync(DB_DIR, { recursive: true });
} catch (e) {
  // Log directory creation problems early so they are visible
  try { fs.writeFileSync(path.join(__dirname, 'error_log.txt'), `[${new Date().toISOString()}] Failed to create DB/BACKUP dirs: ${e.stack || e.message}\n`); } catch(_) {}
}

app.use(cors());
// Allow primitive JSON values (e.g., strings) to be posted to /api/store
app.use(bodyParser.json({ limit: '50mb', strict: false }));
app.use(bodyParser.text({ type: 'text/plain' })); // Per supportare sendBeacon

// Serve static files: prefer production `dist` (Vite build). Fallback to `public` in dev.
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  // SPA fallback: return index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ==================== GROQ API KEY ====================

// Get encrypted Groq API key (auto-decrypts if password is set)
app.get('/api/groq-key', (req, res) => {
  if (decryptedGroqApiKey) {
    return res.json({ key: decryptedGroqApiKey, status: 'decrypted' });
  }

  // Check environment override
  if (GROQ_KEY) return res.json({ key: GROQ_KEY, status: 'env' });

  // Fallback: try to read stored file and return plaintext if present
  try {
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    if (fs.existsSync(groqFile)) {
      const raw = fs.readFileSync(groqFile, 'utf8');
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string' && parsed.trim().length) return res.json({ key: parsed.trim(), status: 'plaintext' });
      } catch (e) {
        if (raw && raw.trim().length) return res.json({ key: raw.trim(), status: 'plaintext' });
      }
    }
  } catch (e) {
    // ignore and fall through
  }

  return res.status(404).json({ error: 'No Groq key available' });
});

// Decrypt key with password
app.post('/api/groq-key/decrypt', (req, res) => {
  const { password } = req.body || {};

  try {
    // getGroqApiKey will return plaintext from env or hardcoded if available
    decryptedGroqApiKey = getGroqApiKey(password);
    if (decryptedGroqApiKey) return res.json({ success: true, key: decryptedGroqApiKey });

    // Fallback to reading a legacy plaintext file
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    if (fs.existsSync(groqFile)) {
      const raw = fs.readFileSync(groqFile, 'utf8');
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string' && parsed.trim().length) {
          decryptedGroqApiKey = parsed.trim();
          return res.json({ success: true, key: decryptedGroqApiKey, note: 'used_plaintext_file' });
        }
      } catch (e) {
        if (raw && raw.trim().length) {
          decryptedGroqApiKey = raw.trim();
          return res.json({ success: true, key: decryptedGroqApiKey, note: 'used_plaintext_file' });
        }
      }
    }

    return res.status(404).json({ error: 'No Groq key available' });
  } catch (error) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// Load plaintext key from legacy file (no password required)
app.post('/api/groq-key/load-plaintext', requireAuth, (req, res) => {
  try {
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    if (!fs.existsSync(groqFile)) return res.status(404).json({ error: 'No plaintext key found' });
    const raw = fs.readFileSync(groqFile, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string' && parsed.trim()) return res.json({ success: true, key: parsed.trim(), note: 'plaintext' });
    } catch (e) {
      // Not JSON — treat raw as plaintext
      if (raw && raw.trim()) return res.json({ success: true, key: raw.trim(), note: 'plaintext' });
    }
    return res.status(404).json({ error: 'No plaintext key found' });
  } catch (e) {
    console.error('[/api/groq-key/load-plaintext] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Change passphrase: requires currentPassword and newPassword
app.post('/api/groq-key/change', requireAuth, (req, res) => {
  // Encryption has been retired; treat this endpoint as a key-replace endpoint.
  const { apiKey } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

  try {
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(groqFile, JSON.stringify(apiKey, null, 2), 'utf8');

    // Keep new key available in memory for this session
    decryptedGroqApiKey = apiKey;
    return res.json({ success: true });
  } catch (e) {
    console.error('[change-passphrase] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ==================== LOCAL STORAGE ====================

// Matched betting routes
import matchedRouter from './server/routes/matched_betting.js';
import matchedOauthRouter from './server/routes/matched_betting_oauth.js';
app.use('/api/matched-betting', matchedRouter);
app.use('/api/matched-betting', matchedOauthRouter);


// ==================== ANKI STATS ====================
app.get('/api/anki-stats', (req, res) => {
  try {
    const f = path.join(DB_DIR, 'anki_stats.json');
    if (!fs.existsSync(f)) return res.json({ stats: [] });
    const raw = fs.readFileSync(f, 'utf8');
    return res.json({ stats: JSON.parse(raw) });
  } catch (e) {
    console.error('[/api/anki-stats] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Trigger parse of PDFs from configured folder (server-side)
app.post('/api/anki-stats/parse', requireAuth, async (req, res) => {
  try {
    const { dir } = req.body || {};
    const parsed = await parseAnkiDir(dir);
    return res.json({ success: true, parsed });
  } catch (e) {
    console.error('[/api/anki-stats/parse] Error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'internal_error', message: e && e.message ? e.message : String(e) });
  }
});

// ==================== EXAM TOPICS CRUD ====================
app.get('/api/exams', (req, res) => {
  try {
    const f = path.join(DB_DIR, 'exam_topics.json');
    if (!fs.existsSync(f)) return res.json({ exams: [] });
    const raw = fs.readFileSync(f, 'utf8');
    const parsed = JSON.parse(raw);
    return res.json(parsed);
  } catch (e) {
    console.error('[/api/exams] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/exams', requireAuth, (req, res) => {
  try {
    const body = req.body || {};
    const f = path.join(DB_DIR, 'exam_topics.json');
    fs.writeFileSync(f, JSON.stringify(body, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (e) {
    console.error('[/api/exams POST] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/store/:key', (req, res) => {
  const key = req.params.key;
  const filePath = path.join(DB_DIR, `${key}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  try {
    const raw = fs.readFileSync(filePath, 'utf8');

    // Special-case: pillars_groq_key — return decrypted key only if loaded in memory
    if (key === 'pillars_groq_key') {
      if (decryptedGroqApiKey) {
        return res.json(decryptedGroqApiKey);
      }

      // If GROQ_KEY env provided, expose it (developer mode)
      if (GROQ_KEY) return res.json(GROQ_KEY);

      // If file is an encrypted payload but not decrypted, return 404 to indicate missing/locked
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.encrypted) return res.status(404).send('Not found');
      } catch (_) {}

      // Otherwise return the raw content (legacy/plaintext)
      try {
        const maybe = JSON.parse(raw);
        return res.json(maybe);
      } catch (_) {
        return res.json(raw);
      }
    }

    // Default: return parsed JSON
    return res.json(JSON.parse(raw));
  } catch (err) {
    return res.status(500).send('Error reading data');
  }
});

app.post('/api/store/:key', requireAuth, (req, res) => {
  const key = req.params.key;
  const filePath = path.join(DB_DIR, `${key}.json`);
  try {
    // If saving the Groq key, persist plaintext (encryption disabled by request)
    if (key === 'pillars_groq_key') {
      // Accept either a primitive string or an object and persist a string when appropriate
      if (typeof req.body === 'string') {
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
        decryptedGroqApiKey = req.body;
      } else {
        // If client sent an object, write it JSON; try to extract a string key if present
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
        if (typeof req.body === 'object') {
          // common case: { key: '...' } or plain string inside
          if (typeof req.body.key === 'string' && req.body.key.trim().length) decryptedGroqApiKey = req.body.key.trim();
        }
      }
    } else {
      fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).send('Error writing data');
  }
});

/**
 * Export entire DB as merged JSON (GET returns JSON; POST can request Drive upload)
 */
app.get('/api/export-db', (req, res) => {
  try {
    const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
    const out = {};
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(DB_DIR, f), 'utf8');
        out[path.basename(f, '.json')] = JSON.parse(raw);
      } catch (e) {
        try {
          out[path.basename(f, '.json')] = fs.readFileSync(path.join(DB_DIR, f), 'utf8');
        } catch (e2) {
          out[path.basename(f, '.json')] = null;
        }
      }
    }

    const exportPath = path.join(DB_DIR, 'exported_database.json');
    fs.writeFileSync(exportPath, JSON.stringify(out, null, 2), 'utf8');

    return res.json(out);
  } catch (e) {
    console.error('[/api/export-db] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Save a Google Drive OAuth token / client config for later automated uploads
app.post('/api/google-drive/save-token', requireAuth, (req, res) => {
  try {
    const body = req.body || {};
    const f = path.join(DB_DIR, 'google_drive_token.json');
    fs.writeFileSync(f, JSON.stringify(body, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (e) {
    console.error('[/api/google-drive/save-token] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/google-drive/status', requireAuth, (req, res) => {
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const tokenFile = path.join(DB_DIR, 'google_drive_token.json');
  const hasTokenFile = fs.existsSync(tokenFile);
  return res.json({ hasServiceAccount, hasTokenFile });
});

async function uploadToDriveByServiceAccount(filePath, filename) {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('service_account_key_missing');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
  });
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  // Search for existing file with same name
  const list = await drive.files.list({ q: `name='${filename.replace("'","\\'")}' and trashed=false`, fields: 'files(id,name)' });
  const media = { mimeType: 'application/json', body: fs.createReadStream(filePath) };
  if (list.data.files && list.data.files.length > 0) {
    const id = list.data.files[0].id;
    await drive.files.update({ fileId: id, media, fields: 'id,name' });
    return { updated: true, id };
  } else {
    const created = await drive.files.create({ requestBody: { name: filename }, media, fields: 'id,name' });
    return { created: true, id: created.data.id };
  }
}

async function uploadToDriveByOAuthToken(filePath, filename) {
  const tokenFile = path.join(DB_DIR, 'google_drive_token.json');
  if (!fs.existsSync(tokenFile)) throw new Error('oauth_token_missing');
  const cfg = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const { clientId, clientSecret, redirectUri, token } = cfg;
  if (!clientId || !clientSecret || !token) throw new Error('oauth_config_incomplete');
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri || 'urn:ietf:wg:oauth:2.0:oob');
  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  const list = await drive.files.list({ q: `name='${filename.replace("'","\\'")}' and trashed=false`, fields: 'files(id,name)' });
  const media = { mimeType: 'application/json', body: fs.createReadStream(filePath) };
  if (list.data.files && list.data.files.length > 0) {
    const id = list.data.files[0].id;
    await drive.files.update({ fileId: id, media, fields: 'id,name' });
    return { updated: true, id };
  } else {
    const created = await drive.files.create({ requestBody: { name: filename }, media, fields: 'id,name' });
    return { created: true, id: created.data.id };
  }
}

app.post('/api/export-db', requireAuth, async (req, res) => {
  try {
    // ensure file exists and is fresh
    const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
    const out = {};
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(DB_DIR, f), 'utf8');
        out[path.basename(f, '.json')] = JSON.parse(raw);
      } catch (e) {
        out[path.basename(f, '.json')] = null;
      }
    }
    const filename = (req.body && req.body.filename) || 'pillars_database_export.json';
    const exportPath = path.join(DB_DIR, filename);
    fs.writeFileSync(exportPath, JSON.stringify(out, null, 2), 'utf8');

    if (req.body && req.body.drive) {
      // Try service account first
      try {
        const r = await uploadToDriveByServiceAccount(exportPath, filename);
        return res.json({ success: true, drive: r });
      } catch (e) {
        // fallback to OAuth token
        try {
          const r = await uploadToDriveByOAuthToken(exportPath, filename);
          return res.json({ success: true, drive: r });
        } catch (e2) {
          console.error('[/api/export-db DRIVE] Error:', e.message, e2.message);
          return res.status(500).json({ error: 'drive_upload_failed', details: [e.message, e2.message] });
        }
      }
    }

    return res.json({ success: true, path: exportPath });
  } catch (e) {
    console.error('[/api/export-db POST] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ==================== GROQ PROXY ENDPOINT ====================
// Proxy client requests to Groq API without exposing key to client
app.post('/api/groq', requireAuth, async (req, res) => {
  try {
    const { prompt, model = 'openai/gpt-oss-120b', temperature = 0.6, max_completion_tokens = 2048, top_p = 0.95 } = req.body || {};

    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const apiKey = decryptedGroqApiKey || GROQ_KEY || process.env.GROQ_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Groq API key not available' });

    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_completion_tokens,
      top_p
    };

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[Groq proxy] API error', resp.status, txt);
      return res.status(502).json({ error: 'Upstream Groq error', status: resp.status, body: txt });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error('[Groq proxy] Exception', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Return a curated list of models (some may require access)
app.get('/api/groq-models', (req, res) => {
  try {
    // Only expose `groq/compound` as the single supported model.
    return res.json({ models: [ 'groq/compound' ] });
  } catch (e) {
    console.error('[/api/groq-models] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Persist a chosen model to disk
app.post('/api/groq-model-choice', requireAuth, (req, res) => {
  try {
    // Ignore user-supplied model and persist the forced model
    const model = 'groq/compound';
    const filePath = path.join(DB_DIR, 'pillars_groq_model_choice.json');
    fs.writeFileSync(filePath, JSON.stringify({ model }, null, 2));
    return res.json({ success: true, model });
  } catch (e) {
    console.error('[/api/groq-model-choice] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Read the persisted model choice
app.get('/api/groq-model-choice', (req, res) => {
  try {
    const filePath = path.join(DB_DIR, 'pillars_groq_model_choice.json');
    if (!fs.existsSync(filePath)) return res.json({ model: 'groq/compound' });
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return res.json({ model: parsed.model || 'groq/compound' });
  } catch (e) {
    console.error('[/api/groq-model-choice GET] Error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// ==================== UTILITY ====================

// Reintroduce endpoint to open VS Code from the UI
app.post('/api/open-vscode', (req, res) => {
  try {
    const workspaceDir = __dirname;
    const codeExe = 'C:\\Users\\PC-FabrizioSavona25\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe';

    // Use PowerShell Start-Process so the UI app is launched without blocking the Node callback
    exec(`powershell -Command "Start-Process -FilePath '${codeExe}' -ArgumentList '${workspaceDir}'"`, { windowsHide: true }, (error) => {
      if (error) {
        // Fallback to using 'code' on PATH via Start-Process
        exec(`powershell -Command "Start-Process -FilePath 'code' -ArgumentList '${workspaceDir}'"`, { windowsHide: true }, (err) => {
          if (err) {
            console.error('[open-vscode] Failed:', err.message);
            return res.status(500).json({ error: 'Failed to open VS Code' });
          }
          console.log('[open-vscode] VS Code opened via PATH');
          return res.json({ success: true });
        });
        return;
      }
      console.log('[open-vscode] VS Code opened via full path (Start-Process)');
      return res.json({ success: true });
    });
  } catch (e) {
    console.error('[open-vscode] Exception:', e);
    return res.status(500).json({ error: 'Exception opening VS Code' });
  }
});



app.post('/api/log-error', (req, res) => {
  const { error, context } = req.body;
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${context}: ${error}\n`;
  try {
    fs.writeFileSync(path.join(__dirname, 'error_log.txt'), logLine);
  } catch (e) {
    console.error('[log-error] Failed to write local error_log.txt', e);
  }

  // Asynchronous: commit sanitized error to GitHub if configured
  (async function commitToGithub() {
    try {
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
      const GITHUB_REPO = process.env.GITHUB_REPO || null; // format: owner/repo
      const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return;
      }

      // Sanitize error content to avoid leaking secrets
      const rawContent = JSON.stringify({ timestamp, context, error }, null, 2);
      const envSecrets = ['GROQ_KEY', 'GROQ_SECRET', 'PILLARS_TOKEN', 'VITE_PILLARS_TOKEN', 'GITHUB_TOKEN'];
      let sanitized = rawContent;
      envSecrets.forEach((k) => {
        if (process.env[k]) {
          sanitized = sanitized.split(process.env[k]).join('<REDACTED>');
        }
      });

      // Basic pattern redaction for keys like sk_..., gsk_... or long hex strings
      sanitized = sanitized.replace(/(Bearer\s+)?(?:sk_|gsk_)[A-Za-z0-9_\-]{8,}/g, '<REDACTED_KEY>');
      sanitized = sanitized.replace(/\b[0-9a-f]{32,}\b/gi, '<REDACTED_HEX>');

      const now = new Date();
      const filePath = `error-logs/error-${now.toISOString().replace(/[:.]/g, '-')}.json`;

      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`;
      const message = `Automated error log: ${context} @ ${timestamp}`;
      const body = {
        message,
        content: Buffer.from(sanitized, 'utf8').toString('base64'),
        branch: GITHUB_BRANCH
      };

      const resp = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'pillars-error-logger'
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '<no body>');
        console.warn('[log-error] GitHub commit failed', resp.status, txt);
      } else {
        console.log('[log-error] Committed error log to GitHub:', filePath);
      }
    } catch (e) {
      console.error('[log-error] Exception while committing to GitHub:', e);
    }
  })();

  res.json({ success: true });
});

// Trigger a redeploy on Render (hard reset - clear cache + redeploy)
app.post('/api/render/hard-reset', requireAuth, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY || null;
    const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || null;
    const RENDER_USE_CLI = process.env.RENDER_USE_CLI === 'true' || false;
    const RENDER_CLI_CMD = process.env.RENDER_CLI_CMD || null; // override CLI command if needed

    if (RENDER_USE_CLI && RENDER_CLI_CMD) {
      // Execute a configured CLI command (for environments that have Render CLI available)
      exec(RENDER_CLI_CMD, { windowsHide: true }, (err, stdout, stderr) => {
        if (err) {
          console.error('[Render Hard Reset] CLI error:', err, stderr);
          return res.status(500).json({ success: false, error: 'cli_error', message: stderr || err.message });
        }
        return res.json({ success: true, mode: 'cli', stdout: stdout });
      });
      return;
    }

    if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
      return res.status(400).json({ success: false, error: 'missing_config', message: 'RENDER_API_KEY or RENDER_SERVICE_ID not configured' });
    }

    // Use Render simple deploy endpoint used by existing GitHub action
    const url = `https://api.render.com/deploy/${RENDER_SERVICE_ID}`;
    const body = { commit: req.body?.commit || 'manual-hard-reset', clear_cache: true };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const resultText = await response.text();
    if (!response.ok) {
      console.error('[Render Hard Reset] API error', response.status, resultText);
      return res.status(502).json({ success: false, error: 'render_api_error', status: response.status, body: resultText });
    }

    let respData;
    try { respData = JSON.parse(resultText); } catch (e) { respData = { raw: resultText }; }
    return res.json({ success: true, mode: 'api', resp: respData });
  } catch (e) {
    console.error('[Render Hard Reset] Exception', e);
    return res.status(500).json({ success: false, error: 'internal_error', message: e.message });
  }
});

app.post('/api/replace-text', (req, res) => {
  const { original, replacement } = req.body || {};
  if (!original) return res.status(400).json({ error: 'original required' });

  const modified = [];
  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules') {
        walk(full);
      } else if (['.js', '.jsx', '.json'].includes(path.extname(ent.name))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes(original)) {
          fs.writeFileSync(full, content.split(original).join(replacement));
          modified.push(full);
        }
      }
    });
  };

  try {
    walk(__dirname);
    res.json({ success: true, modified });
  } catch (err) {
    res.status(500).json({ error: 'failed' });
  }
});



// ==================== SHUTDOWN ====================

// Termina tutti i processi quando si chiude la finestra
// DISABILITATO IN SVILUPPO - rimuovi il return per abilitare
app.post('/api/shutdown', (req, res) => {
  console.log('[Shutdown] Richiesta ricevuta ma IGNORATA (modalità sviluppo)');
  res.json({ success: true, message: 'Shutdown disabled in dev mode' });
  return; // <-- DISABILITATO: rimuovi questa riga per abilitare shutdown
  
  // Breve delay per permettere alla response di arrivare
  setTimeout(() => {
    console.log('[Shutdown] Terminazione processi...');
    
    // Termina i processi Edge che hanno "localhost:5173" negli argomenti
    exec('powershell -Command "Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like \'*localhost:5173*\' } | Stop-Process -Force"', 
      { windowsHide: true }, 
      (err) => {
        if (err) console.log('[Shutdown] Edge già chiuso o errore:', err.message);
        
        // Termina il processo Node (server + vite)
        console.log('[Shutdown] Terminazione server...');
        process.exit(0);
      }
    );
  }, 100);
});

// Catch-all for API routes to prevent HTML 404s
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// === STARTUP: Decrypt Groq API Key ===
export let httpServer = null;

async function startServer() {
  // Prefer explicit plaintext keys from env or persisted file over any decryption flow
  if (!decryptedGroqApiKey && process.env.GROQ_KEY && process.env.GROQ_KEY.length > 0) {
    decryptedGroqApiKey = process.env.GROQ_KEY;
    console.log('✅ Groq API key loaded from GROQ_KEY environment variable');
  }

  if (!decryptedGroqApiKey) {
    try {
      const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
      if (fs.existsSync(groqFile)) {
        const raw = fs.readFileSync(groqFile, 'utf8');
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string' && parsed.trim().length) {
            decryptedGroqApiKey = parsed.trim();
            console.log('✅ Groq API key loaded from plaintext file');
          }
        } catch (e) {
          if (raw && raw.trim().length) {
            decryptedGroqApiKey = raw.trim();
            console.log('✅ Groq API key loaded from plaintext file');
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // Start server
  httpServer = app.listen(PORT, async () => {
    console.log(`Pillars server: http://localhost:${PORT}`);
    if (!decryptedGroqApiKey) {
      console.log('ℹ️  No Groq API key configured. Provide via GROQ_KEY environment variable or /api/groq-key/setup');
    }
    // Log current model choice if present
    try {
      const modelFile = path.join(DB_DIR, 'pillars_groq_model_choice.json');
      if (fs.existsSync(modelFile)) {
        const raw = fs.readFileSync(modelFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.model) console.log(`✅ Groq model choice: ${parsed.model}`);
      }
    } catch (e) {
      console.warn('[startup] Failed to read model choice', e.message);
    }

    // Setup automatic matched-betting checks if configured
    try {
      const { runCheckUsingStoredToken } = await import('./server/_helpers/matched_scheduler.js');
      const secret = process.env.GROQ_SECRET || null;
      const intervalMins = Number(process.env.MATCHED_CHECK_INTERVAL_MIN || '1440'); // default daily

      const runCheck = async (source='scheduler') => {
        try {
          const res = await runCheckUsingStoredToken(secret, Number(process.env.MATCHED_CHECK_LOOKBACK_DAYS||'7'), source);
          if (res && res.skipped) return console.log('[Matched Scheduler] No OAuth token found; skipping');
          console.log(`[Matched Scheduler] Check complete: ${res.offers.length} offers`);
        } catch (e) { console.warn('[Matched Scheduler] Error', e && e.message ? e.message : e); }
      };

      // run first check after a short delay
      setTimeout(() => runCheck('startup'), 5000);

      // schedule repeated checks
      setInterval(() => runCheck('scheduler'), Math.max(1, intervalMins) * 60 * 1000);
      console.log(`[Matched Scheduler] Scheduled every ${intervalMins} minutes`);
    } catch (e) {
      console.warn('[startup] Matched scheduler setup failed', e && e.message ? e.message : e);
    }
  });
}

startServer();
