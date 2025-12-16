import { describe, it, expect } from 'vitest';
import { getActiveRefundsTotal, CLOSED_REFUND_STATUSES } from '../Pillars';

describe('getActiveRefundsTotal', () => {
  it('sums only active refunds and ignores closed statuses', () => {
    const refunds = [
      { id: 1, status: 'Da Fare', amount: '10.00' },
      { id: 2, status: 'Richiesto', amount: '5' },
      { id: 3, status: 'Rimborsato', amount: '100' },
      { id: 4, status: 'Assistenza', amount: '20' }
    ];

    const total = getActiveRefundsTotal(refunds);
    expect(total).toBeCloseTo(15.00, 2);
  });

  it('handles missing or invalid amounts gracefully', () => {
    const refunds = [
      { id: 1, status: 'Da Fare', amount: 'abc' },
      { id: 2, status: 'Spedito', amount: undefined },
      { id: 3, status: 'Rimborsato', amount: '50' }
    ];

    const total = getActiveRefundsTotal(refunds);
    expect(total).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(getActiveRefundsTotal([])).toBe(0);
  });
});
