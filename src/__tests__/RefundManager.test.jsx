import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { Receipt } from 'lucide-react';
import { RefundManager } from '../Pillars.jsx';

describe('RefundManager basic render', () => {
<<<<<<< HEAD
  it.skip('renders without crashing with empty refunds', () => {
=======
  it('renders without crashing with empty refunds', () => {
>>>>>>> d59ba9d (Fix: prevent crash in RefundManager by safely mapping refunds; export component for tests; add test scaffold and vitest)
    const mockSetRefunds = () => {};
    const props = { theme: { border: '', text: '', accent: 'emerald' }, apiKey: null, onApiKeyError: () => {}, refunds: [], setRefunds: mockSetRefunds, refundsLoaded: true };
    expect(typeof RefundManager).toBe('function');
    render(React.createElement(RefundManager, props));
    expect(screen.getByText(/Gestione rimborsi/)).toBeInTheDocument();
  });
});
