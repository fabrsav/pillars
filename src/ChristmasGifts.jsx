import React, { useEffect, useState, useMemo } from 'react';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default function ChristmasGifts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar'); // 'calendar' | 'list'
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ person: '', ideas: '', budget: '', dueDate: '', reminderDate: '' });
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch('/api/christmas-gifts');
      if (!res.ok) throw new Error('Failed to fetch');
      const j = await res.json();
      setItems(j.items || []);
    } catch (e) {
      console.error('ChristmasGifts fetchItems error', e);
    } finally { setLoading(false); }
  }

  const eventsByDate = useMemo(() => {
    const map = {};
    (items || []).forEach(it => {
      if (!it.dueDate) return;
      const key = formatDate(it.dueDate);
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    return map;
  }, [items]);

  function startAdd(dateKey) {
    setForm(prev => ({ ...prev, dueDate: dateKey || '' }));
    setEditing(null);
    setView('list');
    setSelectedDate(dateKey || null);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({
      person: item.person || '',
      ideas: (item.ideas || []).join(', '),
      budget: item.budget || '',
      dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
      reminderDate: item.reminderDate || ''
    });
    setView('list');
  }

  async function save() {
    const payload = {
      person: form.person,
      ideas: form.ideas.split(',').map(s => s.trim()).filter(Boolean),
      budget: form.budget ? Number(form.budget) : null,
      dueDate: form.dueDate || null,
      reminderDate: form.reminderDate || null,
      notes: ''
    };

    try {
      if (editing) {
        const res = await fetch(`/api/christmas-gifts/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('update failed');
      } else {
        const res = await fetch('/api/christmas-gifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('create failed');
      }
      await fetchItems();
      setForm({ person: '', ideas: '', budget: '', dueDate: '', reminderDate: '' });
      setEditing(null);
    } catch (e) {
      console.error('save error', e);
      alert('Errore salvataggio');
    }
  }

  async function remove(id) {
    if (!confirm('Eliminare questo regalo?')) return;
    try {
      const res = await fetch(`/api/christmas-gifts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      await fetchItems();
    } catch (e) {
      console.error('remove error', e);
      alert('Errore eliminazione');
    }
  }

  async function toggleField(id, field, value) {
    try {
      const res = await fetch(`/api/christmas-gifts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
      if (!res.ok) throw new Error('update failed');
      await fetchItems();
    } catch (e) {
      console.error('toggleField error', e);
    }
  }

  // Calendar helpers
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  function prevMonth() { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); }

  const weeks = useMemo(() => {
    const days = [];
    const start = new Date(firstDayOfMonth);
    start.setDate(start.getDate() - start.getDay()); // start from sunday
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    const rows = [];
    for (let i = 0; i < 6; i++) rows.push(days.slice(i * 7, i * 7 + 7));
    return rows;
  }, [currentMonth]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1 rounded ${view==='calendar'?'bg-cyan-800 text-white':'text-slate-300'}`} onClick={() => setView('calendar')}>Calendario</button>
          <button className={`px-3 py-1 rounded ${view==='list'?'bg-cyan-800 text-white':'text-slate-300'}`} onClick={() => setView('list')}>Lista</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-slate-800 rounded" onClick={() => startAdd(null)}>Aggiungi regalo</button>
        </div>
      </div>

      {view === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-slate-300">{currentMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</div>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="px-2 py-1 bg-slate-800 rounded text-slate-300">Prev</button>
              <button onClick={nextMonth} className="px-2 py-1 bg-slate-800 rounded text-slate-300">Next</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Dom','Lun','Mar','Mer','Gio','Ven','Sab'].map(d => (
              <div key={d} className="text-slate-400 text-center py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mt-2">
            {weeks.flat().map(day => {
              const key = formatDate(day.toISOString());
              const inMonth = day.getMonth() === currentMonth.getMonth();
              const ev = eventsByDate[key] || [];
              return (
                <div key={key} onClick={() => { setSelectedDate(key); setView('list'); }} className={`p-2 h-20 rounded border ${inMonth? 'bg-slate-900' : 'bg-slate-900/20 text-slate-700'} cursor-pointer`}> 
                  <div className="text-xs mb-1 flex justify-between items-center">
                    <div className={`${inMonth?'text-slate-200':'text-slate-500'}`}>{day.getDate()}</div>
                    {ev.length > 0 && <div className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded">{ev.length}</div>}
                  </div>
                  <div className="text-[11px] text-slate-400">{ev.slice(0,2).map(e=> <div key={e.id}>{e.person || e.ideas?.[0]}</div>)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div>
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
            {(selectedDate ? (eventsByDate[selectedDate] || []) : items).map(it => (
              <div key={it.id} className="bg-slate-900 p-3 rounded border border-slate-800 flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-white">{it.person || '—'}</div>
                  <div className="text-xs text-slate-400">{(it.ideas||[]).join(', ')}</div>
                  <div className="text-xs text-slate-500 mt-1">Scadenza: {it.dueDate ? it.dueDate.split('T')[0] : '—'} • Stato: {it.status}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(it)} className="px-2 py-1 bg-amber-600 rounded text-xs">Modifica</button>
                    <button onClick={() => remove(it.id)} className="px-2 py-1 bg-rose-600 rounded text-xs">Elimina</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleField(it.id, 'status', it.status === 'bought' ? 'idea' : 'bought')} className="px-2 py-1 bg-slate-700 rounded text-xs">{it.status === 'bought' ? 'Segna come idea' : 'Segna acquistato'}</button>
                    <button onClick={() => toggleField(it.id, 'wrapped', !it.wrapped)} className={`px-2 py-1 rounded text-xs ${it.wrapped ? 'bg-emerald-600' : 'bg-slate-700'}`}>{it.wrapped ? 'Avvolto' : 'Segna avvolto'}</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Form */}
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <input className="bg-slate-800 p-2 rounded" placeholder="Persona" value={form.person} onChange={e=>setForm({...form, person:e.target.value})} />
                <input className="bg-slate-800 p-2 rounded" placeholder="Idee (separate da ,)" value={form.ideas} onChange={e=>setForm({...form, ideas:e.target.value})} />
                <input className="bg-slate-800 p-2 rounded" placeholder="Budget" value={form.budget} onChange={e=>setForm({...form, budget:e.target.value})} />
                <input type="date" className="bg-slate-800 p-2 rounded" value={form.dueDate} onChange={e=>setForm({...form, dueDate:e.target.value})} />
                <input type="date" className="bg-slate-800 p-2 rounded" placeholder="Remind" value={form.reminderDate} onChange={e=>setForm({...form, reminderDate:e.target.value})} />
                <div className="flex items-center gap-2">
                  <button onClick={save} className="px-3 py-1 bg-cyan-700 rounded">{editing ? 'Aggiorna' : 'Aggiungi'}</button>
                  <button onClick={() => { setForm({ person: '', ideas: '', budget: '', dueDate: '', reminderDate: '' }); setEditing(null); }} className="px-3 py-1 bg-slate-700 rounded">Annulla</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
