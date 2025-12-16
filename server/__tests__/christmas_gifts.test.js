import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import express from 'express';
import fs from 'fs';
import path from 'path';

let server;
let port;
const DB_DIR = path.join(process.cwd(), 'db');
const FILE = path.join(DB_DIR, 'christmas_gifts.json');
let backup = null;

beforeAll(async () => {
  // backup existing file
  try { backup = fs.readFileSync(FILE, 'utf8'); } catch (e) { backup = null; }
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify([], null, 2), 'utf8');

  const router = (await import('../../server/routes/christmas_gifts.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/christmas-gifts', router);
  server = app.listen(0);
  port = server.address().port;
});

afterAll(async () => {
  // restore
  if (backup !== null) {
    fs.writeFileSync(FILE, backup, 'utf8');
  } else {
    try { fs.unlinkSync(FILE); } catch (e) {}
  }
  if (server && server.close) await new Promise(r => server.close(r));
});

describe('christmas-gifts router', () => {
  it('creates, reads, updates and deletes an item', async () => {
    // initially empty
    let res = await fetch(`http://localhost:${port}/api/christmas-gifts`);
    let j = await res.json();
    expect(j.items).toBeTruthy();
    expect(j.items.length).toBe(0);

    // create
    res = await fetch(`http://localhost:${port}/api/christmas-gifts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person: 'Test', ideas: ['Toy'], dueDate: '2025-12-20' }) });
    expect(res.ok).toBe(true);
    j = await res.json();
    expect(j.item).toBeTruthy();
    const id = j.item.id;

    // read list
    res = await fetch(`http://localhost:${port}/api/christmas-gifts`);
    j = await res.json();
    expect(j.items.find(it => it.id === id)).toBeTruthy();

    // update
    res = await fetch(`http://localhost:${port}/api/christmas-gifts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'bought' }) });
    expect(res.ok).toBe(true);
    j = await res.json();
    expect(j.item.status).toBe('bought');

    // delete
    res = await fetch(`http://localhost:${port}/api/christmas-gifts/${id}`, { method: 'DELETE' });
    expect(res.ok).toBe(true);
    j = await res.json();
    expect(j.item.id).toBe(id);

    // final list empty
    res = await fetch(`http://localhost:${port}/api/christmas-gifts`);
    j = await res.json();
    expect(j.items.length).toBe(0);
  });
});
