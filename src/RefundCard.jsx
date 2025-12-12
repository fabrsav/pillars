import React from 'react';

const RefundCard = ({ r }) => {
  return (
    <div className="p-3 rounded-lg border border-slate-800/30 bg-slate-900/20">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-bold">{r.platform || '-'} — {r.item || '-'}</div>
          <div className="text-xs text-slate-400">{r.status} {r.arrivalDate ? `• ${r.arrivalDate}` : ''}</div>
        </div>
        <div className="text-sm font-bold">{r.amount ? `€${r.amount}` : ''}</div>
      </div>
    </div>
  );
};

export default RefundCard;
