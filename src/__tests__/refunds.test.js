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

  it('ignores archived refunds', () => {
    const refunds = [
      { id: 1, status: 'Da Fare', amount: '10.00' },
      { id: 2, status: 'Da Fare', amount: '5.00' },
      { id: 3, status: 'Rimborsato', amount: '100', archived: true }
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

  it('handles Infinity and non-primitive amounts gracefully', () => {
    const refunds = [
      { id: 1, status: 'Da Fare', amount: 10 },
      { id: 2, status: 'Richiesto', amount: '8.83' },
      { id: 3, status: 'Da Fare', amount: Infinity },
      { id: 4, status: 'Rimborsato', amount: '100' },
      { id: 5, status: 'Da Fare', amount: { value: 10 } }
    ];

    const total = getActiveRefundsTotal(refunds);
    // Infinity and non-primitive amounts should be ignored
    expect(total).toBeCloseTo(18.83, 2);
  });
});
