import React, { useState, useEffect } from 'react';

export default function GroqKeySetup() {
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [updateSource, setUpdateSource] = useState(false);
  const [status, setStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    // Try to load models on mount (may return defaults)
    fetchModels();
    fetchModelChoice();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch('/api/groq-models');
      const j = await res.json();
      if (j && Array.isArray(j.models)) setModels(j.models);
      else if (j && j.models) setModels(j.models);
    } catch (e) {
      console.warn('Failed to fetch models', e);
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    setStatus('working');
    try {
      const res = await fetch('/api/groq-key/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, apiKey: apiKey || undefined, updateSource })
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setStatus('ok');
        // refresh models now that server may have the key loaded
        await fetchModels();
      } else {
        setStatus('error: ' + (j.error || JSON.stringify(j)));
      }
    } catch (e) {
      setStatus('error: ' + String(e));
    }
  }

  function saveModelChoice(m) {
    setSelectedModel(m);
    setStatus('saving_model');
    fetch('/api/groq-model-choice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: m })
    }).then(async res => {
      if (res.ok) {
        setStatus('model_saved');
      } else {
        const j = await res.json().catch(()=>null);
        setStatus('error: ' + (j && j.error ? j.error : String(res.status)));
      }
    }).catch(e => setStatus('error: ' + String(e)));
  }

  async function fetchModelChoice() {
    try {
      const res = await fetch('/api/groq-model-choice');
      const j = await res.json();
      if (j && j.model) setSelectedModel(j.model);
    } catch (e) {
      console.warn('Failed to fetch model choice', e);
    }
  }

  return (
    <div style={{padding:8,background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
      <form onSubmit={handleSetup} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <label style={{fontSize:12}}>API Key:</label>
        <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk_... or leave blank to use existing" style={{minWidth:220}} />
        <label style={{fontSize:12}}>Password (for encryption):</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
        <label style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="checkbox" checked={updateSource} onChange={e=>setUpdateSource(e.target.checked)} />
          Aggiorna fonte (groq-key-manager.js)
        </label>
        <button type="submit">Configura chiave</button>
        <button type="button" onClick={fetchModels}>Ricarica modelli</button>
        <div style={{marginLeft:12}}>
          {status && <small>{String(status)}</small>}
        </div>
      </form>

      <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
        <label style={{fontSize:12}}>Seleziona modello Groq:</label>
        <select value={selectedModel} onChange={e=>saveModelChoice(e.target.value)}>
          <option value="">-- seleziona --</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {selectedModel && <small style={{marginLeft:8}}>Salvato: {selectedModel}</small>}
      </div>
    </div>
  );
}
