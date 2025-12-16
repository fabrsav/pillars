import { describe, it, expect } from 'vitest';
import { parseCurrencyAmount, parseOdds, estimateGainFromFreeBet } from '../matched_betting_mail.js';

describe('matched_betting_mail parsers', () => {
  it('parses currency amounts', () => {
    expect(parseCurrencyAmount('You get a €10 free bet')).toBe(10);
    expect(parseCurrencyAmount('Bonus: £5')).toBe(5);
    expect(parseCurrencyAmount('USD 20.50 cash')).toBe(20.5);
    expect(parseCurrencyAmount('No number here')).toBeNull();
  });

  it('parses odds', () => {
    expect(parseOdds('Min odds 2.0')).toBeCloseTo(2.0);
    expect(parseOdds('Odds 3/1 apply')).toBeCloseTo(4.0);
    expect(parseOdds('Some text 1.5 and more')).toBeCloseTo(1.5);
  });

  it('estimates gains', () => {
    expect(estimateGainFromFreeBet(10, 2.0)).toBe(10);
    expect(estimateGainFromFreeBet(5, 3.0)).toBe(10);
    expect(estimateGainFromFreeBet(10, null)).toBe(5);
  });
});