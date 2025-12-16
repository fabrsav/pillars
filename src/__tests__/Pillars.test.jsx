import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pillars from '../Pillars';

describe('Pillars edit mode auto-disable', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure 'analysis' UI is available so project tabs render
    localStorage.setItem('ilaria_os_data', JSON.stringify({}));
    // Prevent network fetches during tests
    if (typeof jest !== 'undefined') global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    else if (typeof vi !== 'undefined') global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  });

  afterEach(() => {
    if (typeof vi !== 'undefined' && vi.restoreAllMocks) vi.restoreAllMocks();
    else if (typeof jest !== 'undefined' && jest.restoreAllMocks) jest.restoreAllMocks();
  });

  it('turns off edit mode when navigating to another section', async () => {
    render(<Pillars />);

    // Initial edit button should allow activation
    const editBtn = await screen.findByTitle('Attiva modalità modifica');
    expect(editBtn).toBeTruthy();

    // Enable edit mode
    fireEvent.click(editBtn);
    // Now the button should indicate it's pressed
    const activeBtn = await screen.findByTitle('Disattiva modalità modifica');
    expect(activeBtn).toHaveAttribute('aria-pressed', 'true');

    // Navigate to another tab (MENTE) to simulate leaving the current section
    const menteTab = await screen.findByText('MENTE');
    fireEvent.click(menteTab.closest('button'));

    // Edit mode should be turned off automatically
    const offBtn = await screen.findByTitle('Attiva modalità modifica');
    expect(offBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
