import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function readStore() {
  try {
    const file = path.join(DB_DIR, 'christmas_gifts.json');
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('[/api/christmas-gifts] readStore error', e);
    return [];
  }
}

function writeStore(data) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(path.join(DB_DIR, 'christmas_gifts.json'), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[/api/christmas-gifts] writeStore error', e);
    return false;
  }
}

// List all gifts
router.get('/', (req, res) => {
  try {
    const items = readStore();
    // optional sorting by dueDate
    items.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    return res.json({ success: true, items });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Get a single gift
router.get('/:id', (req, res) => {
  try {
    const items = readStore();
    const found = items.find(it => String(it.id) === String(req.params.id));
    if (!found) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true, item: found });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Create
router.post('/', requireAuthLocal, (req, res) => {
  try {
    const payload = req.body || {};
    const items = readStore();
    const id = crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();
    const newItem = Object.assign({
      id,
      person: '',
      ideas: [],
      budget: null,
      currency: 'EUR',
      dueDate: null,
      status: 'idea',
      priority: 'medium',
      notes: '',
      link: '',
      purchasedPrice: null,
      purchasedDate: null,
      wrapped: false,
      tags: [],
      reminderDate: null,
      createdAt: now,
      updatedAt: now
    }, payload);
    items.push(newItem);
    writeStore(items);
    return res.json({ success: true, item: newItem });
  } catch (e) {
    console.error('[/api/christmas-gifts POST] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Update
router.put('/:id', requireAuthLocal, (req, res) => {
  try {
    const updates = req.body || {};
    const items = readStore();
    const idx = items.findIndex(it => String(it.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    const updated = Object.assign({}, items[idx], updates, { updatedAt: new Date().toISOString() });
    items[idx] = updated;
    writeStore(items);
    return res.json({ success: true, item: updated });
  } catch (e) {
    console.error('[/api/christmas-gifts PUT] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Delete
router.delete('/:id', requireAuthLocal, (req, res) => {
  try {
    const items = readStore();
    const idx = items.findIndex(it => String(it.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    const removed = items.splice(idx, 1);
    writeStore(items);
    return res.json({ success: true, item: removed[0] });
  } catch (e) {
    console.error('[/api/christmas-gifts DELETE] Error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
