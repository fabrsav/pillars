import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import itemsData from '../data/items.json';

const FieldToggle = ({value, onChange, trueLabel='Sì', falseLabel='No'}) => (
  <button onClick={() => onChange(!value)} className={`px-2 py-1 rounded-full text-xs ${value ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-800/40 text-slate-400'}`}>
    {value ? trueLabel : falseLabel}
  </button>
);

const DailyItems = ({ isEditMode = true }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('daily_items');
      return raw ? JSON.parse(raw) : itemsData;
    } catch (e) {
      return itemsData;
    }
  });

  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [syncMessage, setSyncMessage] = useState('');
  const [serverEmpty, setServerEmpty] = useState(false);
  const fileInputRef = useRef(null);
  const pendingSave = useRef(false);
  const saveTimeout = useRef(null);

  // On mount: try to load server-side saved copy if available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/store/daily_items');
        if (!resp.ok) {
          // No server copy yet or endpoint not available; keep local
          return;
        }
        const data = await resp.json();
        // If server returned a non-empty array, adopt it. If it returned an empty array, ignore to avoid wiping local data.
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setItems(data);
          try { localStorage.setItem('daily_items', JSON.stringify(data)); } catch (_) {}
          setSyncStatus('synced');
          setServerEmpty(false);
        } else if (!cancelled && Array.isArray(data) && data.length === 0) {
          // Server returned empty array — do not overwrite local; flag for user
          setSyncMessage('Copia server vuota — ignorata');
          setServerEmpty(true);
        }
      } catch (e) {
        // network error -> server not available; ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('daily_items', JSON.stringify(items)); } catch (e) { console.warn('Impossibile salvare daily_items', e); }

    // Debounced server save
    pendingSave.current = true;
    setSyncStatus('idle');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!pendingSave.current) return;
      setSyncStatus('syncing');
      try {
        const resp = await fetch('/api/store/daily_items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items)
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          setSyncStatus('error');
          setSyncMessage(`Server error: ${resp.status} ${txt}`);
          console.warn('[DailyItems] Server save failed', resp.status, txt);
        } else {
          setSyncStatus('synced');
          setSyncMessage('');
          pendingSave.current = false;
        }
      } catch (e) {
        setSyncStatus('error');
        setSyncMessage(e.message || 'Network error');
        console.warn('[DailyItems] Server save exception', e);
      }
    }, 600);

    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [items]);

  const updateItem = (id, patch) => {
    setServerEmpty(false);
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const resetDefaults = () => {
    if (!window.confirm('Ripristinare i valori di default?')) return;
    setItems(itemsData);
    setServerEmpty(false);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'daily_items_export.json'; a.click(); URL.revokeObjectURL(url);
  };

  const importFromFile = (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error('Formato non valido');
        setItems(arr);
        setServerEmpty(false);
      } catch (err) {
        alert('Formato JSON non valido: deve essere un array di oggetti');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-200">Oggettini quotidiani</h4>
        <div className="text-xs text-slate-400">{syncStatus === 'syncing' ? 'Sincronizzazione...' : syncStatus === 'synced' ? 'Salvato sul server' : syncStatus === 'error' ? `Errore: ${syncMessage}` : ''}</div>
        <div className="flex gap-2">
          <button onClick={exportJson} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Esporta</button>
          <button onClick={() => fileInputRef.current?.click()} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Importa</button>
          <button onClick={resetDefaults} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Reset</button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importFromFile} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {serverEmpty && (
          <div className="p-2 mb-3 bg-yellow-900/40 border border-yellow-700 rounded text-sm text-yellow-200 flex items-center justify-between">
            <div>Copia server vuota — non ho sovrascritto i tuoi oggettini.</div>
            <div className="flex gap-2">
              <button onClick={() => { resetDefaults(); setServerEmpty(false); }} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Ripristina default</button>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Importa file</button>
            </div>
          </div>
        )}
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
