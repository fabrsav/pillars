import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { vi } from 'vitest';

vi.mock('../../scripts/matched_betting_mail.js', () => ({
  fetchRecentEmails: async () => [ { subject: 'Mock offer', from: 'x', date: '2025-12-16', freeBet: 5, odds:2, estimatedGain:5 } ]
}));

import { runCheckWithToken } from '../../server/_helpers/matched_scheduler.js';

beforeAll(async ()=>{
  const DB = path.join(process.cwd(), 'db');
  try { fs.mkdirSync(DB, { recursive: true }); } catch(_){}
});

describe('scheduler runCheckWithToken', () => {
  it('writes last offers file when called', async () => {
    const p = path.join(process.cwd(), 'db', 'matched_betting_last_offers.json');
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch(_){}
    await runCheckWithToken('user@example.com', { refresh_token: 'dummy' }, 1);
    expect(fs.existsSync(p)).toBe(true);
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.offers)).toBe(true);
  });
});