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
      // Also ensure the refunds routine remains present
      expect(screen.getByText(/Gestione rimborsi/i)).toBeInTheDocument();
  });

    it('ignores server type mismatch for array keys and keeps local refunds', async () => {
      // Mock fetch to return a numeric-keyed object resembling the on-disk DB
      vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
        if (url.endsWith('/pillars_refunds_v3')) {
          return { ok: true, json: async () => ({ "0": { id: 'r1', platform: 'Test', item: 'TestRefund', amount: 10 } }) };
        }
        return { ok: false };
      }));

      render(<Pillars />);

      // Open the refunds widget by clicking the routine and assert the imported item is shown
      const refundsBtn = await screen.findByText(/Gestione rimborsi/i);
      expect(refundsBtn).toBeTruthy();
      const parentBtn = refundsBtn.closest('button') || refundsBtn;
      parentBtn && parentBtn.click();

      await waitFor(() => expect(screen.getByText('TestRefund')).toBeInTheDocument());
    });
});
