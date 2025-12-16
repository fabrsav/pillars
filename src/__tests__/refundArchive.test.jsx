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

    // Click archive only on the specific refund card
    const refundNode = screen.getByText('ArchTest');
    // Find the outer refund card by traversing up to the container with p-4 rounded-xl classes
    let card = refundNode.parentElement;
    while (card && card !== document.body && !(card.className && card.className.includes('p-4') && card.className.includes('rounded-xl'))) {
      card = card.parentElement;
    }
    expect(card).toBeTruthy();
    const { within } = require('@testing-library/react');
    const archBtns = within(card).getAllByText('Archivia');
    // choose the first Archivia button in the card
    fireEvent.click(archBtns[0]);

    // Modal should open
    await waitFor(() => expect(screen.getByText(/Archivia rimborso/i)).toBeInTheDocument());

    // input has no associated label; select by current display value
    const dateInput = screen.getByDisplayValue('2025-12-01');
    fireEvent.change(dateInput, { target: { value: '2025-12-10' } });

    const confirmBtn = screen.getByText(/Conferma archivia/i);
    fireEvent.click(confirmBtn);

    // The item should be removed from main list
    await waitFor(() => expect(screen.queryByText('ArchTest')).toBeNull());

    // The archived counter should update on the button
    const showArchBtns = screen.getAllByText(/Mostra archiviati/i);
    const showArchBtn = showArchBtns.find(b => b.textContent && b.textContent.includes('(1)')) || showArchBtns[0];
    expect(showArchBtn.textContent).toMatch(/\(1\)/);

    // Open archived view (try each button match until UI appears)
    const allShowBtns = showArchBtns; // from earlier
    let opened = false;
    for (const b of allShowBtns) {
      fireEvent.click(b);
      try {
        await waitFor(() => expect(screen.queryByText('Ripristina') || screen.queryByText(/Archivio rimborsi/i)).toBeTruthy(), { timeout: 400 });
        opened = true;
        break;
      } catch (e) {
        // try next button
      }
    }
    expect(opened).toBeTruthy();

    // Ensure the archived item is listed next to the Ripristina button
    const ripristinaBtn = screen.getByText('Ripristina');
    const archRow = ripristinaBtn.closest('div');
    expect(archRow.textContent).toContain('ArchTest');

    // Click Ripristina
    fireEvent.click(ripristinaBtn);

    // After unarchive, item should be back in main list
    await waitFor(() => expect(screen.getByText('ArchTest')).toBeInTheDocument());
  });
});
