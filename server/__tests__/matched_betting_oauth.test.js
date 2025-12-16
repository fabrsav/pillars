import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const DB = path.join(process.cwd(), 'db', 'matched_betting_oauth.json');

describe('oauth endpoints (smoke)', () => {
  it('status returns disconnected when no record', async () => {
    try { if (fs.existsSync(DB)) fs.unlinkSync(DB); } catch(_){}
    const res = await fetch('http://localhost:3001/api/matched-betting/status');
    const j = await res.json();
    expect(j.connected).toBe(false);
  });
});