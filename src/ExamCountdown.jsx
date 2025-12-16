import React, { useEffect, useState } from 'react';

function formatRemaining(ms) {
  if (ms <= 0) return 'Scaduto';
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function ExamCountdown() {
  const [exams, setExams] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch('/api/exams').then(r => r.ok ? r.json() : Promise.resolve({exams:[]})).then(j => setExams(j.exams || []));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const updateDate = async (id, isoDate) => {
    const updated = exams.map(e => e.id === id ? {...e, examDate: isoDate} : e);
    setExams(updated);
    // persist
    await fetch('/api/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exams: updated }) });
  };

  return (
    <div className="space-y-3">
      {exams.map(ex => {
        const remaining = new Date(ex.examDate).getTime() - now;
        return (
          <div key={ex.id} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{ex.name}</div>
                <div className="text-xs text-slate-400">{ex.examDate}</div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${remaining <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatRemaining(remaining)}</div>
              </div>
            </div>
            <div className="mt-2 flex gap-2 items-center">
              <input type="date" value={(ex.examDate || '').slice(0,10)} onChange={(e) => updateDate(ex.id, e.target.value)} className="bg-slate-900 px-3 py-2 rounded" />
              <div className="text-[11px] text-slate-400">Modifica data esame</div>
            </div>
          </div>
        );
      })}
      {exams.length === 0 && <div className="text-slate-500 text-sm">Nessun esame configurato. Aggiungi in <code>db/exam_topics.json</code>.</div>}
    </div>
  );
}
