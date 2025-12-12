import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();
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

// Helper: commit a file to GitHub repo (creates or updates)
async function commitFileToGithub(repoPath, content, message) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
  const GITHUB_REPO = process.env.GITHUB_REPO || null;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN || !GITHUB_REPO) throw new Error('GITHUB_TOKEN or GITHUB_REPO not configured');

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(repoPath)}`;
  const headers = { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'pillars-github-store' };

  // Try to get existing file SHA (if it exists) so we can update
  let sha = null;
  try {
    const getResp = await fetch(`${url}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
    if (getResp.ok) {
      const parsed = await getResp.json();
      if (parsed && parsed.sha) sha = parsed.sha;
    }
  } catch (e) {
    // ignore - file might not exist or network error
  }

  const body = { message: message || `Automated save: ${repoPath}`, content: Buffer.from(content, 'utf8').toString('base64'), branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  const putResp = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!putResp.ok) {
    const txt = await putResp.text().catch(() => '<no body>');
    throw new Error(`GitHub commit failed: ${putResp.status} ${txt}`);
  }
  return await putResp.json();
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
        // If environment password provided, decrypt
        if (process.env.GROQ_KEY_PASSWORD) {
          try {
            GROQ_KEY = decryptWithPassword(parsed, process.env.GROQ_KEY_PASSWORD);
            console.log('[server] Groq key loaded into memory (decrypted with GROQ_KEY_PASSWORD)');
          } catch (e) {
            console.warn('[server] Failed to decrypt pillars_groq_key.json with GROQ_KEY_PASSWORD');
          }
        } else {
          console.log('[server] Found password-encrypted Groq key on disk. Provide password via GROQ_KEY_PASSWORD or /api/groq-key/decrypt');
        }
      } else if (parsed && parsed.encrypted) {
        // scrypt/GROQ_SECRET format
        if (GROQ_SECRET) {
          GROQ_KEY = decryptPayload(parsed, GROQ_SECRET);
          console.log('[server] Groq key loaded into memory (decrypted with GROQ_SECRET)');
        } else {
          console.warn('[server] pillars_groq_key.json is encrypted with GROQ_SECRET but GROQ_SECRET is not set');
        }
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
    const { password, apiKey: providedKey, updateSource } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password required' });

    // Decide which plaintext key to encrypt: provided in request or fallback to PLAINTEXT_GROQ_KEY
    let plaintext = (providedKey && providedKey.trim()) ? providedKey.trim() : null;
    if (!plaintext && typeof PLAINTEXT_GROQ_KEY === 'string' && PLAINTEXT_GROQ_KEY.length > 0) {
      plaintext = PLAINTEXT_GROQ_KEY;
    }

    if (!plaintext) return res.status(400).json({ error: 'No API key provided and no hardcoded key available' });

    const encrypted = encryptWithPassword(plaintext, password);
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(groqFile, JSON.stringify(encrypted, null, 2), 'utf8');

    // generate and persist recovery token hash
    const recoveryToken = crypto.randomBytes(32).toString('base64');
    saveRecoveryTokenHash(recoveryToken);

    // Keep key decrypted in memory for this session
    decryptedGroqApiKey = plaintext;

    // Only update groq-key-manager.js if explicitly requested by the client
    let updatedSource = false;
    let updateError = null;
    if (updateSource) {
      try {
        const mgrPath = path.join(__dirname, 'groq-key-manager.js');
        let mgr = fs.readFileSync(mgrPath, 'utf8');
        const encryptedText = JSON.stringify(encrypted, null, 2);
        if (/const ENCRYPTED_KEY = \{[\s\S]*?\};/m.test(mgr)) {
          mgr = mgr.replace(/const ENCRYPTED_KEY = \{[\s\S]*?\};/m, `const ENCRYPTED_KEY = ${encryptedText};`);
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
    const { password, apiKey } = req.body || {};
    if (!password || !apiKey) return res.status(400).json({ error: 'password and apiKey required' });
    const encrypted = encryptWithPassword(apiKey, password);
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(groqFile, JSON.stringify(encrypted, null, 2), 'utf8');
    // persist recovery token
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
    res.json({ key: decryptedGroqApiKey, status: 'decrypted' });
  } else {
    res.status(401).json({ error: 'Key not decrypted yet', status: 'locked' });
  }
});

// Decrypt key with password
app.post('/api/groq-key/decrypt', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  try {
    try {
      decryptedGroqApiKey = getGroqApiKey(password);
      return res.json({ success: true, key: decryptedGroqApiKey });
    } catch (err) {
      // If there's no encrypted key in the key-manager, fall back to reading a legacy plaintext file
      // This makes first-run unlock easier for users who still have an unencrypted `pillars_groq_key.json`.
      const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
      try {
        if (fs.existsSync(groqFile)) {
          const raw = fs.readFileSync(groqFile, 'utf8');
          // if file contains a simple string (legacy/plaintext), accept it and keep it in memory
          try {
            const parsed = JSON.parse(raw);
            // if parsed is a string, treat as legacy plaintext
            if (typeof parsed === 'string' && parsed.trim().length) {
              decryptedGroqApiKey = parsed.trim();
              return res.json({ success: true, key: decryptedGroqApiKey, note: 'used_plaintext_file' });
            }
          } catch (e) {
            // not JSON — treat raw as plaintext
            if (raw && raw.trim().length) {
              decryptedGroqApiKey = raw.trim();
              return res.json({ success: true, key: decryptedGroqApiKey, note: 'used_plaintext_file' });
            }
          }
        }
      } catch (e) {
        // ignore and fall through to error
      }
      throw err;
    }
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Change passphrase: requires currentPassword and newPassword
app.post('/api/groq-key/change', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });

  try {
    const groqFile = path.join(DB_DIR, 'pillars_groq_key.json');
    if (!fs.existsSync(groqFile)) return res.status(404).json({ error: 'No stored encrypted key found' });
    const raw = fs.readFileSync(groqFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!(parsed && parsed.data && parsed.tag && parsed.salt && parsed.iv)) return res.status(400).json({ error: 'Stored key is not password-encrypted format' });

    // Try decrypting with currentPassword
    let decrypted;
    try {
      decrypted = decryptWithPassword(parsed, currentPassword);
    } catch (e) {
      return res.status(401).json({ error: 'Current password invalid' });
    }

    // Re-encrypt with new password
    const newEncrypted = encryptWithPassword(decrypted, newPassword);
    fs.writeFileSync(groqFile, JSON.stringify(newEncrypted, null, 2), 'utf8');

    // Keep new key decrypted in memory for this session
    decryptedGroqApiKey = decrypted;
    return res.json({ success: true });
  } catch (e) {
    console.error('[change-passphrase] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ==================== LOCAL STORAGE ====================

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
    // If saving the Groq key and a GROQ_SECRET is configured, encrypt at rest
    if (key === 'pillars_groq_key' && GROQ_SECRET) {
      const payload = (typeof req.body === 'string') ? req.body : JSON.stringify(req.body);
      const encrypted = encryptPayload(payload, GROQ_SECRET);
      fs.writeFileSync(filePath, JSON.stringify(encrypted, null, 2));

      // Also update in-memory key if possible
      try { decryptedGroqApiKey = decryptPayload(encrypted, GROQ_SECRET); } catch (_) {}
    } else {
      fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    }

    // If configured, also persist to GitHub for more robust storage (async)
    try {
      const GITHUB_STORE_PREFIX = process.env.GITHUB_STORE_PREFIX || 'db';
      if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
        (async () => {
          try {
            const repoPath = `${GITHUB_STORE_PREFIX}/${key}.json`;
            const content = JSON.stringify(req.body, null, 2);
            const commitMessage = `Automated save: ${key} @ ${new Date().toISOString()}`;
            const res = await commitFileToGithub(repoPath, content, commitMessage);
            console.log('[store] Committed to GitHub:', repoPath, res?.content?.html_url || '');
          } catch (e) {
            console.warn('[store] Failed to commit to GitHub:', e.message || e);
          }
        })();
      }
    } catch (e) {
      // non-fatal, keep primary disk save behavior
      console.warn('[store] GitHub persistence check failed', e.message || e);
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).send('Error writing data');
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
async function startServer() {
  // Check if password is in environment variable
  const envPassword = process.env.GROQ_KEY_PASSWORD;
  
  if (envPassword) {
    try {
      decryptedGroqApiKey = getGroqApiKey(envPassword);
      console.log('✅ Groq API key decrypted from environment variable');
    } catch (error) {
      console.error('❌ Failed to decrypt key with environment password:', error.message);
    }
  }
  
  // Do NOT automatically use a hardcoded PLAINTEXT_GROQ_KEY on startup. Instead the UI
  // should prompt the user on first run to set a passphrase and persist an encrypted key.
  if (!decryptedGroqApiKey && typeof PLAINTEXT_GROQ_KEY === 'string' && PLAINTEXT_GROQ_KEY.length > 0) {
    console.log('⚠️ A hardcoded PLAINTEXT_GROQ_KEY exists in source. The server will NOT auto-use it.');
    console.log('Use the UI to set a passphrase and encrypt the key on first run (/api/groq-key/setup).');
  }
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Pillars server: http://localhost:${PORT}`);
    if (!decryptedGroqApiKey) {
      console.log('⚠️  Groq API key not decrypted. Set GROQ_KEY_PASSWORD environment variable or decrypt via UI.');
    }
  });
}

startServer();
