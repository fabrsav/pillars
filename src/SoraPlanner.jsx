import React, { useEffect, useState } from 'react';

export default function SoraPlanner({ isEditMode = true }) {
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState('');
  const [days, setDays] = useState({ mon:false, tue:false, wed:false, thu:false, fri:false, sat:false, sun:false });
  const [selected, setSelected] = useState({});
  const [plans, setPlans] = useState([]);
  const [flash, setFlash] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res1 = await fetch('/api/store/sora_activities');
        if (res1.ok) setActivities(await res1.json());
      } catch (e) {}
      try {
        const res2 = await fetch('/api/store/sora_days');
        if (res2.ok) setDays(await res2.json());
      } catch (e) {}
      try {
        const res3 = await fetch('/api/store/sora_plans');
        if (res3.ok) setPlans(await res3.json());
      } catch (e) {}
    })();
  }, []);

  useEffect(() => { if (flash) { const t = setTimeout(() => setFlash(null), 4000); return () => clearTimeout(t); } }, [flash]);

  const saveActivities = async (arr) => {
    setActivities(arr);
    await fetch('/api/store/sora_activities', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(arr) });
  };

  const saveDays = async (obj) => {
    setDays(obj);
    await fetch('/api/store/sora_days', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(obj) });
  };

  const savePlans = async (arr) => {
    setPlans(arr);
    await fetch('/api/store/sora_plans', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(arr) });
  };

  const addActivity = () => {
    if (!newActivity.trim()) return;
    const a = { id: Date.now(), text: newActivity.trim(), createdAt: new Date().toISOString() };
    const arr = [...activities, a];
    saveActivities(arr);
    setNewActivity('');
  };

  const removeActivity = (id) => {
    const arr = activities.filter(a => a.id !== id);
    saveActivities(arr);
    const sel = { ...selected }; delete sel[id]; setSelected(sel);
  };

  const toggleDay = (k) => {
    const obj = { ...days, [k]: !days[k] };
    saveDays(obj);
  };

  const toggleSelect = (id) => {
    const s = { ...selected, [id]: !selected[id] };
    if (!s[id]) delete s[id];
    setSelected(s);
  };

  function nextDateForWeekday(weekday) {
    // weekday: 0=Sun..6=Sat
    const today = new Date();
    const off = (weekday + 7 - today.getDay()) % 7;
    const d = new Date(); d.setDate(today.getDate() + (off === 0 ? 7 : off)); // next occurrence (skip today)
    return d;
  }

  const assignToWeekday = async (weekdayStr) => {
    const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
    const winners = activities.filter(a => selected[a.id]);
    if (!winners.length) { setFlash('Seleziona prima una o più attività'); return; }
    if (!days[weekdayStr]) { setFlash('Il giorno selezionato non è segnato come giorno in cui sarai a Sora'); return; }

    const next = nextDateForWeekday(map[weekdayStr]);
    const dateStr = next.toISOString().slice(0,10);
    const newEntries = winners.map(a => ({ id: Date.now() + Math.floor(Math.random()*1000), activityId: a.id, text: a.text, date: dateStr }));
    const arr = [...plans, ...newEntries];
    await savePlans(arr);
    setFlash(`Pianificate ${winners.length} attività per il ${dateStr}`);
    // browser notification
    try {
      if (Notification && Notification.permission === 'granted') {
        new Notification('Pianificazione creata', { body: `Attività programmate per ${dateStr}` });
      }
    } catch (e) {}
  };

  const requestNotification = async () => {
    if (!('Notification' in window)) { setFlash('Notifiche non supportate nel browser'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') setFlash('Notifiche abilitate'); else setFlash('Permesso notifiche negato');
  };

  const removePlan = (id) => {
    const arr = plans.filter(p => p.id !== id);
    savePlans(arr);
  };

  useEffect(() => {
    // simple daily check: if any plan is for today, show an alert when alertsEnabled
    if (!alertsEnabled) return;
    const today = new Date().toISOString().slice(0,10);
    const todays = plans.filter(p => p.date === today);
    if (todays.length) {
      try { if (Notification && Notification.permission === 'granted') new Notification('Oggi a Sora', { body: `${todays.length} attività pianificate per oggi` }); } catch(e){}
      setFlash(`Oggi hai ${todays.length} attività a Sora`);
    }
  }, [alertsEnabled, plans]);

  return (
    <div className="bg-slate-900/40 p-4 rounded-lg">
      <h4 className="text-sm font-bold text-white mb-2">Cose da fare a Sora</h4>

      <div className="mb-3">
        <div className="flex gap-2">
          <input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Aggiungi attività..." className="flex-1 bg-slate-950/40 border border-slate-800 rounded px-2 py-1 text-sm" />
          <button onClick={addActivity} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">Aggiungi</button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {activities.map(a => (
            <div key={a.id} className="flex items-center gap-2 p-2 bg-slate-800/30 rounded">
              <input type="checkbox" checked={!!selected[a.id]} onChange={() => toggleSelect(a.id)} />
              <div className="flex-1 text-sm">{a.text}</div>
              <button onClick={() => removeActivity(a.id)} className="text-rose-400 text-xs">Elimina</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-2">Giorni in cui sai che tornerai a Sora</div>
        <div className="flex gap-1 text-xs">
          {['mon','tue','wed','thu','fri','sat','sun'].map(k => (
            <button key={k} onClick={() => toggleDay(k)} className={`px-2 py-1 rounded ${days[k] ? 'bg-emerald-600 text-white' : 'bg-slate-800/30 text-slate-400'}`}>{k.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-2">Pianifica attività sui prossimi giorni in cui tornerai</div>
        <div className="flex gap-2 flex-wrap">
          {['mon','tue','wed','thu','fri','sat','sun'].filter(k => days[k]).map(k => (
            <div key={k} className="p-2 bg-slate-800/30 rounded">
              <div className="text-xs font-bold mb-1">{k.toUpperCase()}</div>
              <div className="text-xs mb-2">Prossima: {nextDateForWeekday({ sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }[k]).toISOString().slice(0,10)}</div>
              <div className="flex gap-1">
                <button onClick={() => assignToWeekday(k)} className="text-xs px-2 py-1 bg-emerald-600/20 rounded">Assegna alle attività selezionate</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-400 mb-2">Piani programmati</div>
        <div className="space-y-2">
          {plans.sort((a,b)=>a.date.localeCompare(b.date)).map(p => (
            <div key={p.id} className="flex items-center gap-2 p-2 bg-slate-800/30 rounded">
              <div className="text-sm">{p.date} — {p.text}</div>
              <button onClick={() => removePlan(p.id)} className="ml-auto text-rose-400 text-xs">Rimuovi</button>
            </div>
          ))}
          {plans.length === 0 && <div className="text-xs text-slate-500">Nessun piano</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button onClick={requestNotification} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Abilita notifiche</button>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={alertsEnabled} onChange={e => setAlertsEnabled(e.target.checked)} /> Mostra alert giornalieri</label>
      </div>

      {flash && <div className="mt-3 p-2 bg-amber-600/20 text-amber-400 text-sm rounded">{flash}</div>}
    </div>
  );
}
