import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Simple smoke: DB file should be readable/writable
describe('credentials store simple', () => {
  it('can write and read token file', () => {
    const DB = path.join(process.cwd(), 'db');
    try { fs.mkdirSync(DB, { recursive: true }); } catch(_){}
    const p = path.join(DB, 'matched_betting_oauth.json');
    const rec = { email: 'x@example.com', token: { refresh_token: 'r' } };
    fs.writeFileSync(p, JSON.stringify(rec, null,2), 'utf8');
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.email).toBe('x@example.com');
    try { fs.unlinkSync(p); } catch(_){}
  });
});