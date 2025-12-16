import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { encryptPayload, decryptPayload } from '../_helpers/encryption.js';

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

function saveTokenRecord(rec) {
  try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch(_) {}
  fs.writeFileSync(path.join(DB_DIR, 'matched_betting_oauth.json'), JSON.stringify(rec, null, 2), 'utf8');
}

function loadTokenRecord() {
  try {
    const p = path.join(DB_DIR, 'matched_betting_oauth.json');
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return null; }
}

// Start OAuth flow: redirect to Google's consent screen
router.get('/oauth/start', requireAuthLocal, (req, res) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirect = `${req.protocol}://${req.get('host')}/api/matched-betting/oauth/callback`;
  if (!clientId) return res.status(500).send('GOOGLE_OAUTH_CLIENT_ID not configured');
  const state = crypto.randomBytes(12).toString('hex');
  // persist state to disk temporarily
  saveTokenRecord({ state, created: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email openid',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Callback: exchange code for tokens, store encrypted
router.get('/oauth/callback', requireAuthLocal, async (req, res) => {
  try {
    const { code, state } = req.query;
    const rec = loadTokenRecord() || {};
    if (!code || !state || !rec.state || state !== rec.state) {
      return res.status(400).send('<html><body>Invalid state. <script>if(window.opener) window.opener.postMessage({success:false,reason:"invalid_state"}, "*");</script></body></html>');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        redirect_uri: `${req.protocol}://${req.get('host')}/api/matched-betting/oauth/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokenJson = await tokenRes.json();
    if (tokenJson.error) {
      console.error('Token exchange failed', tokenJson);
      return res.status(500).send(`<html><body>Token exchange failed. <script>if(window.opener) window.opener.postMessage({success:false,reason:'token_exchange'}, "*");</script></body></html>`);
    }

    // get email for account
    const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenJson.access_token}` } });
    const meJson = await me.json();

    // Encrypt payload if possible
    const secret = process.env.GROQ_SECRET || null;
    const payloadToStore = secret ? encryptPayload(JSON.stringify(tokenJson), secret) : tokenJson;

    const final = { email: meJson.email, token: payloadToStore, storedAt: Date.now() };
    saveTokenRecord(final);

    // Set a simple app cookie indicating connected (HttpOnly)
    res.cookie('pillars_mb_connected', meJson.email, { httpOnly: true, sameSite: 'lax' });

    return res.send('<html><body>Connected successfully. You can close this window. <script>if(window.opener) window.opener.postMessage({success:true}, "*"); window.close();</script></body></html>');
  } catch (e) {
    console.error('[/oauth/callback] Error', e);
    return res.status(500).send(`<html><body>Error. <script>if(window.opener) window.opener.postMessage({success:false,reason:'internal'}, "*");</script></body></html>`);
  }
});

// Get status
router.get('/status', requireAuthLocal, (req, res) => {
  const rec = loadTokenRecord();
  if (!rec || !rec.email) return res.json({ connected: false });
  return res.json({ connected: true, email: rec.email });
});

// Get last stored offers
router.get('/last-offers', requireAuthLocal, (req, res) => {
  try {
    const p = path.join(DB_DIR, 'matched_betting_last_offers.json');
    if (!fs.existsSync(p)) return res.json({ offers: [], timestamp: null });
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return res.json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'internal' });
  }
});

// Disconnect: remove stored token
router.post('/disconnect', requireAuthLocal, (req, res) => {
  const p = path.join(DB_DIR, 'matched_betting_oauth.json');
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch(e) {}
  res.clearCookie('pillars_mb_connected');
  res.json({ success: true });
});

export default router;