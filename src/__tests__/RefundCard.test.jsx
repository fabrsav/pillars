import { render, screen } from '@testing-library/react';
import RefundCard from '../RefundCard';

describe('RefundCard', () => {
  it('renders basic refund info', () => {
    const r = { id: 1, platform: 'Amazon', item: 'Cuffie', status: 'Da Fare', amount: '12.50', arrivalDate: '2025-12-01' };
    render(<RefundCard r={r} />);
    expect(screen.getByText(/Amazon/)).toBeTruthy();
    expect(screen.getByText(/Cuffie/)).toBeTruthy();
    expect(screen.getByText(/Da Fare/)).toBeTruthy();
    expect(screen.getByText(/€12.50/)).toBeTruthy();
  });
});
