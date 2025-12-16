import React, { useEffect, useState } from 'react';

export default function AnkiStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch('/api/anki-stats');
    if (res.ok) {
      const j = await res.json();
      setStats(j.stats || []);
    }
  };

  useEffect(() => { load(); }, []);

  const triggerParse = async () => {
    setLoading(true);
    try {
      await fetch('/api/anki-stats/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      await load();
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const syncFromAnkiConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anki-connect/sync', { method: 'POST' });
      if (res.ok) {
        const j = await res.json();
        // reload from persisted file
        await load();
        return j.result;
      }
      throw new Error('Sync failed');
    } catch (e) {
      console.error(e);
      alert('Impossibile connettersi a AnkiConnect. Assicurati che Anki sia aperto e AnkiConnect installato.');
    } finally { setLoading(false); }
  };

  const latest = stats && stats.length > 0 ? stats[0] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">Statistiche Anki</div>
        <div className="flex gap-2">
          <button onClick={triggerParse} disabled={loading} className="bg-slate-800 px-3 py-2 rounded">{loading ? 'Parsing...' : 'Aggiorna'}</button>
          <button onClick={syncFromAnkiConnect} disabled={loading} className="bg-indigo-700 px-3 py-2 rounded">{loading ? 'Connessione...' : 'Sync da Anki'}</button>
        </div>
      </div>

      {latest ? (
        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-2">{latest.filename} • {latest.recordedAt}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-bold">Review</div>
            <div className="text-right">{latest.metrics.totalReviews ?? '-'}</div>
            <div className="text-sm font-bold">New cards</div>
            <div className="text-right">{latest.metrics.newCards ?? '-'}</div>
            <div className="text-sm font-bold">Due cards</div>
            <div className="text-right">{latest.metrics.dueCards ?? '-'}</div>
            <div className="text-sm font-bold">Retention</div>
            <div className="text-right">{latest.metrics.retention ? `${latest.metrics.retention}%` : '-'}</div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Nessuna statistica disponibile. Esegui l'aggiornamento.</div>
      )}
    </div>
  );
}
