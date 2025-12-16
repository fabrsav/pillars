import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import express from 'express';
import fs from 'fs';
import path from 'path';

const DB = path.join(process.cwd(), 'db', 'matched_betting_oauth.json');

let server, port;

beforeAll(async () => {
  try { if (fs.existsSync(DB)) fs.unlinkSync(DB); } catch(_){}
  const oauthRouter = (await import('../../server/routes/matched_betting_oauth.js')).default;
  const app = express();
  app.use('/api/matched-betting', oauthRouter);
  server = app.listen(0);
  port = server.address().port;
});

afterAll(async () => {
  if (server && server.close) await new Promise(r => server.close(r));
});

describe('oauth endpoints (smoke)', () => {
  it('status returns disconnected when no record', async () => {
    const res = await fetch(`http://localhost:${port}/api/matched-betting/status`);
    const j = await res.json();
    expect(j.connected).toBe(false);
  });
});