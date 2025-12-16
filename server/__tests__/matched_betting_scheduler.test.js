import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

vi.mock('../../scripts/matched_betting_mail.js', () => ({
  fetchRecentEmails: async () => [ { subject: 'Mock offer', from: 'x', date: '2025-12-16', freeBet: 5, odds:2, estimatedGain:5 } ]
}));

let server, port;

beforeAll(async () => {
  // ensure token stored
  const DB = path.join(process.cwd(), 'db');
  try { fs.mkdirSync(DB, { recursive: true }); const rec = { email: 'fabmatchedbetting@gmail.com', token: { refresh_token: 'dummy' } }; fs.writeFileSync(path.join(DB, 'matched_betting_oauth.json'), JSON.stringify(rec, null,2), 'utf8'); } catch(_){}

  const app = (await import('../../server.js'));
  // server already started by importing server.js; use existing port
  // Wait a bit to let scheduler run
  await new Promise(r=>setTimeout(r, 1200));
});

describe('scheduler smoke', () => {
  it('writes last offers file', async () => {
    const p = path.join(process.cwd(), 'db', 'matched_betting_last_offers.json');
    // wait a little for scheduled check to run
    await new Promise(r => setTimeout(r, 1500));
    expect(fs.existsSync(p)).toBe(true);
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.offers.length).toBeGreaterThan(0);
  });
});
