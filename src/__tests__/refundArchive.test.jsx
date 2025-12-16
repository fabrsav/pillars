import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Pillars from '../Pillars';
import { vi, describe, it, beforeEach, expect } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

describe('Refund archive flow', () => {
  it('archives a refunded item and allows unarchive via UI', async () => {
    const refund = { id: 'r1', platform: 'Test', item: 'ArchTest', amount: '12', status: 'Rimborsato', arrivalDate: '2025-12-01', history: [] };

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (url.endsWith('/pillars_refunds_v3')) {
        return { ok: true, json: async () => [refund] };
      }
      if (url.endsWith('/pillars_refunds_archive_v1')) {
        if (!opts || !opts.method) return { ok: true, json: async () => [] };
        if (opts.method === 'POST') return { ok: true };
      }
      return { ok: false };
    }));

    render(<Pillars />);

    // Open refunds panel
    const refundsBtn = await screen.findByText(/Gestione rimborsi/i);
    const parentBtn = refundsBtn.closest('button') || refundsBtn;
    parentBtn && parentBtn.click();

    // Wait for refund to appear
    await waitFor(() => expect(screen.getByText('ArchTest')).toBeInTheDocument());

    // Click archive
    const archBtn = screen.getByText('Archivia');
    fireEvent.click(archBtn);

    // Modal should open
    await waitFor(() => expect(screen.getByText(/Archivia rimborso/i)).toBeInTheDocument());

    const dateInput = screen.getByLabelText(/Data rimborso/i);
    fireEvent.change(dateInput, { target: { value: '2025-12-10' } });

    const confirmBtn = screen.getByText(/Conferma archivia/i);
    fireEvent.click(confirmBtn);

    // The item should be removed from main list
    await waitFor(() => expect(screen.queryByText('ArchTest')).toBeNull());

    // Show archived and verify it appears
    const showArchBtn = screen.getByText(/Mostra archiviati/i);
    fireEvent.click(showArchBtn);

    await waitFor(() => expect(screen.getByText(/Archivio rimborsi/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('ArchTest')).toBeInTheDocument());

    // Click Ripristina
    const ripristinaBtn = screen.getByText('Ripristina');
    fireEvent.click(ripristinaBtn);

    // After unarchive, item should be back in main list
    await waitFor(() => expect(screen.getByText('ArchTest')).toBeInTheDocument());
  });
});
