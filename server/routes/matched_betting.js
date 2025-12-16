import express from 'express';
import { fetchRecentEmails } from '../../scripts/matched_betting_mail.js';

const router = express.Router();

const requireAuthLocal = (req, res, next) => {
  const AUTH_TOKEN = process.env.PILLARS_TOKEN || process.env.VITE_PILLARS_TOKEN || null;
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  return next();
};

router.post('/check-emails', requireAuthLocal, async (req, res) => {
  try {
    const { email, password, days } = req.body || {};
    const account = email || process.env.MATCHED_EMAIL || process.env.MATCHED_BETTING_EMAIL;
    const pass = password || process.env.MATCHED_EMAIL_PASSWORD || process.env.MATCHED_BETTING_PASSWORD;

    if (!account || !pass) return res.status(400).json({ error: 'email_or_password_missing', message: 'Provide email/password in request or set MATCHED_EMAIL and MATCHED_EMAIL_PASSWORD env vars' });

    const n = Number(days) || 7;
    const offers = await fetchRecentEmails({ email: account, password: pass, days: n });
    return res.json({ success: true, offers, checkedDays: n });
  } catch (e) {
    console.error('[/api/matched-betting/check-emails] Error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'internal_error', message: e && e.message ? e.message : String(e) });
  }
});

export default router;