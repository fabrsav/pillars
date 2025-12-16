import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChristmasGifts from '../ChristmasGifts';

const sample = [
  { id: 'a1', person: 'Anna', ideas: ['Sciarpa'], dueDate: '2025-12-20', status: 'idea' },
  { id: 'b2', person: 'Luca', ideas: ['Libro'], dueDate: '2025-12-25', status: 'bought', wrapped: true }
];

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: sample }) }));
});

afterEach(() => {
  global.fetch = undefined;
});

it('renders calendar and list', async () => {
  render(<ChristmasGifts />);
  expect(await screen.findByText(/Calendario/)).toBeInTheDocument();
  // switch to list
  fireEvent.click(screen.getByText('Lista'));
  await waitFor(() => expect(screen.getByText('Anna')).toBeInTheDocument());
  expect(screen.getByText('Luca')).toBeInTheDocument();
});
