import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import express from 'express';

let server;
let port;
const DB_DIR = path.join(process.cwd(), 'db');

beforeAll(async () => {
  process.env.PILLARS_TOKEN = 'test-token';
  process.env.GROQ_SECRET = 'test-secret';
  const matchedRouter = (await import('../../server/routes/matched_betting.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/matched-betting', matchedRouter);
  server = app.listen(0);
  port = server.address().port;
});

afterAll(async () => {
  if (server && server.close) await new Promise(r => server.close(r));
  try { fs.unlinkSync(path.join(DB_DIR, 'matched_betting_credentials.json')); } catch(_) {}
});

describe('credentials endpoints', () => {
  it('stores and reports encrypted credentials', async () => {
    const res = await fetch(`http://localhost:${port}/api/matched-betting/store-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({ email: 'fabmatchedbetting@gmail.com', password: 'app-pass' })
    });
    const j = await res.json();
    expect(j.success).toBe(true);
    expect(j.encrypted).toBe(true);

    const credRes = await fetch(`http://localhost:${port}/api/matched-betting/credentials`, { headers: { 'Authorization': 'Bearer test-token' } });
    const cj = await credRes.json();
    expect(cj.success).toBe(true);
    expect(cj.email).toBe('fabmatchedbetting@gmail.com');
    expect(cj.encrypted).toBe(true);
  });
});