import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExamCountdown from '../ExamCountdown';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ exams: [] }) }));
});

test('renders ExamCountdown', async () => {
  render(<ExamCountdown />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.getByText(/Nessun esame configurato/i)).toBeInTheDocument();
});
