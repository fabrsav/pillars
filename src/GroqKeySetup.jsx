import React, { useState, useEffect } from 'react';

export default function GroqKeySetup() {
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [updateSource, setUpdateSource] = useState(false);
  const [status, setStatus] = useState(null);
  // Fixed model - do not allow changing it in the UI
  const [selectedModel, setSelectedModel] = useState('groq/compound');

  useEffect(() => {
    // Ensure UI shows forced model from server if available
    fetchModelChoice();
  }, []);

  async function handleSetup(e) {
    e.preventDefault();
    if (!password || !password.trim()) {
      setStatus('error: password required to encrypt key');
      return;
    }
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

  async function fetchModelChoice() {
    try {
      const res = await fetch('/api/groq-model-choice');
      const j = await res.json();
      if (j && j.model) setSelectedModel(j.model);
    } catch (e) {
      console.warn('Failed to fetch model choice', e);
    }
  }

  const [testPrompt, setTestPrompt] = useState('Say hello in Italian and mention the selected model.');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);

  async function runTest() {
    // selectedModel is always set to 'groq/compound'
    setTestLoading(true);
    setTestResponse(null);
    setStatus('testing');
    try {
      // Use the forced model `groq/compound` via the server proxy endpoint
      const proxyBody = { prompt: testPrompt, model: selectedModel, max_completion_tokens: 200 };
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody)
      });

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        // try to extract assistant reply
        if (json && json.choices && Array.isArray(json.choices) && json.choices[0]) {
          const msg = json.choices[0].message || json.choices[0].text || json.choices[0].delta || json.choices[0];
          setTestResponse(msg);
        } else {
          setTestResponse(json);
        }
      } catch (e) {
        setTestResponse(text);
      }
      setStatus('test_ok');
    } catch (e) {
      setTestResponse(null);
      setStatus('error: ' + String(e));
    } finally {
      setTestLoading(false);
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
        <label style={{fontSize:12}}>Modello Groq forzato:</label>
        <small style={{marginLeft:8}}>{selectedModel}</small>
      </div>
    </div>
  );
}
