import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fetch from 'node-fetch';
import express from 'express';

vi.mock('../../scripts/matched_betting_mail.js', () => ({
  fetchRecentEmails: async () => [
    { subject: 'Welcome offer €10 free bet', from: 'bookie@example.com', date: '2025-12-15', freeBet: 10, odds: 2, estimatedGain: 10 }
  ]
}));

let server;
let port;

beforeAll(async () => {
  process.env.PILLARS_TOKEN = 'test-token';
  process.env.MATCHED_EMAIL = 'fabmatchedbetting@gmail.com';
  process.env.MATCHED_EMAIL_PASSWORD = 'dummy';

  const matchedRouter = (await import('../../server/routes/matched_betting.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/matched-betting', matchedRouter);
  server = app.listen(0);
  port = server.address().port;
});

afterAll(async () => {
  if (server && server.close) {
    await new Promise(r => server.close(r));
  }
});

describe('matched-betting endpoint', () => {
  it('returns mocked offers', async () => {
    const res = await fetch(`http://localhost:${port}/api/matched-betting/check-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({})
    });
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(Array.isArray(j.offers)).toBe(true);
    expect(j.offers.length).toBeGreaterThan(0);
    expect(j.offers[0].freeBet).toBe(10);
  });
});