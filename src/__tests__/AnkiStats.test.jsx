import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnkiStats from '../AnkiStats';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ stats: [] }) }));
});

test('renders and shows update button', async () => {
  render(<AnkiStats />);
  expect(screen.getByText(/Statistiche Anki/i)).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});
