import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DailyItems from '../DailyItems';

describe('DailyItems', () => {
  beforeEach(() => {
    localStorage.clear();
    // Prevent network fetches during tests
    if (typeof jest !== 'undefined') global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    else if (typeof vi !== 'undefined') global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  });

  afterEach(() => {
    // restore mocks (vitest or jest)
    if (typeof vi !== 'undefined' && vi.restoreAllMocks) vi.restoreAllMocks();
    else if (typeof jest !== 'undefined' && jest.restoreAllMocks) jest.restoreAllMocks();
  });

  it('hides add button when not in edit mode', () => {
    render(<DailyItems isEditMode={false} />);
    expect(screen.queryByText(/Aggiungi/)).toBeNull();
  });

  it('allows adding and deleting an item in edit mode', () => {
    render(<DailyItems isEditMode={true} />);
    const addBtn = screen.getByText(/Aggiungi/);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Nome');
    const connectorInput = screen.getByPlaceholderText('Connettore');
    fireEvent.change(nameInput, { target: { value: 'Test Item' } });
    fireEvent.change(connectorInput, { target: { value: 'USB-C' } });

    const addButtons = screen.getAllByRole('button', { name: /Aggiungi/ });
    const submitBtn = addButtons.find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submitBtn);

    // New item should appear
    expect(screen.getByText(/Test Item/)).toBeTruthy();

    // Stub confirm to allow deletion (prefer vitest 'vi' if available)
    if (typeof vi !== 'undefined' && vi.spyOn) {
      vi.spyOn(window, 'confirm').mockImplementation(() => true);
    } else if (typeof jest !== 'undefined' && jest.spyOn) {
      jest.spyOn(window, 'confirm').mockImplementation(() => true);
    } else {
      // fallback
      window.confirm = () => true;
    }

    const card = screen.getByText('Test Item').closest('[draggable]');
    const delBtn = within(card).getByTitle('Elimina');
    fireEvent.click(delBtn);

    expect(screen.queryByText(/Test Item/)).toBeNull();
  });

  it('ignores empty server response and shows banner without overwriting local data', async () => {
    // Put some local items into localStorage
    const local = [{ id: 'razor-1', name: 'Rasoio elettrico' }];
    localStorage.setItem('daily_items', JSON.stringify(local));

    // Mock fetch to return an empty array
    if (typeof vi !== 'undefined') {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    } else {
      global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    }

    render(<DailyItems isEditMode={false} />);

    // Banner should appear indicating server copy was ignored
    await screen.findByText(/Copia server vuota/i);

    // Local item should still be visible
    expect(screen.getByText(/Rasoio elettrico/)).toBeInTheDocument();
  });
});
