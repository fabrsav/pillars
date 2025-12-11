/**
 * Simplified server for Render.com deployment
 * Serves the static Vite build and provides API proxy endpoints
 * Uses JSONBin.io for cloud storage (bidirectional sync with local PC)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Environment variables for API keys (set in Render dashboard)
const GROQ_KEY = process.env.GROQ_KEY || null;
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || null;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || null;
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';

// In-memory cache
let cloudCache = {};
let cloudCacheTime = 0;
const CACHE_TTL = 3000; // 3 seconds

// Cloud storage functions
async function cloudGetAll() {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return {};
  
  const now = Date.now();
  if (cloudCache && cloudCacheTime && (now - cloudCacheTime < CACHE_TTL)) {
    return cloudCache;
  }
  
  try {
    const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    if (!response.ok) return {};
    const data = await response.json();
    cloudCache = data.record || {};
    cloudCacheTime = now;
    return cloudCache;
  } catch (e) {
    console.error('[CloudStorage] Error:', e.message);
    return {};
  }
}

async function cloudSet(key, value) {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
    console.warn('[CloudStorage] Not configured');
    return false;
  }
  
  try {
    // Get current data
    let currentData = await cloudGetAll();
    
    // Merge
    currentData[key] = value;
    currentData._lastModified = new Date().toISOString();
    currentData._lastModifiedKey = key;
    currentData._lastModifiedFrom = 'render';
    
    // Save
    const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(currentData)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    // Update cache
    cloudCache = currentData;
    cloudCacheTime = Date.now();
    
    console.log(`[CloudStorage] Saved ${key}`);
    return true;
  } catch (e) {
    console.error('[CloudStorage] Save error:', e.message);
    return false;
  }
}

// Serve static files from dist folder (Vite build output)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Groq API proxy endpoint
app.post('/api/groq', async (req, res) => {
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'GROQ_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLOUD STORAGE API ====================
// These endpoints sync with JSONBin.io for bidirectional sync with local PC

app.get('/api/store/:key', async (req, res) => {
  const key = req.params.key;
  
  try {
    const allData = await cloudGetAll();
    if (allData[key] !== undefined) {
      return res.json(allData[key]);
    }
    return res.status(404).send('Not found');
  } catch (error) {
    console.error(`[Store] Error getting ${key}:`, error);
    return res.status(500).send('Error reading data');
  }
});

app.post('/api/store/:key', async (req, res) => {
  const key = req.params.key;
  
  try {
    const success = await cloudSet(key, req.body);
    if (success) {
      return res.json({ success: true });
    }
    return res.status(500).json({ error: 'Failed to save to cloud' });
  } catch (error) {
    console.error(`[Store] Error saving ${key}:`, error);
    return res.status(500).send('Error writing data');
  }
});

// Log error endpoint
app.post('/api/log-error', (req, res) => {
  console.error('[Client Error]', req.body);
  res.json({ logged: true });
});

// Basic auth middleware for deployments
const requireAuthForRender = (req, res, next) => {
  const token = process.env.PILLARS_TOKEN || process.env.RENDER_RESET_TOKEN || null;
  if (!token) return next(); // if no token configured, consider public
  const header = (req.headers.authorization || '');
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

// Trigger a redeploy on Render (hard reset - clear cache + redeploy)
app.post('/api/render/hard-reset', requireAuthForRender, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY || null;
    const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || null;
    if (!RENDER_API_KEY || !RENDER_SERVICE_ID) return res.status(400).json({ success: false, error: 'missing_config' });

    const url = `https://api.render.com/deploy/${RENDER_SERVICE_ID}`;
    const body = { commit: req.body?.commit || 'manual-hard-reset', clear_cache: true };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) return res.status(502).json({ success: false, status: response.status, body: text });
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    return res.json({ success: true, resp: data });
  } catch (e) {
    console.error('[Render Hard Reset] Exception', e);
    return res.status(500).json({ success: false, error: 'internal_error', message: e.message });
  }
});

// Replace text endpoint (compatibility)
app.post('/api/replace-text', async (req, res) => {
  // This would need to be handled by the client
  res.json({ success: true, message: 'Text replacement handled by client' });
});

// Simple in-memory storage fallback (when cloud not configured)
let pillarsData = {};

// Load initial data if exists
const dataFile = path.join(__dirname, 'data.json');
try {
  if (fs.existsSync(dataFile)) {
    pillarsData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
} catch (e) {
  console.log('No initial data file found');
}

// Save data endpoint
app.post('/api/save', (req, res) => {
  try {
    pillarsData = { ...pillarsData, ...req.body };
    fs.writeFileSync(dataFile, JSON.stringify(pillarsData, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load data endpoint
app.get('/api/load', (req, res) => {
  res.json(pillarsData);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pillars server running on port ${PORT}`);
  console.log(`GROQ_KEY configured: ${GROQ_KEY ? 'Yes' : 'No'}`);
  console.log(`Cloud Storage: ${JSONBIN_API_KEY && JSONBIN_BIN_ID ? 'Enabled (JSONBin.io)' : 'Disabled'}`);
  if (!JSONBIN_API_KEY) console.log('  Set JSONBIN_API_KEY to enable cloud sync');
  if (!JSONBIN_BIN_ID) console.log('  Set JSONBIN_BIN_ID to enable cloud sync');
});
