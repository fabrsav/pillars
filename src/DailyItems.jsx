import React, { useState, useEffect } from 'react';
import itemsData from '../data/items.json';

const FieldToggle = ({value, onChange, trueLabel='Sì', falseLabel='No'}) => (
  <button onClick={() => onChange(!value)} className={`px-2 py-1 rounded-full text-xs ${value ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-800/40 text-slate-400'}`}>
    {value ? trueLabel : falseLabel}
  </button>
);

const DailyItems = () => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('daily_items');
      return raw ? JSON.parse(raw) : itemsData;
    } catch (e) {
      return itemsData;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('daily_items', JSON.stringify(items)); } catch (e) { console.warn('Impossibile salvare daily_items', e); }
  }, [items]);

  const updateItem = (id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const resetDefaults = () => {
    if (!window.confirm('Ripristinare i valori di default?')) return;
    setItems(itemsData);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'daily_items_export.json'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-200">Oggettini quotidiani</h4>
        <div className="flex gap-2">
          <button onClick={exportJson} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Esporta</button>
          <button onClick={resetDefaults} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Reset</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-slate-950/10 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{item.name}</div>
                <div className="text-xs text-slate-400">Connettore: {item.connector || 'N/A'}</div>
              </div>
              <div className="flex items-center gap-2">
                <FieldToggle value={!!item.magneticMount} onChange={(v) => updateItem(item.id, { magneticMount: v })} trueLabel={'Magnetico'} falseLabel={'No'} />
                <FieldToggle value={!!item.base} onChange={(v) => updateItem(item.id, { base: v })} trueLabel={'Basetta'} falseLabel={'No basetta'} />
                <FieldToggle value={!!item.cable} onChange={(v) => updateItem(item.id, { cable: v })} trueLabel={'Cavo'} falseLabel={'No cavo'} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 w-14">Note</label>
              <input value={item.notes || ''} onChange={(e) => updateItem(item.id, { notes: e.target.value })} className="flex-1 bg-transparent border border-slate-800/40 rounded px-2 py-1 text-xs text-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyItems;
