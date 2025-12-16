import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Pillars from '../Pillars';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

describe('Pillars storage merging', () => {
  it('keeps default routines when server returns empty arrays', async () => {
    // Mock fetch to return pillars_db_v10 having an empty "wealth" array
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (url.endsWith('/pillars_db_v10')) {
        return { ok: true, json: async () => ({ wealth: [] }) };
      }
      return { ok: false };
    }));

    render(<Pillars />);

    // Wait for UI to render and ensure the "Oggettini" title (from default) appears
    await waitFor(() => expect(screen.getByText(/Oggettini/i)).toBeInTheDocument());
  });
});
