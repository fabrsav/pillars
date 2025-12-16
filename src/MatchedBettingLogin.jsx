import React, { useState, useEffect } from 'react';

const MatchedBettingLogin = ({ onConnected }) => {
  const [status, setStatus] = useState({ connected: false });

  useEffect(() => { checkStatus(); const handle = (e) => { if (e.data && e.data.success) checkStatus(); }; window.addEventListener('message', handle); return () => window.removeEventListener('message', handle); }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/matched-betting/status');
      const j = await res.json();
      setStatus(j);
      if (j.connected && onConnected) onConnected(j.email);
    } catch(e) { console.warn('Status check failed', e); }
  };

  const startOauth = () => {
    const w = window.open('/api/matched-betting/oauth/start', 'oauth', 'width=600,height=700');
    // popup will postMessage on success
  };

  const disconnect = async () => {
    await fetch('/api/matched-betting/disconnect', { method: 'POST' });
    checkStatus();
  };

  return (
    <div className="flex items-center gap-2">
      {status.connected ? (
        <>
          <div className="text-[12px] text-slate-300">Connesso: <strong>{status.email}</strong></div>
          <button onClick={disconnect} className="px-2 py-1 rounded bg-red-700/20 text-red-300">Disconnetti</button>
        </>
      ) : (
        <button onClick={startOauth} className="px-2 py-1 rounded bg-indigo-700/20 text-indigo-300">Connetti account Gmail</button>
      )}
    </div>
  );
};

export default MatchedBettingLogin;