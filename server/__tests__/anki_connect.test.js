import { expect, test, vi } from 'vitest';
import fetch from 'node-fetch';
import { app } from '../../server.js';
import request from 'supertest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

test('anki-connect check returns ok when node returns version', async () => {
  fetch.default.mockResolvedValue({ json: () => Promise.resolve(6) });
  const res = await request(app).post('/api/anki-connect/check');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});
