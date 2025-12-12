import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global client-side error reporting to aid debugging (sends sanitized errors to server)
function reportClientError(err, context = 'client_error') {
  try {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err), context })
    }).catch(() => {});
  } catch (e) { /* best-effort */ }
}

window.addEventListener('error', (ev) => {
  reportClientError(ev.error ? ev.error.stack || ev.error : ev.message || String(ev), 'window_error');
});

window.addEventListener('unhandledrejection', (ev) => {
  reportClientError(ev.reason ? (ev.reason.stack || ev.reason) : String(ev), 'unhandled_rejection');
});

// Also wrap initial render to catch synchronous mount errors
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (err) {
  reportClientError(err, 'render_error');
  throw err;
}
