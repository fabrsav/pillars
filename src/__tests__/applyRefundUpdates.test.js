import { applyRefundUpdates } from '../Pillars';

describe('applyRefundUpdates', () => {
  it('updates amount when provided (numeric string)', () => {
    const original = { id: 1, amount: 8.83, status: 'Da Fare', notes: '' };
    const updates = { amount: '10.87', status: 'Richiesto' };
    const historyEntry = { id: 123, text: 'aggiorno importo' };

    const updated = applyRefundUpdates(original, updates, historyEntry);
    expect(updated.amount).toBeCloseTo(10.87);
    expect(updated.status).toBe('Richiesto');
    expect(updated.history[0]).toEqual(historyEntry);
  });

  it('keeps amount if update amount is invalid', () => {
    const original = { id: 1, amount: 5.00 };
    const updates = { amount: 'non-num' };
    const updated = applyRefundUpdates(original, updates, null);
    expect(updated.amount).toBe(5.00);
  });
});
