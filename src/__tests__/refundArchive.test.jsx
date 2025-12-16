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

    // Verify that the archive was saved to the server via POST
    const fetchMock = global.fetch;
    const calls = fetchMock.mock.calls || [];
    const postCall = calls.find(c => typeof c[0] === 'string' && c[0].endsWith('/pillars_refunds_archive_v1') && c[1] && c[1].method === 'POST');
    expect(postCall).toBeTruthy();
    const postedBody = JSON.parse(postCall[1].body);
    // posted body should be an array containing our archived record
    expect(Array.isArray(postedBody)).toBeTruthy();
    expect(postedBody.some(p => p.id === 'r1' && p.refundDate === '2025-12-10')).toBeTruthy();

    // The archived item should no longer be visible in the main list
    await waitFor(() => expect(screen.queryByText('ArchTest')).toBeNull());
  });

  it('unarchives an item that starts in the archive', async () => {
    const archived = { id: 'r1', platform: 'Test', item: 'ArchTest', amount: '12', status: 'Rimborsato', archived: true, refundDate: '2025-12-10', archivedAt: new Date().toISOString() };

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (url.endsWith('/pillars_refunds_v3')) {
        // refunds list contains the item but archived=true
        return { ok: true, json: async () => [archived] };
      }
      if (url.endsWith('/pillars_refunds_archive_v1')) {
        return { ok: true, json: async () => [archived] };
      }
      return { ok: false };
    }));

    render(<Pillars />);

    // Open refunds panel
    const refundsBtn = await screen.findByText(/Gestione rimborsi/i);
    const parentBtn = refundsBtn.closest('button') || refundsBtn;
    parentBtn && parentBtn.click();

    // Archived item should not be visible in main list
    await waitFor(() => expect(screen.queryByText('ArchTest')).toBeNull());

    // The archived counter should be visible and equal to 1
    const showArchBtns = screen.getAllByText(/Mostra archiviati/i);
    const showArchBtn = showArchBtns.find(b => b.textContent && b.textContent.includes('(1)')) || showArchBtns[0];
    expect(showArchBtn.textContent).toMatch(/\(1\)/);

    // Click once to toggle archive view and ensure the toggle updates to 'Nascondi archiviati'
    fireEvent.click(showArchBtn);
    await waitFor(() => expect(showArchBtn.textContent.toLowerCase().startsWith('nascondi')).toBeTruthy());

    // Click again to hide and ensure it toggles back
    fireEvent.click(showArchBtn);
    await waitFor(() => expect(showArchBtn.textContent.toLowerCase().startsWith('mostra')).toBeTruthy());
  });
});
