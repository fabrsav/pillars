/**
 * ==========================================================================================
 * 🤖 NOTA PER LE FUTURE INTELLIGENZE ARTIFICIALI (READ ME FIRST) 🤖
 * ==========================================================================================
 * * PROGETTO: LifeOS / Pillars (React Single File Component)
 * OBIETTIVO: Dashboard personale olistica (Wealth, Health, Brain, Heart).
 * * * ARCHITETTURA:
 * - Framework: React (con Hooks: useState, useEffect, useRef).
 * - Styling: Tailwind CSS (uso intensivo di gradienti, backdrop-blur, animate-in).
 * - Icone: Lucide-react.
 * - API AI: Groq (Llama 3.3 70B).
 * - Persistenza: Backend Locale (Node.js + JSON Files).
 * * * MODULI CRITICI (NON RIMUOVERE O SEMPLIFICARE ECCESSIVAMENTE):
 * 1. REFUND MANAGER (Gestione rimborsi):
 * - Rinomina visiva: "Gestione rimborsi" (NO "Tracking Acquisti").
 * - Input "Smart" per parsing testo naturale -> JSON.
 * - "Smart Login": copia password clipboard + apre link provider.
 * * 2. ILARIA OS (Relationship Manager - FULL CONTEXT VERSION):
 * - ⚠️ CRITICO: L'utente richiede l'analisi dell'INTERO file chat (anche 2M+ token).
 * - NON REINTRODURRE CAMPIONAMENTO O TAGLI (Sampling/Slicing).
 * - Il prompt deve istruire l'LLM a gestire l'intera timeline.
 * - PERSISTENZA: Il localStorage ha un limite di ~5MB. Se il file .txt supera il limite:
 * a) Salvare assolutamente l'ANALISI (JSON) che è piccola.
 * b) Tentare di salvare il TXT, ma gestire l'errore (QuotaExceeded) senza crashare.
 * * 3. LAYOUT & UX:
 * - Sidebar fissa + Dashboard fluida.
 * - Animazioni obbligatorie: `transition-all duration-300 ease-out`.
 * * 4. API & SICUREZZA:
 * - `apiKey` fornita dall'utente/ambiente.
 * ==========================================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import FabricConfigurator from './FabricConfigurator';
import MatchedBettingLogin from './MatchedBettingLogin';
import DailyItems from './DailyItems';
import DeadlineCountdown from './DeadlineCountdown';
import ExamCountdown from './ExamCountdown';
import AnkiStats from './AnkiStats';
import Snowfall from './Snowfall';
import SantaHat from './SantaHat';
import ChristmasGifts from './ChristmasGifts';
import { 
  CheckCircle2, Sun, Moon, Play, Pause, RotateCcw, Sparkles, Zap, Trophy, 
  DollarSign, TrendingUp, Code, Landmark, Calculator, Dumbbell, Heart, 
  Utensils, BedDouble, Activity, Brain, BookOpen, Lightbulb, Puzzle, 
  Briefcase, GraduationCap, Gift, MessageCircle, CalendarHeart, Users, 
  Edit3, Gem, Droplet, Flame, CheckSquare, Library, Plane, Coins, 
  ArrowRight, Dna, Timer, Cpu, History, AlertTriangle, Crosshair, 
  Scissors, Smile, Wind, Plus, Trash2, X, GripVertical, ArrowDownUp,
  Loader2, Watch, RefreshCw, UploadCloud, FileText, BarChart3, Lock, Download,
  School, Calendar, BookMarked, ShoppingBag, Mail, AlertCircle, Receipt,
  Package, CalendarClock, PhoneCall, LogIn, Eye, EyeOff, FileHeart,
  Database, Save, Settings, ListTodo, Target, Rocket, Cloud, CloudOff, Wand2
} from 'lucide-react';

// --- HOOK PERSISTENZA LOCALE (BACKEND) ---
const useStorage = (key, initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log(`[useStorage] Fetching ${key}...`);
    fetch(`/api/store/${key}`)
      .then(res => {
        console.log(`[useStorage] ${key} response status:`, res.status);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        console.log(`[useStorage] ${key} data received:`, data);
        if (data !== null) {
          // If server returned a numeric-keyed object for an array key (legacy DB), convert it to an array
          let serverData = data;
          if (Array.isArray(initialValue) && serverData && typeof serverData === 'object' && !Array.isArray(serverData)) {
            const keys = Object.keys(serverData);
            if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
              serverData = keys.map(k => serverData[k]);
              console.log(`[useStorage] ${key}: converted numeric-keyed object to array (${serverData.length} items)`);
            }
          }

          // If the expected type (based on initialValue) doesn't match the server value, ignore to avoid runtime crashes
          if (Array.isArray(initialValue) && !Array.isArray(serverData)) {
            console.warn(`[useStorage] ${key}: expected array but server returned ${typeof serverData}; ignoring server data.`);
            setLoaded(true);
            return;
          }
          if (!Array.isArray(initialValue) && Array.isArray(serverData) && initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)) {
            console.warn(`[useStorage] ${key}: expected object but server returned array; ignoring server data.`);
            setLoaded(true);
            return;
          }

          // Merge received data with current value to avoid accidental wiping of defaults
          setValue(prev => {
            try {
              // If the server returns an array for this key, handle arrays specifically
              if (Array.isArray(serverData)) {
                // If our local value is also an array, merge carefully
                if (Array.isArray(prev)) {
                  if (serverData.length === 0) return prev; // ignore empty server array
                  const indexById = new Map();
                  prev.forEach(item => { if (item && item.id) indexById.set(item.id, item); });
                  serverData.forEach(item => { if (item && item.id) indexById.set(item.id, item); });
                  return Array.from(indexById.values());
                }
                // If local is not array, fall back to server data unless empty
                return serverData.length === 0 ? prev : serverData;
              }

              // If both prev and data are plain objects, merge keys (used for complex db objects)
              if (prev && typeof prev === 'object' && !Array.isArray(prev) && serverData && typeof serverData === 'object' && !Array.isArray(serverData)) {
                const merged = { ...prev };
                for (const k of Object.keys(serverData)) {
                  const v = serverData[k];
                  if (Array.isArray(v)) {
                    if (!Array.isArray(merged[k]) || merged[k] == null) merged[k] = [];
                    if (v.length === 0) {
                      // keep existing
                    } else if (Array.isArray(merged[k])) {
                      const indexById = new Map();
                      merged[k].forEach(item => { if (item && item.id) indexById.set(item.id, item); });
                      v.forEach(item => { if (item && item.id) indexById.set(item.id, item); });
                      merged[k] = Array.from(indexById.values());
                    } else {
                      merged[k] = v;
                    }
                  } else if (v !== null && typeof v === 'object') {
                    merged[k] = { ...(merged[k] || {}), ...v };
                  } else {
                    merged[k] = v;
                  }
                }
                return merged;
              }
            } catch (e) {
              console.warn('[useStorage] merge failed, falling back to server data', e);
            }
            return serverData;
          });
        }
        setLoaded(true);
      })
      .catch(err => {
        console.error(`[useStorage] ${key} ERROR:`, err);
        setLoaded(true);
      });
  }, [key]);

  useEffect(() => {
    if (loaded) {
      fetch(`/api/store/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
      }).catch(err => console.error(`Error saving ${key}:`, err));
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded];
};

// --- ERROR LOGGING UTILITY ---
const logError = async (error, context) => {
  console.error(`[${context}]`, error);
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.toString(), context })
    });
  } catch (e) {
    console.warn("Failed to send log to server", e);
  }
};

// === REFUND HELPERS (exported for tests) ===
export const CLOSED_REFUND_STATUSES = ['Rimborsato', 'Assistenza', 'Completato', 'Annullato'];

export const getActiveRefundsTotal = (refundsList = []) => {
  return (refundsList || [])
    .filter(r => !CLOSED_REFUND_STATUSES.includes(r.status) && !r.archived)
    .reduce((acc, r) => {
      const v = parseFloat(r?.amount);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
};

// Apply updates from AI or user to an existing refund object and return the updated refund
export const applyRefundUpdates = (r = {}, updates = {}, historyEntry = null) => {
  // parse amount if present
  let newAmount = r.amount;
  if (updates.amount !== undefined && updates.amount !== null && updates.amount !== '') {
    const parsed = parseFloat(updates.amount);
    if (!Number.isNaN(parsed)) newAmount = parsed;
  }

  return {
    ...r,
    amount: newAmount,
    status: updates.status || r.status,
    arrivalDate: updates.arrivalDate || r.arrivalDate,
    requestDate: updates.requestDate || r.requestDate,
    notes: updates.notes ? (r.notes ? r.notes + ' | ' + updates.notes : updates.notes) : r.notes,
    trackingCode: updates.trackingCode || r.trackingCode || '',
    pickupCode: updates.pickupCode || r.pickupCode || '',
    history: historyEntry ? [historyEntry, ...(r.history || [])] : r.history
  };
};

// --- CONFIGURAZIONE GROQ API ---
// NOTE: Sempre forzare `groq/compound` come unico modello utilizzato.
const MODEL_FAST = 'groq/compound';
const MODEL_SMART = 'groq/compound';

const callGroq = async (prompt, apiKey, model = null, maxTokens = 2048, reasoningEffort = 'high') => {
  if (!apiKey) throw new Error("MISSING_KEY");
  
  try {
    // Allow override via selectedModel persisted on the server; fallback to MODEL_SMART
    model = model || (typeof selectedModel !== 'undefined' ? selectedModel : null) || MODEL_SMART;

    // Usa reasoning effort alto per risposte più intelligenti
    // Consideriamo modello di reasoning qualunque modello tranne il modello "fast".
    // In questo modo Gemini / Llama / altri modelli "smart" ricevono gli stessi hint di reasoning.
    const isReasoningModel = model !== MODEL_FAST;
    
    const requestBody = {
      "model": model,
      "messages": [{ "role": "user", "content": prompt }],
      "temperature": 0.6,  // Ottimale per reasoning (0.5-0.7)
      "max_completion_tokens": maxTokens,
      "top_p": 0.95
    };
    
    // Aggiungi reasoning effort solo per modelli GPT-OSS
    if (isReasoningModel) {
      requestBody.reasoning_effort = reasoningEffort; // 'low', 'medium', 'high'
      requestBody.include_reasoning = false; // Non includere il reasoning nella risposta (solo il risultato)
    }
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq API Error]', response.status, errorText);
      const snippet = (errorText || '').slice(0, 200).replace(/\s+/g, ' ');
      if (response.status === 401 || response.status === 403) throw new Error("INVALID_KEY");
      if (response.status === 429) throw new Error("RATE_LIMIT");

      // Detect model-not-found and try a safe fallback (fast model) once
      if (/model.*does not exist|model_not_found|does not exist/i.test(snippet) && model !== MODEL_FAST) {
        console.warn('[Groq] Model not available, retrying with fast fallback model');
        const fallbackBody = { ...requestBody, model: MODEL_FAST };
        const fallbackResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody)
        });

        if (fallbackResp.ok) {
          const fd = await fallbackResp.json();
          return fd.choices?.[0]?.message?.content || null;
        }

        const fbTxt = await fallbackResp.text();
        console.error('[Groq fallback error]', fallbackResp.status, fbTxt);

        // If both primary and fallback fail due to model-not-found, surface a clear error
        const bothModelNotFound = /model.*does not exist|model_not_found|does not exist/i.test(fbTxt) && /model.*does not exist|model_not_found|does not exist/i.test(snippet);
        if (bothModelNotFound) {
          throw new Error(`MODEL_NOT_AVAILABLE: ${requestBody.model} (fallback: ${fallbackBody.model})`);
        }

        const fbSnippet = (fbTxt || '').slice(0, 200).replace(/\s+/g, ' ');
        throw new Error(`API Error: ${response.status} ${snippet}; fallback: ${fallbackResp.status} ${fbSnippet}`);
      }

      throw new Error(`API Error: ${response.status} ${snippet}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error) {
    logError(error, `Groq API (${model})`);
    throw error;
  }
};



// --- COMPONENTE EDITABLE TEXT (MAGIC PENCIL) ---
const EditableText = ({ id, defaultText, className, type = 'text' }) => {
  const [overrides, setOverrides] = useStorage('pillars_text_overrides', {});
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  
  // Global edit mode state (shared via event or context, but for simplicity we use a local toggle here triggered by a global class or prop if needed)
  // Actually, we will use a specific "Text Edit Mode" button in the UI to toggle a class on the body, or just let the user click to edit if enabled.
  // Let's use a simple "Click to Edit" if a global "Text Edit Mode" is active.
  // Since we don't have a global context provider easily here without refactoring, we'll check a window property or similar, OR just add a small UI indicator.
  
  // BETTER APPROACH: The user asked for a "vacant pencil". We'll use a state in the main component passed down, OR we can just make these always editable via double click if we want, but the user asked for a specific tool.
  // Let's assume `window.TEXT_EDIT_MODE` is toggled by the pencil.
  
  const [editModeEnabled, setEditModeEnabled] = useState(false);

  useEffect(() => {
    const checkMode = () => setEditModeEnabled(window.TEXT_EDIT_MODE === true);
    window.addEventListener('pillars-text-edit-toggle', checkMode);
    return () => window.removeEventListener('pillars-text-edit-toggle', checkMode);
  }, []);

  const text = overrides[id] || defaultText;

  const handleSave = () => {
    setOverrides(prev => ({ ...prev, [id]: tempValue }));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 animate-in fade-in duration-200">
        {type === 'textarea' ? (
             <textarea 
                value={tempValue} 
                onChange={e => setTempValue(e.target.value)} 
                className="bg-slate-950 border border-blue-500 text-white text-xs p-2 rounded w-full"
                autoFocus
             />
        ) : (
            <input 
                value={tempValue} 
                onChange={e => setTempValue(e.target.value)} 
                className="bg-slate-950 border border-blue-500 text-white text-xs p-1 rounded w-full"
                autoFocus
            />
        )}
        <button onClick={handleSave} className="text-green-400 hover:text-green-300"><CheckCircle2 size={14}/></button>
        <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
      </div>
    );
  }

  return (
    <span 
      data-edit-id={id}
      className={`${className} ${editModeEnabled ? 'cursor-pointer hover:bg-blue-500/20 hover:outline hover:outline-1 hover:outline-blue-500 rounded px-1 transition-all' : ''}`}
      onClick={() => {
        if (editModeEnabled) {
          setTempValue(text);
          setIsEditing(true);
        }
      }}
      title={editModeEnabled ? "Clicca per modificare testo" : ""}
    >
      {text}
    </span>
  );
};

// --- TEMI E CLASSI ---
const THEMES = {
  wealth: { 
    id: 'wealth', label: 'SOLDI', 
    bg: 'from-emerald-950 to-slate-950', accent: 'emerald', 
    text: 'text-emerald-400', border: 'border-emerald-500/20', 
    gradient: 'from-emerald-500 to-cyan-600', status: 'FOCUS: CRESCITA' 
  },
  health: { 
    id: 'health', label: 'FISICO', 
    bg: 'from-red-950 to-slate-950', accent: 'red', 
    text: 'text-red-500', border: 'border-red-500/20', 
    gradient: 'from-red-600 to-orange-600', status: 'FOCUS: ENERGIA' 
  },
  brain: { 
    id: 'brain', label: 'MENTE', 
    bg: 'from-indigo-950 to-slate-950', accent: 'indigo', 
    text: 'text-indigo-400', border: 'border-indigo-500/20', 
    gradient: 'from-indigo-500 to-violet-600', status: 'FOCUS: SVILUPPO' 
  },
  heart: { 
    id: 'heart', label: 'RELAZIONI', 
    bg: 'from-pink-950 to-slate-950', accent: 'pink', 
    text: 'text-pink-400', border: 'border-pink-500/20', 
    gradient: 'from-pink-500 to-fuchsia-600', status: 'FOCUS: CONNESSIONI' 
  }
};

const IconMap = ({ name, size = 18, className }) => {
  const icons = { 
    market: TrendingUp, algo: Code, betting: Zap, cashflow: Landmark, career: Briefcase, 
    shutdown: Moon, morning: Sun, workout: Dumbbell, nutrition: Utensils, sleep: BedDouble, 
    sprint: Wind, looksmax: Sparkles, mobility: Activity, biohack: Dna,
    university: GraduationCap, neuro: Zap, iq: Puzzle, learning: Library, meta: Lightbulb, 
    love: MessageCircle, travel: Plane, finance: Coins, growth: CalendarHeart,
    refunds: Receipt,
    skate: Zap, backfire: Zap, commute: Activity,
    default: Sparkles
  };
  const Icon = icons[name] || icons.default;
  return <Icon size={size} className={className} />;
};

// --- WIDGET 1: GESTIONE RIMBORSI (ex Tracking Acquisti) ---
const RefundManager = ({ theme, apiKey, onApiKeyError, refunds, setRefunds, refundsLoaded }) => {
  const [mode, setMode] = useState('list'); // list, manual, smart
  const [smartText, setSmartText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState({}); 
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sortOrder, setSortOrder] = useState('default');

  // Debug log
  useEffect(() => {
    console.log('[RefundManager] refundsLoaded:', refundsLoaded, 'refunds:', refunds);
  }, [refunds, refundsLoaded]);

  const [newRefund, setNewRefund] = useState({
    id: null,
    platform: '', item: '', email: '', password: '', amount: '', 
    arrivalDate: '', windowDays: 30, requestDate: '', 
    status: 'Da Fare', notes: '', history: [],
    trackingCode: '', pickupCode: ''
  });

  // Local UI state for AI updates
  const [updateText, setUpdateText] = useState('');
  const [isAnalyzingUpdate, setIsAnalyzingUpdate] = useState(false);
  const [archivedRefunds, setArchivedRefunds, archivedLoaded] = useStorage('pillars_refunds_archive_v1', []);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveModal, setArchiveModal] = useState({ open: false, target: null, refundDate: '' });
  const [toastMessage, setToastMessage] = useState(null);

  const unarchiveRefund = async (id) => {
    try {
      // Remove from archived state
      if (typeof setArchivedRefunds === 'function') {
        setArchivedRefunds(prev => (prev || []).filter(a => a.id !== id));
      } else {
        const res = await fetch('/api/store/pillars_refunds_archive_v1');
        let existing = [];
        if (res.ok) existing = await res.json() || [];
        existing = Array.isArray(existing) ? existing.filter(a => a.id !== id) : [];
        await fetch('/api/store/pillars_refunds_archive_v1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existing) });
      }

      // Mark refund as not archived in the main list
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, archived: false } : r));
      setToastMessage('Rimborso ripristinato dall\'archivio.');

      // Auto-hide toast after 2.2s
      setTimeout(() => setToastMessage(null), 2200);
    } catch (e) {
      console.error('Failed to unarchive', e);
      setToastMessage('Impossibile ripristinare il rimborso dall\'archivio.');
      setTimeout(() => setToastMessage(null), 2200);
    }
  };

  // --- SMART LOGIN ---
  const handleSmartLogin = (email, password) => {
    if (password) {
      // Usa execCommand come fallback o clipboard API
      const copyToClipboard = str => {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText)
          return navigator.clipboard.writeText(str);
        return Promise.reject('The Clipboard API is not available.');
      };

      // Try to copy password silently (no blocking alerts/popups)
      copyToClipboard(password).then(() => {
        console.info('Password copiato in clipboard per login', email);
      }).catch(() => {
        // Silent fallback: log only, avoid visible alerts
        console.warn('Clipboard copy failed for smart login');
      });
    } else {
      console.info(`Opening Gmail for ${email} (no stored password)`);
    }
    const googleLoginUrl = `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(email)}&continue=https://mail.google.com`;
    // Open Gmail in a new tab (no alerts). Keep this action optional in future.
    try { window.open(googleLoginUrl, '_blank'); } catch(e) { console.warn('Could not open Gmail tab', e); }
  };

  const processSmartText = async () => {
    if (!smartText.trim()) return;
    setIsProcessing(true);

    const today = new Date().toLocaleDateString('it-IT');
    const todayISO = new Date().toISOString().split('T')[0];
    
    // Costruisci il contesto dei rimborsi esistenti per l'AI
    const existingRefundsContext = refunds.map((r, idx) => 
      `[ID:${idx}] ${r.platform || 'Sconosciuto'} - "${r.item}" (€${r.amount || 0}) - Stato: ${r.status} - Arrivo: ${r.arrivalDate || 'N/A'}`
    ).join('\n');
    
    const prompt = `Sei un assistente intelligente per la gestione rimborsi. Oggi è ${today}.

RIMBORSI ESISTENTI NEL SISTEMA:
${existingRefundsContext || '(Nessun rimborso esistente)'}

MESSAGGIO DELL'UTENTE:
"${smartText}"

ISTRUZIONI:
1. PRIMA analizza se l'utente sta parlando di un rimborso GIÀ ESISTENTE nella lista sopra (es. "il pacco di temu", "la roba della moto", "ordine amazon", ecc.)
2. Se SI riferisce a un rimborso esistente: restituisci un UPDATE
3. Se NO, sta descrivendo un NUOVO acquisto/rimborso: restituisci un CREATE

RAGIONA PASSO PASSO:
- "pacco temu della moto" → cerca nella lista un rimborso TEMU che potrebbe essere "roba moto" o simile
- "è arrivato" → significa che il pacco è stato consegnato, quindi aggiorna arrivalDate e possibilmente status
- "lo vado a prendere alle 17" → conferma che sta per ritirarlo

RISPONDI SOLO con questo JSON (nessun altro testo):
{
  "action": "UPDATE" oppure "CREATE",
  "reasoning": "Breve spiegazione del tuo ragionamento",
  "matchedRefundIndex": numero (0-based) del rimborso matchato, oppure null se CREATE,
  "updates": {
    "status": "nuovo status se cambiato",
    "arrivalDate": "YYYY-MM-DD se sappiamo la data arrivo",
    "notes": "note aggiuntive da appendere",
    "requestDate": "YYYY-MM-DD se applicabile",
    "trackingCode": "codice tracking/spedizione se menzionato",
    "pickupCode": "codice ritiro (locker, punto ritiro) se menzionato"
  },
  "newRefund": null se UPDATE, oppure {"platform":"...","item":"...","amount":0,"trackingCode":"...","pickupCode":"...",...} se CREATE
}`;

    try {
      // Usa il modello SMART (70B) per questo task che richiede ragionamento
      const response = await callGroq(prompt, apiKey, MODEL_SMART, 1500);
      if (!response) throw new Error("No response from AI");
      
      // Estrai JSON dalla risposta
      let jsonStr = response;
      jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        jsonStr = match[0];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      console.log('[Smart Refund AI] Risposta:', parsed);
      
      if (parsed.action === 'UPDATE' && parsed.matchedRefundIndex !== null && parsed.matchedRefundIndex !== undefined) {
        // AGGIORNA rimborso esistente
        const targetRefund = refunds[parsed.matchedRefundIndex];
        if (!targetRefund) {
          throw new Error(`Rimborso index ${parsed.matchedRefundIndex} non trovato`);
        }
        
        const updates = parsed.updates || {};
        const historyEntry = {
          id: Date.now(),
          text: smartText.trim(),
          status: updates.status || targetRefund.status,
          summary: parsed.reasoning || 'Aggiornamento via AI',
          timestamp: todayISO
        };
        
        let updatedRefund = null;
        setRefunds(prev => prev.map((r, idx) => {
          if (idx !== parsed.matchedRefundIndex) return r;
          updatedRefund = applyRefundUpdates(r, updates, historyEntry);
          return updatedRefund;
        }));

        // If the user is editing this refund right now, sync the edit form state
        if (newRefund?.id === updatedRefund?.id && updatedRefund) {
          setNewRefund(updatedRefund);
        }
        
        alert(`✅ Aggiornato: "${targetRefund.item}" (${targetRefund.platform})\n\n${parsed.reasoning}`);
        
      } else if (parsed.action === 'CREATE' && parsed.newRefund) {
        // CREA nuovo rimborso
        const newItem = {
          ...parsed.newRefund,
          id: Date.now() + Math.random(),
          windowDays: 30,
          history: [{
            id: Date.now(),
            text: smartText.trim(),
            status: parsed.newRefund.status || 'Da Fare',
            summary: 'Creato via AI',
            timestamp: todayISO
          }]
        };
        setRefunds(prev => [...prev, newItem]);
        alert(`✅ Nuovo rimborso creato: "${newItem.item}" (${newItem.platform})`);
        
      } else {
        throw new Error("Risposta AI non valida: " + JSON.stringify(parsed));
      }
      
      setSmartText('');
      setMode('list');
    } catch (e) {
      console.error('[Smart Refund AI] Errore:', e);
      if (e.message === "INVALID_KEY" || e.message === "MISSING_KEY") onApiKeyError();
      else if (e.message === "RATE_LIMIT") alert("Server AI occupato. Riprova tra qualche secondo.");
      else if (e.message && e.message.startsWith('MODEL_NOT_AVAILABLE')) {
        alert("Errore IA: il modello selezionato non è disponibile con la tua chiave Groq. Vai su Impostazioni AI (Groq Key) e scegli un modello accessibile (es. 'groq/compound' o 'openai/gpt-oss-120b'), oppure carica una chiave con accesso a Gemini.");
      } else alert("Errore AI: " + e.message + "\n\nProva a essere più specifico o usa l'inserimento manuale.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- PARSER MANUALE (senza AI) per importare più rimborsi da testo incollato ---
  const [bulkText, setBulkText] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Helper: parse a simple italian date like "20 dicembre" or "21 novembre 2024" or "primo ottobre"
  const parseItalianDate = (text) => {
    if (!text || typeof text !== 'string') return null;
    const months = {
      'gennaio':'01','febbraio':'02','marzo':'03','aprile':'04','maggio':'05','giugno':'06',
      'luglio':'07','agosto':'08','settembre':'09','ottobre':'10','novembre':'11','dicembre':'12'
    };
    // Normalize
    const s = text.toLowerCase();

    // Match dd mm yyyy or primo mm yyyy
    const re = /(?:il\s*)?(\d{1,2}|primo|prima)\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/i;
    const m = s.match(re);
    if (!m) return null;
    let day = m[1];
    if (day === 'primo' || day === 'prima') day = '1';
    const month = months[m[2]];
    let year = m[3] || (new Date()).getFullYear().toString();

    // Adjust: if date appears to be in future but text hints 'in passato' or 'ritirato' we subtract a year
    const candidate = `${year}-${month}-${day.toString().padStart(2,'0')}`;
    try {
      const d = new Date(candidate);
      if (isNaN(d.getTime())) return null;
      return candidate;
    } catch (e) {
      return null;
    }
  };

  // Heuristic: extract products and metadata from free text
  const parseItemsFromText = (text) => {
    const results = [];
    if (!text) return results;
    const t = text.replace(/\s+/g, ' ');

    // Extract email and password
    const emailMatch = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;
    const pwdMatch = t.match(/password\s*(?:è|e'|:|is)?\s*([A-Za-z0-9!@#$%\^&*\-_.]{4,})/i);
    const password = pwdMatch ? pwdMatch[1] : null;

    // Known product keywords to help splitting (covers common patterns)
    const keywords = ['sverniciatore','stanley cup','cricut joy','cavetti','zaino','burlesque','soundcore','vasca','kit pulizia','scrubber','anlan','coppia','coccodrillo'];

    // Split by sentences/punctuation
    const parts = t.split(/\.|;|,|\n/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      const lower = part.toLowerCase();
      // Look for explicit markers
      if (/in arrivo|arrivo il|in arrivo il|in arrivo questo|ordinato|ritirato|in passato|ritiro|ritirare|ritiro va effettuato/i.test(lower)) {
        // attempt to find a date
        const date = parseItalianDate(part);

        // Find product name heuristically: part minus known markers
        let item = part.replace(/.*(?:in arrivo|arrivo il|in arrivo il|in arrivo questo|ordinato|ritirato|in passato|ritiro|ritirare|ritiro va effettuato).*/i, '').trim();
        // If item is empty, try extracting words around keywords
        if (!item) {
          for (const kw of keywords) {
            if (lower.includes(kw)) {
              const match = part.match(new RegExp(`(?:\\b(?:lo|la|il|una|un)\\s+)?(.{0,80}?${kw}.{0,80}?)$`, 'i'));
              if (match) { item = match[1].trim(); break; }
            }
          }
        }

        // If still empty, fallback to whole part
        if (!item) item = part;

        // Determine status if ritirato / consegnato
        const status = /ritirato|consegnato|arrivato/i.test(lower) ? 'Rimborsato' : 'Da Fare';

        // Detect pickup info
        let pickupCode = null;
        const pickupMatch = part.match(/locker\s*([^,\)\n]+)/i) || part.match(/mercatino\s*([^,\)\n]+)/i) || part.match(/via\s+[^,\)\n]+/i);
        if (pickupMatch) pickupCode = pickupMatch[0].trim();

        results.push({ item: item, email, password, arrivalDate: date || '', status, notes: part, pickupCode });
        continue;
      }

      // If sentence contains a keyword, add it
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          const date = parseItalianDate(part);
          const status = /ritirato|consegnato|ritirare/i.test(lower) ? 'Rimborsato' : 'Da Fare';
          let pickupCode = null;
          const pickupMatch = part.match(/locker\s*([^,\)\n]+)/i) || part.match(/mercatino\s*([^,\)\n]+)/i) || part.match(/via\s+[^,\)\n]+/i);
          if (pickupMatch) pickupCode = pickupMatch[0].trim();
          results.push({ item: part.trim(), email, password, arrivalDate: date || '', status, notes: part, pickupCode });
          break;
        }
      }
    }

    return results;
  };

  const handleBulkParse = async () => {
    if (!bulkText || !bulkText.trim()) return;
    setIsBulkProcessing(true);
    try {
      const items = parseItemsFromText(bulkText);
      if (!items || items.length === 0) {
        alert('Nessun rimborso riconosciuto dal testo. Prova a essere più dettagliato o usa il formato manuale.');
        return;
      }

      const nowISO = new Date().toISOString().split('T')[0];
      const newEntries = items.map(it => ({
        id: Date.now() + Math.random(),
        platform: '',
        item: it.item || 'Sconosciuto',
        email: it.email || '',
        password: it.password || '',
        amount: 0,
        arrivalDate: it.arrivalDate || '',
        windowDays: 30,
        requestDate: '',
        status: it.status || 'Da Fare',
        notes: it.notes || '',
        history: [{ id: Date.now(), text: it.notes || '', status: it.status || 'Da Fare', summary: 'Import manuale', timestamp: nowISO }],
        trackingCode: '',
        pickupCode: it.pickupCode || ''
      }));

      setRefunds(prev => [...(prev || []), ...newEntries]);
      setToastMessage(`Importati ${newEntries.length} rimborsi`);
      setTimeout(() => setToastMessage(null), 2200);
      setBulkText('');
      setMode('list');
    } catch (e) {
      console.error('Import manuale fallito', e);
      alert('Errore durante l\'import: ' + (e.message || e));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Analizza un aggiornamento testuale di assistenza e applica i campi estratti
  const analyzeRefundUpdate = async (refundId, text) => {
    if (!text || !text.trim()) return;
    if (!apiKey) return onApiKeyError();
    setIsAnalyzingUpdate(true);
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Sei un assistente che legge aggiornamenti di assistenza clienti e ne estrae i metadati.
Rispondi SOLO con JSON valido, niente testo aggiuntivo.
Formato desiderato:\n{\n  "status": "uno tra: Da Fare, Richiesto, Spedito, Rimborsato, Assistenza, In Attesa Amazon, Altro",\n  "notes": "breve riassunto dell'aggiornamento",\n  "amount": "numero (es. 10.87) se l'importo è menzionato, altrimenti vuoto",\n  "requestDate": "YYYY-MM-DD o vuoto",\n  "arrivalDate": "YYYY-MM-DD o vuoto",\n  "trackingCode": "codice tracking/spedizione se presente, altrimenti vuoto",\n  "pickupCode": "codice ritiro se presente (es. locker, punto ritiro), altrimenti vuoto",\n  "summary": "una riga riassuntiva corta"\n}\n
Testo da analizzare: """${text}"""\n`;

    try {
    const res = await callGroq(prompt, apiKey, MODEL_SMART);
      if (!res) throw new Error('No response from AI');

      let jsonStr = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
      const parsed = JSON.parse(jsonStr);

      let updatedRefund = null;
      setRefunds(prev => prev.map(r => {
        if (r.id !== refundId) return r;
        const newHistory = r.history ? [...r.history] : [];
        const entry = {
          id: Date.now(),
          text: text.trim(),
          status: parsed.status || r.status,
          summary: parsed.summary || parsed.notes || '',
          timestamp: (parsed.requestDate || parsed.date) ? (parsed.requestDate || parsed.date) : today
        };
        newHistory.unshift(entry);
        updatedRefund = {
          ...r,
          status: parsed.status || r.status,
          notes: parsed.notes || r.notes || '',
          amount: (parsed.amount !== undefined && parsed.amount !== null && parsed.amount !== '') ? parseFloat(parsed.amount) : r.amount,
          requestDate: parsed.requestDate || r.requestDate,
          arrivalDate: parsed.arrivalDate || r.arrivalDate,
          trackingCode: parsed.trackingCode || r.trackingCode || '',
          pickupCode: parsed.pickupCode || r.pickupCode || '',
          history: newHistory
        };
        return updatedRefund;
      }));

      // If user is currently editing this refund, update the edit form state as well
      if (newRefund?.id === refundId && updatedRefund) {
        setNewRefund(updatedRefund);
      }

      setUpdateText('');
      return true;
    } catch (err) {
      if (err.message === 'INVALID_KEY' || err.message === 'MISSING_KEY') onApiKeyError();
      else if (err.message && err.message.startsWith('MODEL_NOT_AVAILABLE')) {
        alert('Errore IA: il modello selezionato non è disponibile con la tua chiave Groq. Apri Impostazioni AI e scegli un modello accessibile (es. groq/compound o openai/gpt-oss-120b).');
      } else alert('Errore IA: ' + err.message);
      return false;
    } finally {
      setIsAnalyzingUpdate(false);
    }
  };

  // Aggiorna tutti gli stati basandosi sulla history via IA
  const autoUpdateAllStatuses = async () => {
    if (!apiKey) return onApiKeyError();
    if (!refunds || refunds.length === 0) return;
    setIsProcessing(true);
    for (const r of refunds) {
      try {
        const historyText = (r.history || []).map(h => `${h.timestamp||''}: ${h.status||''} - ${h.text||h.summary||''}`).join(' || ');
        const prompt = `Leggi lo storico seguente e determina lo stato corrente del reso/assistenza tra le seguenti opzioni: Da Fare, Richiesto, Spedito, Rimborsato, Assistenza, In Attesa Amazon.
Rispondi SOLO con JSON: {"status":"...","date":"YYYY-MM-DD","summary":"riassunto breve"}.
Storico:\n"""${historyText}\n${r.notes || ''}\n"""`;
        const res = await callGroq(prompt, apiKey, MODEL_SMART, 1024);
        if (!res) continue;
        let jsonStr = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];
        const parsed = JSON.parse(jsonStr);

        if (parsed.status && parsed.status !== r.status) {
          const entry = { id: Date.now() + Math.random(), text: parsed.summary || `Stato aggiornato a ${parsed.status} dal bot`, status: parsed.status, timestamp: parsed.date || (new Date().toISOString().split('T')[0]) };
          setRefunds(prev => prev.map(rr => rr.id === r.id ? { ...rr, status: parsed.status, history: [entry, ...(rr.history||[])] } : rr));
        }
      } catch (e) {
        console.warn('Auto update failed for', r.id, e);
      }
    }
    setIsProcessing(false);
  };

  const handleEdit = (item) => {
      setNewRefund(item);
      setMode('manual');
  };

  const addRefund = (e) => {
    e.preventDefault();
    if(!newRefund.item) return;
    
    const refundWithParsedAmount = { ...newRefund, amount: parseFloat(newRefund.amount) || 0 };

    if (newRefund.id) {
        setRefunds(refunds.map(r => r.id === newRefund.id ? refundWithParsedAmount : r));
    } else {
        setRefunds([...refunds, { ...refundWithParsedAmount, id: Date.now() }]);
    }
    
    setNewRefund({ id: null, platform: '', item: '', email: '', password: '', amount: '', amountCurrency: 'EUR', arrivalDate: '', estimatedDelivery: '', windowDays: 30, requestDate: '', status: 'Da Fare', notes: '', history: [], trackingCode: '', pickupCode: '', orderId: '', contactPhone: '', priority: 'normal', category: '', assignedTo: '', createdAt: '', lastUpdated: '' });
    setMode('list');
  };

  const deleteRefund = (id) => setRefunds(refunds.filter(r => r.id !== id));
  const saveArchivedRecordToServer = async (record) => {
    try {
      const res = await fetch('/api/store/pillars_refunds_archive_v1');
      let existing = [];
      if (res.ok) existing = await res.json() || [];
      existing = Array.isArray(existing) ? existing : [];
      existing.push(record);
      await fetch('/api/store/pillars_refunds_archive_v1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existing) });
      return true;
    } catch (e) {
      console.error('Failed to save archive to server', e);
      return false;
    }
  };

  const archiveRefund = async (id) => {
    // Open in-app modal instead of browser confirm/prompt
    const target = refunds.find(r => r.id === id);
    if (!target) return;
    const todayISO = new Date().toISOString().split('T')[0];
    setArchiveModal({ open: true, target, refundDate: target.arrivalDate || todayISO });
  };

  const confirmArchive = async () => {
    const { target, refundDate } = archiveModal;
    if (!target) { setArchiveModal({ open: false, target: null, refundDate: '' }); return; }
    const archiveRecord = { ...target, archivedAt: new Date().toISOString(), refundDate };

    try {
      // always update local archived state so UI has immediate control (and unarchive is possible)
      if (typeof setArchivedRefunds === 'function') {
        setArchivedRefunds(prev => [...(prev || []), archiveRecord]);
      }
      // attempt to persist to server as well
      await saveArchivedRecordToServer(archiveRecord);
    } catch (e) {
      console.error('archiveConfirm failed', e);
      // still continue: state is updated locally
    }

    // mark main refund as archived and add history entry
    setRefunds(prev => prev.map(r => r.id === target.id ? { ...r, archived: true, refundDate, history: [{ id: Date.now(), text: `Archiviato il ${refundDate}`, status: r.status, summary: 'Archiviato', timestamp: refundDate }, ...(r.history||[])] } : r));

    setArchiveModal({ open: false, target: null, refundDate: '' });
    setToastMessage('Rimborso archiviato.');
    setTimeout(() => setToastMessage(null), 2200);
  };

  const cancelArchive = () => {
    setArchiveModal({ open: false, target: null, refundDate: '' });
  };
  const togglePassVisibility = (id) => setShowPassword(prev => ({...prev, [id]: !prev[id]}));

  const updateStatus = (id, currentStatus) => {
    const flow = ['Da Fare', 'Richiesto', 'Spedito', 'Rimborsato', 'Assistenza'];
    const nextStatus = flow[(flow.indexOf(currentStatus) + 1) % flow.length];
    setRefunds(refunds.map(r => r.id === id ? { ...r, status: nextStatus, requestDate: nextStatus === 'Richiesto' && !r.requestDate ? new Date().toISOString().split('T')[0] : r.requestDate } : r));
  };

  const getDaysLeft = (date) => {
    if (!date) return 999;
    const deadline = new Date(date);
    deadline.setDate(deadline.getDate() + 30); 
    return Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  };

  const sortRefunds = (refundsToSort, sortBy) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const sorted = [...refundsToSort];

    switch (sortBy) {
      case 'last_modified':
        return sorted.sort((a, b) => {
          const lastUpdateA = a.history?.[0]?.timestamp ? new Date(a.history[0].timestamp) : new Date(0);
          const lastUpdateB = b.history?.[0]?.timestamp ? new Date(b.history[0].timestamp) : new Date(0);
          return lastUpdateB.getTime() - lastUpdateA.getTime();
        });
      case 'deadline':
        return sorted.sort((a, b) => {
          const daysLeftA = getDaysLeft(a.arrivalDate);
          const daysLeftB = getDaysLeft(b.arrivalDate);
          return daysLeftA - daysLeftB;
        });
      case 'platform':
        return sorted.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
      case 'amount_desc':
        return sorted.sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
      case 'amount_asc':
        return sorted.sort((a, b) => (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));
      case 'default':
      default:
        return sorted.sort((a, b) => {
          // 1. Urgency (days left) - ascending
          const daysLeftA = getDaysLeft(a.arrivalDate);
          const daysLeftB = getDaysLeft(b.arrivalDate);
          if (daysLeftA !== daysLeftB) {
            return daysLeftA - daysLeftB;
          }

          // 2. Priority
          const priorityA = priorityOrder[a.priority] ?? 1;
          const priorityB = priorityOrder[b.priority] ?? 1;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // 3. Last Modified (from history) - descending (newest first)
          const lastUpdateA = a.history?.[0]?.timestamp ? new Date(a.history[0].timestamp) : new Date(0);
          const lastUpdateB = b.history?.[0]?.timestamp ? new Date(b.history[0].timestamp) : new Date(0);
          return lastUpdateB.getTime() - lastUpdateA.getTime();
        });
    }
  };

  // Helper: determine total value of refunds that are "in ballo" (active)
  // Active refunds are those NOT in the closedStatuses list.

  const totalPotential = getActiveRefundsTotal(refunds);

  return (
    <div className={`mt-6 rounded-2xl border ${theme.border} p-6 bg-slate-900/40 relative overflow-hidden transition-all duration-500 ease-in-out`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`text-xs font-bold ${theme.text} flex items-center gap-2 tracking-widest`}>
            <Receipt size={14}/> Gestione rimborsi
          </h4>
          <button onClick={autoUpdateAllStatuses} title="Aggiorna stati via IA" className="text-[10px] text-slate-400 hover:text-white bg-slate-800/30 px-2 py-1 rounded ml-2">
            Aggiorna stati (AI)
          </button>
          <button onClick={() => setShowArchived(prev => !prev)} title="Mostra archiviati" className="text-[10px] text-slate-400 hover:text-white bg-slate-800/30 px-2 py-1 rounded ml-2">
            {showArchived ? 'Nascondi archiviati' : `Mostra archiviati (${(archivedRefunds || []).length})`}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-slate-800/50 text-slate-300 text-[10px] rounded border border-slate-700 p-1">
            <option value="default">Ordina per: Predefinito</option>
            <option value="last_modified">Ultima modifica</option>
            <option value="deadline">Scadenza</option>
            <option value="platform">Piattaforma</option>
            <option value="amount_desc">Importo (Decrescente)</option>
            <option value="amount_asc">Importo (Crescente)</option>
          </select>
          <span className={`text-xs font-bold ${theme.text} ml-2`}>€{Number.isFinite(totalPotential) ? totalPotential.toFixed(2) : '0.00'}</span>
        </div> 
      </div>

      {/* LISTA RIMBORSI */}
      {mode === 'list' && (
        <>
          {(refunds || []).length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">Nessun rimborso registrato</div>
          ) : (
            <div className="space-y-3">
              {sortRefunds((refunds || []).filter(r => !r.archived), sortOrder).map((r) => {
                const daysLeft = getDaysLeft(r.arrivalDate);
                const urgency = daysLeft <= 5 ? 'border-red-500/50 bg-red-950/20' : daysLeft <= 10 ? 'border-amber-500/30 bg-amber-950/10' : 'border-slate-700';
                
                return (
                  <div key={r.id} className={`p-4 rounded-xl border ${urgency} transition-all hover:border-slate-600`}>
                    {/* Header con negozio, oggetto, importo */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{r.platform || 'Sconosciuto'}</span>
                        <h5 className="text-sm font-bold text-white">{r.item}</h5>
                      </div>

                      <span className={`text-lg font-bold ${theme.text}`}>€{((v) => Number.isFinite(v) ? v.toFixed(2) : '0.00')(parseFloat(r.amount || 0))}</span>
                    </div>

                    {/* Archive/Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-slate-400">{r.refundDate && <>💶 Rimborsato: {r.refundDate}</>}</div>
                      <div className="flex items-center gap-4">
                        {!r.archived && r.status === 'Rimborsato' && (
                          <button onClick={() => archiveRefund(r.id)} className="text-slate-300 hover:text-amber-400 bg-slate-800/30 px-2 py-1 rounded">Archivia</button>
                        )}
                        <button onClick={() => handleEdit(r)} className="text-slate-500 hover:text-white">Modifica</button>
                      </div>
                    </div>

                    {/* Tracking e codici ritiro */}
                    {(r.trackingCode || r.pickupCode) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {r.trackingCode && (
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                            📦 {r.trackingCode}
                          </span>
                        )}
                        {r.pickupCode && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            🔑 Ritiro: {r.pickupCode}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Note */}
                    {r.notes && (
                      <div className="text-[9px] text-slate-400 mb-2 bg-slate-800/30 p-2 rounded border-l-2 border-slate-600 italic">
                        {r.notes}
                      </div>
                    )}

                    {/* Ultimo aggiornamento */}
                    {r.history?.[0] && (
                      <div className="text-[9px] text-slate-400 mb-2">
                        Ultimo aggiornamento: {r.history[0].summary || r.history[0].text} — {r.history[0].timestamp}
                      </div>
                    )}

                    {/* Login Section */}
                    <div className="bg-slate-900/50 rounded p-2 mb-2 border border-slate-800/50 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Mail size={10}/> {r.email || '-'}
                        {r.password && (
                          <div className="flex items-center gap-1 ml-2 cursor-pointer hover:text-white" onClick={() => togglePassVisibility(r.id)}>
                            {showPassword[r.id] ? r.password : '••••'}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleSmartLogin(r.email, r.password)} className={`text-[9px] px-2 py-1 rounded bg-${theme.accent}-500/10 text-${theme.accent}-400 hover:bg-${theme.accent}-500/20 font-bold transition-transform active:scale-95 flex items-center gap-1`}>
                        <LogIn size={10}/> Login
                      </button>
                    </div>

                    {/* Footer con date e azioni */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                      <div className="text-[9px] text-slate-500 flex gap-2">
                        {r.requestDate && <span>📤 Richiesto: {r.requestDate}</span>}
                        {r.arrivalDate && <span>📦 Arrivo: {r.arrivalDate}</span>}
                        {r.refundDate && <span>💶 Rimborsato: {r.refundDate}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(r.id, r.status)} className={`text-[9px] px-3 py-1 rounded-lg border font-bold transition-all hover:brightness-110 active:scale-95 ${r.status === 'Da Fare' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                          {r.status}
                        </button>
                        <button onClick={() => handleEdit(r)} className="text-slate-600 hover:text-blue-400 transition-colors active:scale-90"><Edit3 size={12}/></button>
                        {!r.archived && r.status === 'Rimborsato' && (
                          <button onClick={() => archiveRefund(r.id)} className="text-slate-600 hover:text-amber-400 transition-colors active:scale-90">Archivia</button>
                        )}
                        <button onClick={() => deleteRefund(r.id)} className="text-slate-600 hover:text-red-400 transition-colors active:scale-90"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Toast message */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-900 rounded-lg px-4 py-2 shadow-lg animate-in fade-in">{toastMessage}</div>
          )}
          
          {archiveModal.open && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={cancelArchive} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"><X size={18} /></button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Receipt size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Archivia rimborso</h3>
                    <p className="text-slate-400 text-xs">Conferma la data di rimborso per completare l'archiviazione.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Rimborso</label>
                    <div className="text-sm text-white font-semibold">{archiveModal.target?.item}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Data rimborso (YYYY-MM-DD)</label>
                    <input value={archiveModal.refundDate} onChange={e => setArchiveModal(prev => ({...prev, refundDate: e.target.value}))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-sm text-white" />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={cancelArchive} className="px-3 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600">Annulla</button>
                    <button onClick={confirmArchive} className="px-3 py-1 rounded bg-amber-400 text-slate-900 hover:brightness-95">Conferma archivia</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showArchived && (
            <div className="mt-4 p-3 rounded-lg border border-slate-700 bg-slate-900/10">
              <h6 className="text-base font-bold mb-3">Archivio rimborsi <span className="text-slate-400 text-sm">({(archivedRefunds || []).length})</span></h6>
              {(archivedRefunds || []).length === 0 ? (
                <div className="text-sm text-slate-400">Archivio vuoto</div>
              ) : (
                (archivedRefunds || []).map(a => (
                  <div key={a.id} className="flex justify-between items-center py-3 border-b border-slate-800">
                    <div>
                      <div className="text-white text-sm font-semibold">{a.item}</div>
                      <div className="text-xs text-slate-400 mt-1">Rimborsato: {a.refundDate} • Archivio: {a.archivedAt && a.archivedAt.split('T')[0]}</div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => unarchiveRefund(a.id)} className="text-slate-300 hover:text-emerald-400 bg-slate-800/30 px-3 py-1 rounded">Ripristina</button>
                      <a href={`/api/store/pillars_refunds_archive_v1`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-amber-400 bg-slate-800/30 px-3 py-1 rounded">Apri archivio</a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

        {/* FORM MANUALE */}
        {mode === 'manual' && (
          <form onSubmit={addRefund} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400">Nuovo rimborso</span>
              <button type="button" onClick={() => setMode('list')} className="text-slate-500 hover:text-white transition-transform active:scale-90"><X size={14}/></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Negozio" value={newRefund.platform} onChange={e=>setNewRefund({...newRefund, platform: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
                <input placeholder="Oggetto da rendere" value={newRefund.item} onChange={e=>setNewRefund({...newRefund, item: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Email account" value={newRefund.email} onChange={e=>setNewRefund({...newRefund, email: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={newRefund.password} 
                    onChange={e=>setNewRefund({...newRefund, password: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white pr-8" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="€ Importo" value={newRefund.amount} onChange={e=>setNewRefund({...newRefund, amount: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
                <input type="date" value={newRefund.arrivalDate} onChange={e=>setNewRefund({...newRefund, arrivalDate: e.target.value})} title="Data arrivo stimata" className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="📦 Tracking/Spedizione" value={newRefund.trackingCode||''} onChange={e=>setNewRefund({...newRefund, trackingCode: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
                <input placeholder="🔑 Codice ritiro" value={newRefund.pickupCode||''} onChange={e=>setNewRefund({...newRefund, pickupCode: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newRefund.requestDate||''} onChange={e=>setNewRefund({...newRefund, requestDate: e.target.value})} title="Data richiesta reso" className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
                <select value={newRefund.status} onChange={e=>setNewRefund({...newRefund, status: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white">
                  <option value="Da Fare">Da Fare</option>
                  <option value="Richiesto">Richiesto</option>
                  <option value="Spedito">Spedito</option>
                  <option value="Rimborsato">Rimborsato</option>
                  <option value="Assistenza">Assistenza</option>
                  <option value="In Attesa Amazon">In Attesa Amazon</option>
                </select>
            </div>
            <textarea placeholder="📝 Note (es. telefono, istruzioni, particolarità...)" value={newRefund.notes||''} onChange={e=>setNewRefund({...newRefund, notes: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white h-16" />
            {/* Se si sta modificando un rimborso esistente: campo per incollare aggiornamento assistenza e analizzarlo con l'AI */}
            {newRefund.id && (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400">Aggiornamento assistenza (incolla testo qui)</label>
                <textarea value={updateText} onChange={e=>setUpdateText(e.target.value)} placeholder="Es. 'Ho aperto reclamo A->Z oggi, attendo risposta da Amazon'" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white h-20" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => analyzeRefundUpdate(newRefund.id, updateText)} disabled={isAnalyzingUpdate} className="py-2 px-3 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded font-bold">
                    {isAnalyzingUpdate ? 'Analizzo...' : 'Analizza con AI'}
                  </button>
                  <button type="button" onClick={() => { setUpdateText(''); }} className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded">Cancella</button>
                </div>
              </div>
            )}

            <button type="submit" className={`w-full py-2 bg-${theme.accent}-600 hover:bg-${theme.accent}-500 text-white text-xs rounded font-bold transition-transform active:scale-95`}>Salva</button>
          </form>
        )}

        {/* FORM SMART */}
        {mode === 'smart' && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Sparkles size={12}/> AI import rimborsi</span>
              <button onClick={() => setMode('list')} className="text-slate-500 hover:text-white transition-transform active:scale-90"><X size={14}/></button>
            </div>
            <textarea 
              value={smartText} 
              onChange={e => setSmartText(e.target.value)}
              placeholder="Incolla qui il testo (es. 'Ho chiesto il reso per le cuffie su Amazon, account mario@gmail...')"
              className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-xs text-white h-24 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button 
              onClick={processSmartText}
              disabled={isProcessing || !smartText}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs rounded font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
              Analizza rimborsi
            </button>
          </div>
        )}

        {/* FORM BULK - import manuale senza AI */}
        {mode === 'bulk' && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">📥 Import testo (manuale)</span>
              <button onClick={() => setMode('list')} className="text-slate-500 hover:text-white transition-transform active:scale-90"><X size={14}/></button>
            </div>
            <textarea 
              value={bulkText || ''} 
              onChange={e => setBulkText(e.target.value)}
              placeholder="Incolla qui il testo da cui creare rimborsi (es. SMS, email, note)..."
              className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-xs text-white h-32 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleBulkParse}
                disabled={isBulkProcessing || !(bulkText || '').trim()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isBulkProcessing ? 'Importo...' : 'Importa testo'}
              </button>
              <button type="button" onClick={() => { setBulkText(''); }} className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[10px] text-slate-300 font-bold">Pulisci</button>
            </div>
            <div className="text-[11px] text-slate-400">Il parser manuale è euristico: prova a estrarre email, password, date, e nomi dei prodotti. Se non perfetto, correggi dal pannello manuale.</div>
          </div>
        )}

      {mode === 'list' && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => setMode('manual')} className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[10px] text-slate-300 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Plus size={12}/> Manuale
          </button>
          <button onClick={() => setMode('smart')} className="py-2 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-[10px] text-indigo-200 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Sparkles size={12}/> Smart AI
          </button>
          <button onClick={() => setMode('bulk')} className="py-2 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-200 font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Download size={12}/> Importa testo
          </button>
        </div>
      )}
    </div>
  );
};

// --- WIDGET 2: REACTION TESTER ---
const ReactionTester = ({ theme }) => {
  const [state, setState] = useState('idle');
  const [time, setTime] = useState(0);
  const timer = useRef(null);
  const startRef = useRef(0);

  const handleAction = () => {
    if (state === 'idle') {
      setState('waiting');
      timer.current = setTimeout(() => {
        startRef.current = Date.now();
        setState('ready');
      }, 1500 + Math.random() * 2000);
    } else if (state === 'waiting') {
      clearTimeout(timer.current);
      setState('idle');
      alert("Troppo presto!");
    } else if (state === 'ready') {
      setTime(Date.now() - startRef.current);
      setState('finished');
    } else {
      setState('idle');
    }
  };

  const color = state === 'waiting' ? 'bg-amber-900/50 text-amber-500' : 
                state === 'ready' ? 'bg-emerald-500 text-black scale-[1.02]' : 
                state === 'finished' ? 'bg-slate-800' : 'bg-slate-900/50';

  return (
    <div className={`mt-6 p-1 rounded-2xl border ${theme.border} overflow-hidden select-none transition-all duration-300`}>
      <div onClick={handleAction} className={`h-32 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${color} rounded-xl`}>
        {state === 'idle' && <><Crosshair className="mb-2"/> <span className="font-bold tracking-widest">Start test</span></>}
        {state === 'waiting' && <span className="animate-pulse font-bold">Aspetta...</span>}
        {state === 'ready' && <span className="text-3xl font-black animate-bounce">Clicca!</span>}
        {state === 'finished' && <><span className="text-4xl font-mono font-bold text-white">{time}ms</span><span className="text-xs opacity-50 mt-2">Riprova</span></>}
      </div>
    </div>
  );
};

// --- WIDGET 3: GARMIN REAL (MOCKED FALLBACK) ---
const GarminPanelReal = ({ theme }) => {
  const [config, setConfig] = useStorage('garmin_config_real', { token: '', secret: '' });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const saveConfig = () => {
    // Config is auto-saved by useStorage when state changes
    setIsConfiguring(false);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    // MOCK SIMULATION
    setTimeout(() => {
        setData({
            summary: { totalSteps: 8432, activeCalories: 450, restingHeartRate: 58, totalDistanceMeters: 5200 }
        });
        setLoading(false);
    }, 1500);
  };

  useEffect(() => { fetchData(); }, [config.token]);

  if (isConfiguring) {
    return (
      <div className={`mt-6 p-5 rounded-2xl border ${theme.border} bg-slate-900/40 animate-in fade-in zoom-in-95`}>
        <h4 className="text-xs font-bold uppercase text-blue-400 mb-4 flex items-center gap-2"><Watch size={14}/> Configurazione</h4>
        <input type="password" value={config.token} onChange={e => setConfig({...config, token: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white mb-2" placeholder="Token" />
        <button onClick={saveConfig} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase transition-transform active:scale-95">Salva</button>
      </div>
    );
  }

  return (
    <div className={`mt-6 bg-slate-900/40 p-5 rounded-2xl border ${theme.border} relative overflow-hidden transition-all duration-300 hover:shadow-lg`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className={`text-xs font-bold uppercase text-blue-400 flex items-center gap-2`}><Watch size={14}/> GARMIN CONNECT™</h4>
        <button onClick={() => setIsConfiguring(true)} className="text-slate-600 hover:text-white transition-transform active:scale-90"><Edit3 size={12}/></button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2"><Loader2 size={24} className="animate-spin text-blue-500"/></div>
      ) : data ? (
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-500">
             <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 transition-transform hover:scale-105">
                 <div className="text-[9px] text-slate-500 uppercase">Passi</div>
                 <div className="text-2xl font-bold text-white">{data.summary?.totalSteps}</div>
             </div>
             <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 transition-transform hover:scale-105">
                 <div className="text-[9px] text-slate-500 uppercase">Calorie</div>
                 <div className="text-2xl font-bold text-orange-400">{data.summary?.activeCalories}</div>
             </div>
          </div>
      ) : <div className="text-center text-slate-400 text-xs py-4">Nessun dato.</div>}
    </div>
  );
};

// --- WIDGET 4: UNIVAQ CONNECT (MOCKED) ---
const UnivaqPanel = ({ theme }) => {
    return (
        <div className={`mt-6 bg-slate-900/40 p-5 rounded-2xl border ${theme.border} transition-all duration-300 hover:shadow-lg`}>
             <div className="flex justify-between items-center mb-4">
                <h4 className={`text-xs font-bold uppercase ${theme.text} flex items-center gap-2`}><School size={14}/> UNIVAQ CONNECT</h4>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:scale-105 transition-transform">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Media</div>
                    <div className="text-2xl font-bold text-white">27.5</div>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:scale-105 transition-transform">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">CFU</div>
                    <div className="text-2xl font-bold text-white">145<span className="text-xs text-slate-500">/180</span></div>
                </div>
             </div>
             <div className="text-xs text-center text-slate-500">Dati sincronizzati (Demo)</div>
        </div>
    )
}

// --- WIDGET 5: ILARIA RELATIONSHIP OS (FULL ANALYSIS & PROJECTS + AI CHAT) ---
const IlariaSystem = ({ theme, apiKey, onApiKeyError }) => {
  const [analysis, setAnalysis] = useStorage('ilaria_os_data', null);
  const [projects, setProjects] = useStorage('ilaria_os_projects', []);
  const [ideas, setIdeas] = useStorage('ilaria_os_ideas', []);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, projects, ideas, upload, web_analysis, project_detail
  
  const [newProjectInput, setNewProjectInput] = useState('');
  const [newIdeaInput, setNewIdeaInput] = useState('');
  const [pastedResponse, setPastedResponse] = useState('');
  
  // === PROJECT DETAIL STATE ===
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectChatInput, setProjectChatInput] = useState('');
  const [projectChatLoading, setProjectChatLoading] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [offers, setOffers] = useState([]);
  const [checkingOffers, setCheckingOffers] = useState(false);

  const checkOffers = async (days=7) => {
    setCheckingOffers(true);
    try {
      const res = await fetch('/api/matched-betting/check-emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
      const j = await res.json();
      if (j && j.success) setOffers(j.offers || []);
      else {
        console.warn('Matched betting check failed', j);
      }
    } catch (e) { console.error('checkOffers error', e); }
    setCheckingOffers(false);
  }

  const startWebAnalysis = () => {
      setActiveView('web_analysis');
      // Open Gemini immediately
      const width = 600;
      const height = 800;
      const left = window.screen.width - width;
      window.open('https://gemini.google.com/?hl=it', 'GeminiWeb', `width=${width},height=${height},left=${left},top=0`);
  };

  const copyPrompt = () => {
      const prompt = `
Sei "Ilaria OS", un'IA dedicata ad analizzare la relazione tra me e Ilaria.
Analizza il file della chat che ho caricato (o il testo incollato).

ISTRUZIONI:
1. Analizza TUTTO il testo.
2. Riorganizza mentalmente la timeline.
3. Identifica "PROGETTI CONDIVISI" (es. Viaggi, Eventi, Obiettivi futuri, Cose da fare insieme).

Genera un JSON valido con questa struttura esatta:
{
  "mood_attuale": "Frase sullo stato attuale vs storico",
  "stats": { "messaggi_totali": "Numero approssimativo", "parola_chiave": "Parola ricorrente" },
  "topic_caldi": ["Topic 1", "Topic 2"],
  "consiglio_tattico": "Consiglio basato sulla storia",
  "progetti_rilevati": [
      { "title": "Titolo progetto", "status": "Idea/Pianificazione/In Corso", "progress": 10, "next_step": "Azione consigliata" }
  ],
  "nuove_idee": ["Idea regalo o attività da fare"]
}
`;
      navigator.clipboard.writeText(prompt);
      alert("Prompt copiato! Incollalo nella chat di Gemini insieme al file.");
  };

  const processPastedResponse = async () => {
      if(!pastedResponse.trim()) return;
      setIsAnalyzing(true);
      
      // TENTATIVO 1: Parsing Locale (Zero API calls - Evita errore 429)
      try {
          let jsonCandidate = null;
          
          // 1. Cerca blocchi markdown ```json ... ```
          const matchJson = pastedResponse.match(/```json\s*([\s\S]*?)\s*```/);
          if (matchJson) jsonCandidate = matchJson[1];
          
          // 2. Se non trova, cerca blocchi generici ``` ... ```
          if (!jsonCandidate) {
              const matchCode = pastedResponse.match(/```\s*([\s\S]*?)\s*```/);
              if (matchCode) jsonCandidate = matchCode[1];
          }

          // 3. Se non trova, cerca la struttura JSON più esterna { ... }
          if (!jsonCandidate) {
              const start = pastedResponse.indexOf('{');
              const end = pastedResponse.lastIndexOf('}');
              if (start !== -1 && end !== -1 && end > start) {
                  jsonCandidate = pastedResponse.substring(start, end + 1);
              }
          }

          if (jsonCandidate) {
              // Pulisci eventuali commenti o caratteri strani se necessario (JSON.parse è strict)
              const data = JSON.parse(jsonCandidate);
              
              // Applica i dati
              setAnalysis(data);
              if (data.progetti_rilevati) {
                  const newProjs = data.progetti_rilevati.map(p => ({...p, id: Date.now() + Math.random()}));
                  setProjects(prev => [...prev, ...newProjs]);
              }
              if (data.nuove_idee) {
                  const newIdeas = data.nuove_idee.map(i => ({id: Date.now() + Math.random(), text: i}));
                  setIdeas(prev => [...prev, ...newIdeas]);
              }

              setActiveView('dashboard');
              setPastedResponse('');
              setIsAnalyzing(false);
              return; // Successo locale!
          }
      } catch (localError) {
          console.warn("Parsing locale fallito:", localError);
          // Se fallisce il locale, procediamo con l'API ma attenzione al 429
      }

      // TENTATIVO 2: API Fallback (Solo se il locale fallisce)
      const prompt = `
      Ho un output grezzo da una chat AI. Estrai e pulisci il JSON valido da questo testo.
      Deve rispettare questa struttura:
      {
        "mood_attuale": string,
        "stats": { "messaggi_totali": string, "parola_chiave": string },
        "topic_caldi": string[],
        "consiglio_tattico": string,
        "progetti_rilevati": [{ "title": string, "status": string, "progress": number, "next_step": string }],
        "nuove_idee": string[]
      }

      TESTO DA ANALIZZARE (Troncato):
      ${pastedResponse.slice(0, 5000)} 
      `;

      try {
        const result = await callGroq(prompt, apiKey, MODEL_SMART);
        if (result) {
            const jsonString = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonString);
            setAnalysis(data);
            
            if (data.progetti_rilevati) {
                const newProjs = data.progetti_rilevati.map(p => ({...p, id: Date.now() + Math.random()}));
                setProjects(prev => [...prev, ...newProjs]);
            }
            if (data.nuove_idee) {
                const newIdeas = data.nuove_idee.map(i => ({id: Date.now() + Math.random(), text: i}));
                setIdeas(prev => [...prev, ...newIdeas]);
            }

            setActiveView('dashboard');
            setPastedResponse('');
        }
      } catch (err) {
          if (err.message === "INVALID_KEY" || err.message === "MISSING_KEY") onApiKeyError();
          else alert("Errore interpretazione (" + err.message + "). Assicurati che il testo incollato contenga un JSON valido.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // === PROGETTI V2: Con tasks, milestones, chat AI ===
  const addProject = (customProject = null) => {
      if(customProject) {
          // Aggiungi progetto completo con struttura estesa
          const project = {
              id: Date.now(),
              ...customProject,
              tasks: customProject.tasks || [],
              milestones: customProject.milestones || [],
              chatHistory: customProject.chatHistory || [],
              createdAt: new Date().toISOString()
          };
          setProjects([...projects, project]);
          return project;
      }
      
      if(!newProjectInput) return;
      const newProject = { 
          id: Date.now(), 
          title: newProjectInput, 
          status: 'Idea', 
          progress: 0, 
          next_step: 'Definire dettagli',
          description: '',
          tasks: [],
          milestones: [],
          chatHistory: [],
          createdAt: new Date().toISOString()
      };
      setProjects([...projects, newProject]);
      setNewProjectInput('');
      return newProject;
  };

  const updateProject = (projectId, updates) => {
      setProjects(projects.map(p => 
          p.id === projectId ? { ...p, ...updates } : p
      ));
      if(selectedProject?.id === projectId) {
          setSelectedProject(prev => ({ ...prev, ...updates }));
      }
  };

  // === TASK MANAGEMENT FOR PROJECTS ===
  const addProjectTask = (projectId, taskText, isAI = false) => {
      if(!taskText.trim()) return;
      const newTask = {
          id: Date.now(),
          text: taskText.trim(),
          completed: false,
          isAI,
          createdAt: new Date().toISOString()
      };
      updateProject(projectId, {
          tasks: [...(projects.find(p => p.id === projectId)?.tasks || []), newTask]
      });
  };

  const toggleProjectTask = (projectId, taskId) => {
      const project = projects.find(p => p.id === projectId);
      if(!project) return;
      const newTasks = project.tasks.map(t => 
          t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      const completedCount = newTasks.filter(t => t.completed).length;
      const progress = newTasks.length > 0 ? Math.round((completedCount / newTasks.length) * 100) : 0;
      updateProject(projectId, { tasks: newTasks, progress });
  };

  const deleteProjectTask = (projectId, taskId) => {
      const project = projects.find(p => p.id === projectId);
      if(!project) return;
      const newTasks = project.tasks.filter(t => t.id !== taskId);
      const completedCount = newTasks.filter(t => t.completed).length;
      const progress = newTasks.length > 0 ? Math.round((completedCount / newTasks.length) * 100) : 0;
      updateProject(projectId, { tasks: newTasks, progress });
  };

  // === CHAT AI FOR PROJECT ===
  const sendProjectChat = async (projectId) => {
      if(!projectChatInput.trim()) return;
      setProjectChatLoading(true);
      
      const project = projects.find(p => p.id === projectId);
      if(!project) return;
      
      const userMessage = { role: 'user', content: projectChatInput, timestamp: Date.now() };
      const newHistory = [...(project.chatHistory || []), userMessage];
      updateProject(projectId, { chatHistory: newHistory });
      setProjectChatInput('');
      
      // Build context for AI
      const tasksContext = project.tasks?.length > 0 
          ? project.tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n')
          : 'Nessun task definito';
      
      const milestonesContext = project.milestones?.length > 0
          ? project.milestones.map(m => `- ${m.title}: ${m.completed ? '✓ Completato' : m.progress + '%'}`).join('\n')
          : 'Nessun milestone definito';
      
      const chatContext = newHistory.slice(-6).map(m => `${m.role === 'user' ? 'Tu' : 'AI'}: ${m.content}`).join('\n');
      
      const prompt = `Sei un assistente AI per aiutare Fabrizio a realizzare un progetto speciale per la sua ragazza Ilaria.

PROGETTO: "${project.title}"
DESCRIZIONE: ${project.description || 'Non ancora definita'}
STATUS: ${project.status || 'Idea'} (${project.progress || 0}% completato)

TASK ATTUALI:
${tasksContext}

MILESTONES:
${milestonesContext}

CONVERSAZIONE RECENTE:
${chatContext}

NUOVO MESSAGGIO UTENTE: "${projectChatInput}"

ISTRUZIONI:
1. Rispondi in modo utile e specifico al messaggio
2. Se opportuno, suggerisci NUOVI TASK da aggiungere
3. Dai consigli pratici basati sul progetto specifico
4. Se il progetto riguarda creazione artigianale (es. gioielli), dai info tecniche

RISPONDI con JSON:
{
  "response": "La tua risposta conversazionale",
  "suggestedTasks": ["task1", "task2"] o null se non ci sono,
  "suggestedMilestones": [{"title": "milestone", "progress": 0}] o null,
  "updateStatus": "Nuovo status" o null,
  "updateNextStep": "Prossimo step" o null
}`;

      try {
          const result = await callGroq(prompt, apiKey, MODEL_SMART);
          let parsed;
          
          try {
              const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
              const match = jsonStr.match(/\{[\s\S]*\}/);
              parsed = JSON.parse(match ? match[0] : jsonStr);
          } catch (e) {
              parsed = { response: result };
          }
          
          const aiMessage = { role: 'assistant', content: parsed.response || result, timestamp: Date.now() };
          const finalHistory = [...newHistory, aiMessage];
          
          const updates = { chatHistory: finalHistory };
          
          // Apply AI suggestions
          if(parsed.suggestedTasks?.length > 0) {
              const currentTasks = project.tasks || [];
              const newTasks = parsed.suggestedTasks.map(t => ({
                  id: Date.now() + Math.random(),
                  text: t,
                  completed: false,
                  isAI: true,
                  createdAt: new Date().toISOString()
              }));
              updates.tasks = [...currentTasks, ...newTasks];
          }
          
          if(parsed.suggestedMilestones?.length > 0) {
              const currentMilestones = project.milestones || [];
              const newMilestones = parsed.suggestedMilestones.map(m => ({
                  id: Date.now() + Math.random(),
                  ...m,
                  completed: false
              }));
              updates.milestones = [...currentMilestones, ...newMilestones];
          }
          
          if(parsed.updateStatus) updates.status = parsed.updateStatus;
          if(parsed.updateNextStep) updates.next_step = parsed.updateNextStep;
          
          updateProject(projectId, updates);
          
      } catch (err) {
          if (err.message === "INVALID_KEY" || err.message === "MISSING_KEY") onApiKeyError();
          else {
              const errorMessage = { role: 'assistant', content: `⚠️ Errore AI: ${err.message}. Riprova.`, timestamp: Date.now() };
              updateProject(projectId, { chatHistory: [...newHistory, errorMessage] });
          }
      } finally {
          setProjectChatLoading(false);
      }
  };

  const openProjectDetail = (project) => {
      setSelectedProject(project);
      setActiveView('project_detail');
  };

  const addIdea = () => {
      if(!newIdeaInput) return;
      setIdeas([...ideas, { id: Date.now(), text: newIdeaInput }]);
      setNewIdeaInput('');
  };

  const deleteProject = (id) => {
      setProjects(projects.filter(p => p.id !== id));
      if(selectedProject?.id === id) {
          setSelectedProject(null);
          setActiveView('projects');
      }
  };
  const deleteIdea = (id) => setIdeas(ideas.filter(i => i.id !== id));
  
  const promoteIdeaToProject = (id) => {
      const idea = ideas.find(i => i.id === id);
      if(idea) {
          const newProj = addProject({
              title: idea.text,
              status: 'Idea',
              progress: 0,
              next_step: 'Iniziare',
              description: '',
              tasks: [],
              milestones: [],
              chatHistory: []
          });
          deleteIdea(id);
          if(newProj) openProjectDetail(newProj);
      }
  };

  return (
    <div className={`mt-6 bg-slate-900/40 p-6 rounded-2xl border ${theme.border} relative overflow-hidden min-h-[400px] transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${theme.accent}-500/10 blur-[50px] rounded-full`}></div>

      {/* HEADER & NAV */}
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h4 className={`text-sm font-bold uppercase ${theme.text} flex items-center gap-2`}>
          <Heart size={16}/> ILARIA OS
        </h4>
        <div className="flex flex-wrap items-center gap-1 bg-slate-950/50 rounded-lg p-1 border border-slate-800">
          {analysis && <button onClick={() => setActiveView('dashboard')} className={`p-1 rounded-md transition-all ${activeView==='dashboard'?'bg-pink-500/20 text-pink-400':'text-slate-500 hover:text-slate-300'}`} title="Dashboard"><BarChart3 size={14}/></button>}
          <button onClick={() => setActiveView('projects')} className={`p-1 rounded-md transition-all ${activeView==='projects' || activeView==='project_detail'?'bg-pink-500/20 text-pink-400':'text-slate-500 hover:text-slate-300'}`} title="Progetti"><Rocket size={14}/></button>
          <button onClick={() => setActiveView('ideas')} className={`p-1 rounded-md transition-all ${activeView==='ideas'?'bg-pink-500/20 text-pink-400':'text-slate-500 hover:text-slate-300'}`} title="Idee"><Lightbulb size={14}/></button>
          <button onClick={() => setActiveView('upload')} className={`p-1 rounded-md transition-all ${activeView==='upload' || activeView==='web_analysis'?'bg-pink-500/20 text-pink-400':'text-slate-500 hover:text-slate-300'}`} title="Analisi Chat"><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* VIEW: UPLOAD (START) */}
      {(!analysis || activeView === 'upload') && (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/30 animate-in fade-in">
            <div className="text-center space-y-4 p-4">
                <div className="p-3 bg-slate-900 rounded-full inline-block"><Sparkles size={24} className="text-pink-500"/></div>
                <h3 className="text-sm font-bold text-white">Analisi Relazione (Groq Compound)</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Analisi eseguita con il modello `groq/compound` (forzato dall'app). Fornisci una chiave Groq valida per usare il servizio.
                </p>
                <button onClick={startWebAnalysis} className={`px-6 py-2 bg-gradient-to-r ${theme.gradient} text-white text-xs font-bold uppercase rounded-lg shadow-lg transition-transform active:scale-95`}>
                    Avvia Procedura Web
                </button>
            </div>
        </div>
      )}

      {/* VIEW: WEB ANALYSIS STEPS */}
      {activeView === 'web_analysis' && (
          <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold">1</span>
                      <p className="text-xs text-slate-300">Si è aperta la finestra di Gemini. <b>Carica lì il file .txt della chat.</b></p>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold">2</span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 mb-1">Copia il prompt ottimizzato e incollalo nel servizio Groq (se richiesto).</p>
                        <button onClick={copyPrompt} className="text-[10px] px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600 transition-colors">Copia Prompt</button>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold">3</span>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-slate-300">Incolla qui sotto la risposta completa del modello (Groq Compound):</p>
                        <textarea 
                            value={pastedResponse}
                            onChange={e => setPastedResponse(e.target.value)}
                            placeholder="Incolla qui il testo generato da Gemini..."
                            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-pink-500 transition-colors"
                        />
                      </div>
                  </div>
              </div>
              
              <button 
                onClick={processPastedResponse}
                disabled={isAnalyzing || !pastedResponse}
                className={`w-full py-3 bg-gradient-to-r ${theme.gradient} text-white text-xs font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50`}
              >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                Interpreta Risultati
              </button>
          </div>
      )}

      {/* VIEW: DASHBOARD */}
      {activeView === 'dashboard' && analysis && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-pink-950/20 border border-pink-500/20 rounded-xl">
                <div className="text-[10px] text-pink-400 uppercase font-bold mb-2 flex items-center gap-2"><Activity size={12}/> Mood attuale</div>
                <p className="text-sm text-pink-100 italic leading-relaxed">"{analysis.mood_attuale}"</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Strategia</div>
                    <div className="text-xs text-slate-300">{analysis.consiglio_tattico}</div>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Hot topics</div>
                    <div className="flex flex-wrap gap-1">
                        {analysis.topic_caldi?.slice(0,3).map((t, i) => <span key={i} className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{t}</span>)}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* VIEW: PROJECTS */}
      {activeView === 'projects' && (
        <div className="space-y-3 animate-in slide-in-from-right-4 duration-300 h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
             <div className="flex gap-2 mb-2">
                <input value={newProjectInput} onChange={e=>setNewProjectInput(e.target.value)} placeholder="Nuovo progetto condiviso..." className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-3 text-xs text-white" onKeyDown={e => { if(e.key === 'Enter') addProject(); }} />
                <button onClick={() => addProject()} className="p-2 bg-pink-900/30 border border-pink-500/30 text-pink-300 rounded-lg" title="Aggiungi progetto"><Plus size={14}/></button>
            </div>

            {projects.length === 0 && (
                <div className="text-center py-6 space-y-4">
                    <div className="text-xs text-slate-500">Nessun progetto attivo.</div>
                    <button 
                        onClick={() => {
                            const anelloDIY = addProject({
                                title: "💍 Anello DIY per Ilaria",
                                description: "Creare un anello unico: oro cresciuto tramite elettrolisi + diamante lab-grown coltivato in casa",
                                status: "Ricerca",
                                progress: 0,
                                next_step: "Studiare processo elettrolisi oro",
                                tasks: [
                                    { id: 1, text: "Ricercare processo elettrolisi per recupero/crescita oro", completed: false, isAI: false, createdAt: new Date().toISOString() },
                                    { id: 2, text: "Calcolare costi materiali e attrezzature", completed: false, isAI: false, createdAt: new Date().toISOString() },
                                    { id: 3, text: "Studiare crescita diamanti HPHT/CVD casalinga", completed: false, isAI: false, createdAt: new Date().toISOString() },
                                    { id: 4, text: "Trovare fornitore semi di diamante", completed: false, isAI: false, createdAt: new Date().toISOString() },
                                    { id: 5, text: "Progettare design anello", completed: false, isAI: false, createdAt: new Date().toISOString() }
                                ],
                                milestones: [
                                    { id: 1, title: "🔬 Fase Ricerca", progress: 0, completed: false },
                                    { id: 2, title: "⚗️ Setup Elettrolisi", progress: 0, completed: false },
                                    { id: 3, title: "💎 Crescita Diamante", progress: 0, completed: false },
                                    { id: 4, title: "🔨 Forgiatura Anello", progress: 0, completed: false },
                                    { id: 5, title: "💍 Consegna a Ilaria", progress: 0, completed: false }
                                ],
                                chatHistory: []
                            });
                            if(anelloDIY) openProjectDetail(anelloDIY);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-pink-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 mx-auto hover:from-amber-500 hover:to-pink-500 transition-all active:scale-95"
                    >
                        <Gem size={14} /> Crea Progetto "Anello DIY"
                    </button>
                </div>
            )}

            {projects.map(p => (
                <div 
                    key={p.id} 
                    onClick={() => openProjectDetail(p)}
                    className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-pink-500/30 transition-colors group cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-slate-200">{p.title}</span>
                        <div className="flex items-center gap-2">
                            {p.tasks?.length > 0 && (
                                <span className="text-[9px] text-slate-500">
                                    {p.tasks.filter(t => t.completed).length}/{p.tasks.length} task
                                </span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                         <span className={`px-2 py-0.5 rounded uppercase font-bold ${p.status === 'In Corso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>{p.status || 'Idea'}</span>
                         <span className="flex items-center gap-1">
                             {p.chatHistory?.length > 0 && <MessageCircle size={10} className="text-pink-400" />}
                             Step: {p.next_step}
                         </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-fuchsia-500 h-full transition-all duration-500" style={{width: `${p.progress || 0}%`}}></div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* VIEW: IDEAS */}
      {activeView === 'ideas' && (
        <div className="space-y-3 animate-in slide-in-from-right-4 duration-300 h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex gap-2 mb-2">
                <input value={newIdeaInput} onChange={e=>setNewIdeaInput(e.target.value)} placeholder="Nuova idea o regalo..." className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-3 text-xs text-white" />
                <button onClick={addIdea} className="p-2 bg-pink-900/30 border border-pink-500/30 text-pink-300 rounded-lg"><Plus size={14}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                {ideas.map(i => (
                    <div key={i.id} className="p-3 bg-slate-950/30 border border-slate-800 rounded-xl relative group hover:bg-slate-900/50 transition-colors">
                        <p className="text-xs text-slate-300 mb-2">{i.text}</p>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => deleteIdea(i.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12}/></button>
                             <button onClick={() => promoteIdeaToProject(i.id)} className="text-pink-500 hover:text-pink-300" title="Promuovi a Progetto"><Rocket size={12}/></button>
                        </div>
                    </div>
                ))}
            </div>
            {ideas.length === 0 && <div className="text-center text-xs text-slate-500 py-4">Brainstorming vuoto. L'AI aggiungerà idee qui.</div>}
        </div>
      )}

      {/* VIEW: PROJECT DETAIL - Chat AI + Task Management */}
      {activeView === 'project_detail' && selectedProject && (
        <div className="space-y-3 animate-in slide-in-from-right-4 duration-300 h-[450px] flex flex-col">
            {/* Header con back button */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <button 
                    onClick={() => { setActiveView('projects'); setSelectedProject(null); }}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowRight size={14} className="rotate-180" />
                </button>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{selectedProject.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className={`px-2 py-0.5 rounded ${selectedProject.status === 'In Corso' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {selectedProject.status || 'Idea'}
                        </span>
                        <span>{selectedProject.progress || 0}% completato</span>
                    </div>
                </div>
                <Gem size={20} className="text-pink-400" />
                {selectedProject.id === 'betting' && (
                  <div className="ml-3 flex items-center gap-2">
                    <button onClick={() => checkOffers(7)} disabled={checkingOffers} className="text-[11px] px-2 py-1 rounded bg-indigo-700/20 text-indigo-300 hover:bg-indigo-700/30 transition-all">
                      {checkingOffers ? 'Controllo...' : 'Controlla offerte 7gg'}
                    </button>
                    <button onClick={() => checkOffers(30)} disabled={checkingOffers} className="text-[11px] px-2 py-1 rounded bg-indigo-700/10 text-indigo-300 hover:bg-indigo-700/20 transition-all">
                      30gg
                    </button>
                    <div className="ml-2">
                      <MatchedBettingLogin onConnected={(email)=>{ /* optionally re-check offers */ }} />
                    </div>
                  </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-pink-500 to-fuchsia-500 h-full transition-all duration-500" 
                    style={{width: `${selectedProject.progress || 0}%`}}
                />
            </div>

            {/* Milestones (horizontal scroll) */}
            {selectedProject.milestones?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedProject.milestones.map((m, i) => (
                        <div key={m.id || i} className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] ${m.completed ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                            {m.completed ? '✓' : '○'} {m.title}
                        </div>
                    ))}
                </div>
            )}

            {/* Two Column Layout: Tasks + Chat */}
            <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
                {/* LEFT: Task List */}
                <div className="flex flex-col bg-slate-950/30 rounded-xl border border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <ListTodo size={12} /> To-Do
                        </span>
                        <span className="text-[10px] text-slate-600">
                            {selectedProject.tasks?.filter(t => t.completed).length || 0}/{selectedProject.tasks?.length || 0}
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800 min-h-0">
                        {(!selectedProject.tasks || selectedProject.tasks.length === 0) && (
                            <div className="text-center text-[10px] text-slate-600 py-4">
                                Nessun task. Chatta con l'AI per generarne!
                            </div>
                        )}
                        {selectedProject.tasks?.map(task => (
                            <div 
                                key={task.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border group transition-all ${task.completed ? 'bg-slate-900/30 border-slate-800/50 opacity-60' : 'bg-slate-900/50 border-slate-700 hover:border-pink-500/30'}`}
                            >
                                <button 
                                    onClick={() => toggleProjectTask(selectedProject.id, task.id)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-pink-500 border-pink-500' : 'border-slate-600 hover:border-pink-400'}`}
                                >
                                    {task.completed && <CheckCircle2 size={10} className="text-white" />}
                                </button>
                                <span className={`flex-1 text-[11px] ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {task.text}
                                </span>
                                {task.isAI && <Sparkles size={10} className="text-amber-400" title="Suggerito dall'AI" />}
                                <button 
                                    onClick={() => deleteProjectTask(selectedProject.id, task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
                                >
                                  <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add task manually */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-slate-800">
                        <input 
                            value={newTaskInput}
                            onChange={e => setNewTaskInput(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter' && newTaskInput.trim()) {
                                    addProjectTask(selectedProject.id, newTaskInput);
                                    setNewTaskInput('');
                                }
                            }}
                            placeholder="Nuovo task..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-white"
                        />
                        <button 
                            onClick={() => {
                                if(newTaskInput.trim()) {
                                    addProjectTask(selectedProject.id, newTaskInput);
                                    setNewTaskInput('');
                                }
                            }}
                            className="p-1 bg-pink-900/30 border border-pink-500/30 text-pink-300 rounded"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>

                {/* RIGHT: AI Chat */}
                <div className="flex flex-col bg-slate-950/30 rounded-xl border border-slate-800 p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-pink-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Chat AI Progetto</span>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 min-h-0">
                        {(!selectedProject.chatHistory || selectedProject.chatHistory.length === 0) && (
                            <div className="text-center py-4">
                                <MessageCircle size={20} className="mx-auto mb-2 text-slate-600" />
                                <p className="text-[10px] text-slate-600">
                                    Parla con l'AI per ricevere<br/>consigli e generare task!
                                </p>
                            </div>
                        )}
                        {selectedProject.chatHistory?.map((msg, i) => (
                            <div 
                                key={i}
                                className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                                    msg.role === 'user' 
                                        ? 'bg-pink-900/20 border border-pink-500/20 text-pink-100 ml-4' 
                                        : 'bg-slate-800/50 border border-slate-700 text-slate-300 mr-4'
                                }`}
                            >
                                {msg.content}
                            </div>
                        ))}
                        {projectChatLoading && (
                            <div className="flex items-center gap-2 p-2 text-slate-400">
                                <Loader2 size={12} className="animate-spin" />
                                <span className="text-[10px]">L'AI sta pensando...</span>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-slate-800">
                        <textarea 
                            value={projectChatInput}
                            onChange={e => setProjectChatInput(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter' && !e.shiftKey && projectChatInput.trim()) {
                                    e.preventDefault();
                                    sendProjectChat(selectedProject.id);
                                }
                            }}
                            placeholder="Chiedi all'AI..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-white resize-none h-16"
                        />
                        <button 
                            onClick={() => sendProjectChat(selectedProject.id)}
                            disabled={projectChatLoading || !projectChatInput.trim()}
                            className="p-2 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white rounded disabled:opacity-50 transition-all active:scale-95"
                        >
                            {projectChatLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- DATA INIZIALE ---
const INITIAL_DATA = {
  wealth: [
    { id: 'market', title: 'MERCATI', icon: 'market', desc: 'Indici e sentiment', tasks: [{id:1, text:'Check S&P500 / BTC', completed:false}, {id:2, text:'News macroeconomia', completed:false}] },
    { id: 'betting', title: 'Matched betting', icon: 'betting', desc: 'Operatività giornaliera', tasks: [{id:1, text:'NinjaBet daily', completed:false}] },
    { id: 'refunds', title: 'Gestione rimborsi', icon: 'refunds', desc: 'Stato pratiche e scadenze', tasks: [] },
    { id: 'fabric', title: 'Skate Cover', icon: 'skate', desc: 'Acquisto tessuto tecnico', tasks: [] }
    ,{ id: 'daily_items', title: 'Oggettini', icon: 'package', desc: 'Oggetti quotidiani (presa magnetica, basetta, cavo)', tasks: [] }
  ],
  health: [
    { id: 'sprint', title: 'Velocità', icon: 'sprint', desc: 'Attivazione nervosa', tasks: [{id:1, text:'Riscaldamento', completed:false}, {id:2, text:'Scatti 30m', completed:false}] },
    { id: 'biohack', title: 'Salute', icon: 'biohack', desc: 'Integratori e abitudini', tasks: [{id:1, text:'Omega 3 + D3', completed:false}, {id:2, text:'Digiuno 16h', completed:false}] },
  ],
  brain: [
    { id: 'uni', title: 'Università', icon: 'university', desc: 'Studio e scadenze', tasks: [{id:1, text:'Pomodoro 25m', completed:false}] },
    { id: 'read', title: 'Lettura', icon: 'learning', desc: 'Formazione personale', tasks: [{id:1, text:'10 pagine', completed:false}] },
    { id: 'sora', title: 'Sora', icon: 'map-pin', desc: 'Cose da fare quando sei a Sora', tasks: [] },
  ],
  heart: [
    { id: 'partner', title: 'Partner', icon: 'love', desc: 'Tempo di qualità', tasks: [{id:1, text:'Messaggio buongiorno', completed:false}] },
    { id: 'finance', title: 'Fondo comune', icon: 'finance', desc: 'Obiettivi futuri', tasks: [{id:1, text:'Aggiorna budget', completed:false}] },
    { id: 'ilaria_pickups', title: "Da prendere per Ilaria", icon: 'package', desc: 'Cose da prendere a Sora e portare a Roma', tasks: [{id:1, text: 'Microscopio elettronico', completed: false}] },
  ]
};

  // --- GLOBAL INLINE EDITOR (Direct contentEditable - no popup) ---
// Undo/Redo history stored globally
const undoHistory = [];
const redoHistory = [];
const MAX_UNDO = 20;

const GlobalTextEditor = ({ data, setData }) => {
  const [enabled, setEnabled] = useState(false);
  const activeElementRef = useRef(null);
  const originalTextRef = useRef('');

  useEffect(() => {
    const onToggle = () => setEnabled(window.TEXT_EDIT_MODE === true);
    window.addEventListener('pillars-text-edit-toggle', onToggle);
    setEnabled(window.TEXT_EDIT_MODE === true);
    return () => window.removeEventListener('pillars-text-edit-toggle', onToggle);
  }, []);

  // Undo function - restore previous text
  const undoLastChange = async () => {
    if (undoHistory.length === 0) return;
    
    const lastChange = undoHistory.pop();
    const { original, replacement } = lastChange;
    
    // Add to redo history
    redoHistory.push(lastChange);
    if (redoHistory.length > MAX_UNDO) redoHistory.shift();
    
    try {
      // Revert in backend
      await fetch('/api/replace-text', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ original: replacement, replacement: original }) 
      });
      
      // Revert in database
      if (data && setData) {
        setData(prevData => {
          const newData = { ...prevData };
          for (const tab of ['wealth', 'health', 'brain', 'heart']) {
            if (newData[tab]) {
              newData[tab] = newData[tab].map(routine => {
                if (routine.title === replacement) return { ...routine, title: original };
                if (routine.desc === replacement) return { ...routine, desc: original };
                return routine;
              });
            }
          }
          return newData;
        });
      }
      
      // Update overrides
      try {
        const resp = await fetch('/api/store/pillars_text_overrides');
        let overrides = {};
        if (resp.ok) overrides = await resp.json();
        delete overrides[original];
        await fetch('/api/store/pillars_text_overrides', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(overrides) });
      } catch (e) { console.warn('Failed to update overrides on undo', e); }
      
      // Visual feedback
      console.log(`↩ Undo: "${replacement}" → "${original}"`);
      
    } catch (err) {
      console.error('Undo error', err);
      undoHistory.push(lastChange); // Re-add if failed
      redoHistory.pop();
    }
  };

  // Redo function - reapply undone change
  const redoLastChange = async () => {
    if (redoHistory.length === 0) return;
    
    const lastUndo = redoHistory.pop();
    const { original, replacement } = lastUndo;
    
    // Add back to undo history
    undoHistory.push(lastUndo);
    if (undoHistory.length > MAX_UNDO) undoHistory.shift();
    
    try {
      // Reapply in backend
      await fetch('/api/replace-text', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ original, replacement }) 
      });
      
      // Reapply in database
      if (data && setData) {
        setData(prevData => {
          const newData = { ...prevData };
          for (const tab of ['wealth', 'health', 'brain', 'heart']) {
            if (newData[tab]) {
              newData[tab] = newData[tab].map(routine => {
                if (routine.title === original) return { ...routine, title: replacement };
                if (routine.desc === original) return { ...routine, desc: replacement };
                return routine;
              });
            }
          }
          return newData;
        });
      }
      
      // Update overrides
      try {
        const resp = await fetch('/api/store/pillars_text_overrides');
        let overrides = {};
        if (resp.ok) overrides = await resp.json();
        overrides[original] = replacement;
        await fetch('/api/store/pillars_text_overrides', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(overrides) });
      } catch (e) { console.warn('Failed to update overrides on redo', e); }
      
      // Visual feedback
      console.log(`↪ Redo: "${original}" → "${replacement}"`);
      
    } catch (err) {
      console.error('Redo error', err);
      redoHistory.push(lastUndo); // Re-add if failed
      undoHistory.pop();
    }
  };

  const saveChanges = async (element) => {
    if (!element) return;
    const original = originalTextRef.current;
    const replacement = element.innerText?.trim();
    
    element.contentEditable = 'false';
    element.style.outline = '';
    element.style.background = '';
    element.style.padding = '';
    element.style.borderRadius = '';
    activeElementRef.current = null;

    if (original === replacement || !replacement) {
      element.innerText = original; // Restore if empty
      return;
    }

    // Clear redo history on new change
    redoHistory.length = 0;
    
    // Add to undo history
    undoHistory.push({ original, replacement, timestamp: Date.now() });
    if (undoHistory.length > MAX_UNDO) undoHistory.shift();

    try {
      await fetch('/api/replace-text', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ original, replacement }) 
      });
      
      // Update the main database
      if (data && setData) {
        setData(prevData => {
          const newData = { ...prevData };
          for (const tab of ['wealth', 'health', 'brain', 'heart']) {
            if (newData[tab]) {
              newData[tab] = newData[tab].map(routine => {
                if (routine.title === original) return { ...routine, title: replacement };
                if (routine.desc === original) return { ...routine, desc: replacement };
                return routine;
              });
            }
          }
          return newData;
        });
      }
      
      // Persist override
      try {
        const resp = await fetch('/api/store/pillars_text_overrides');
        let overrides = {};
        if (resp.ok) overrides = await resp.json();
        overrides[original] = replacement;
        await fetch('/api/store/pillars_text_overrides', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(overrides) });
      } catch (e) { console.warn('Failed to persist override', e); }
    } catch (err) {
      console.error('Save error', err);
      element.innerText = original;
    }
  };

  useEffect(() => {
    // Global Ctrl+Z/Ctrl+Y handler (works when edit mode is on and not actively editing)
    const handleGlobalUndoRedo = (e) => {
      if (!enabled) return;

      // If currently editing an element, Ctrl+Z should cancel that edit (restore original)
      if (activeElementRef.current) {
        if (e.ctrlKey && e.key === 'z') {
          e.preventDefault();
          try {
            activeElementRef.current.innerText = originalTextRef.current;
            saveChanges(activeElementRef.current);
          } catch (err) {
            console.warn('Failed to cancel current edit with Ctrl+Z', err);
          }
        }
        // While actively editing, do not trigger the global undo/redo stack
        return;
      }

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoLastChange();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoLastChange();
      }
    };
    
    document.addEventListener('keydown', handleGlobalUndoRedo);
    return () => document.removeEventListener('keydown', handleGlobalUndoRedo);
  }, [enabled, data, setData]);

  useEffect(() => {
    if (!enabled) {
      // Cleanup any active editing
      if (activeElementRef.current) {
        activeElementRef.current.contentEditable = 'false';
        activeElementRef.current.style.outline = '';
        activeElementRef.current.style.background = '';
        activeElementRef.current = null;
      }
      return;
    }

    const handleClick = (e) => {
      let el = e.target;
      if (!el) return;

      // Only allow editing on elements explicitly marked for editing. This prevents
      // accidental modification of the whole page when the user clicks somewhere.
      // Prefer elements that have `data-edit-id` (used by EditableText) or `data-allow-edit`.
      const editableAncestor = el.closest('[data-edit-id], [data-allow-edit]');
      const btnAncestor = el.closest('button');
      if (btnAncestor) {
        // If the click is inside a button, allow only if a marked editable ancestor exists
        if (editableAncestor) {
          el = editableAncestor;
        } else {
          return;
        }
      } else if (!editableAncestor) {
        // Not a button click and no explicit editable ancestor → ignore
        return;
      } else {
        el = editableAncestor;
      }

      // Skip if already editing this element
      if (el.contentEditable === 'true') return;

      // Skip inputs, textareas or explicitly excluded areas
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.closest('[data-no-edit]')) return;
      if (el.closest('[data-task-item]')) return;

      const text = el.innerText?.trim();
      if (!text || text.length > 200) return; // Skip empty or very long text blocks

      e.preventDefault();
      e.stopPropagation();

      // Save previous if exists
      if (activeElementRef.current && activeElementRef.current !== el) {
        saveChanges(activeElementRef.current);
      }

      // Make this element editable
      originalTextRef.current = text;
      activeElementRef.current = el;
      el.contentEditable = 'true';
      el.style.outline = '2px solid #3b82f6';
      el.style.background = 'rgba(59, 130, 246, 0.1)';
      el.style.padding = '2px 4px';
      el.style.borderRadius = '4px';
      el.focus();
      
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    const handleKeyDown = (e) => {
      if (!activeElementRef.current) return;
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveChanges(activeElementRef.current);
      }
      if (e.key === 'Escape') {
        activeElementRef.current.innerText = originalTextRef.current;
        saveChanges(activeElementRef.current);
      }
    };

    const handleBlur = (e) => {
      // Small delay to allow click on other elements
      setTimeout(() => {
        if (activeElementRef.current && !activeElementRef.current.contains(document.activeElement)) {
          saveChanges(activeElementRef.current);
        }
      }, 100);
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusout', handleBlur, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusout', handleBlur, true);
    };
  }, [enabled, data, setData]);

  return null; // No visible UI - editing happens directly inline
};// --- COMPONENTE PRINCIPALE ---
import SoraPlanner from './SoraPlanner';
const Pillars = () => {
  const [data, setData] = useStorage('pillars_db_v10', INITIAL_DATA);
  
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('idle'); // idle, checking, valid, error
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('groq/compound');
  
  // Cloud Sync State
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudConfig, setCloudConfig] = useStorage('pillars_cloud_config', { apiKey: '', binId: '' });
  const [cloudInfo, setCloudInfo] = useState({ lastSync: null });
  const [driveStatus, setDriveStatus] = useState({ hasServiceAccount: false, hasTokenFile: false });

  useEffect(() => {
    if (!showCloudModal) return;
    (async () => {
      try {
        const res = await fetch('/api/google-drive/status');
        if (res.ok) setDriveStatus(await res.json());
      } catch { /* ignore */ }
    })();
  }, [showCloudModal]);
  
  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskReason, setEditingTaskReason] = useState('');

  // === QUICK ADD SYSTEM - Input globale con classificazione AI ===
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddProcessing, setQuickAddProcessing] = useState(false);
  const [quickAddProposal, setQuickAddProposal] = useState(null); // Proposta AI da approvare
  const [quickAddResult, setQuickAddResult] = useState(null); // Risultato finale dopo approvazione

  // === WINDOW CLOSE HANDLER - Termina tutti i processi quando si chiude ===
  // NOTA: Disabilitato durante sviluppo per evitare shutdown accidentali
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Solo in produzione (non localhost)
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        navigator.sendBeacon('/api/shutdown', JSON.stringify({ source: 'window_close' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // VALIDAZIONE API KEY ALL'AVVIO - Mostra il modal ogni volta che l'app viene aperta
  useEffect(() => {
    const checkKey = async () => {
      if (!apiKey) {
        // Try server-side decrypted key before prompting user
        try {
          const res = await fetch('/api/groq-key');
          if (res.ok) {
            const j = await res.json();
            if (j && j.key) {
              setApiKey(j.key);
              setKeyStatus('checking');
              // continue to validate below
            } else {
              setKeyStatus('idle');
              return;
            }
          } else {
            // Locked / not decrypted on server
              setKeyStatus('idle');
            return;
          }
        } catch (e) {
          setKeyStatus('idle');
          return;
        }
      }

      setKeyStatus('checking');
      try {
        await callGroq("Rispondi OK", apiKey, MODEL_FAST, 50, 'low');
        setKeyStatus('valid');
      } catch (e) {
        if (e.message === "RATE_LIMIT") {
          console.warn("Key validation rate limited, assuming valid.");
          setKeyStatus('valid');
          return;
        }
        console.warn("Key validation failed", e);
        setKeyStatus('error');
      }
    };

    checkKey();
    // Pre-load available models and selected model for key modal
    (async () => {
      try {
        const mres = await fetch('/api/groq-models');
        if (mres.ok) {
          const j = await mres.json();
          if (j && Array.isArray(j.models)) setModels(j.models);
        }
      } catch (e) { /* ignore */ }

      try {
        const cres = await fetch('/api/groq-model-choice');
        if (cres.ok) {
          const j = await cres.json();
          if (j && j.model) setSelectedModel(j.model);
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const [activeTab, setActiveTab] = useState('wealth');
  const [activeRoutineId, setActiveRoutineId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [nexusOpen, setNexusOpen] = useState(false);
  const [nexusAnalysis, setNexusAnalysis] = useState(null);
  const [nexusLoading, setNexusLoading] = useState(false);
  const [examsOpen, setExamsOpen] = useState(false);
  const [christmasOpen, setChristmasOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activityLog, setActivityLog] = useStorage('pillars_activity_log', []);
  const [refunds, setRefunds, refundsLoaded] = useStorage('pillars_refunds_v3', []);
  const [archivedRefunds, setArchivedRefunds, archivedLoaded] = useStorage('pillars_refunds_archive_v1', []);
  const [holidayEnabled, setHolidayEnabled] = useStorage('holiday_theme_enabled', false);
  
  // === GOALS SYSTEM - Obiettivi a lungo termine per ogni pillar ===
  const [goals, setGoals] = useStorage('pillars_goals', {
    wealth: { 
      main: "Indipendenza finanziaria", 
      targets: ["Matched betting costante", "Gestire rimborsi efficacemente", "Investimenti passivi"],
      metrics: { monthlyTarget: 500, currentMonth: 0 }
    },
    health: { 
      main: "Diventare più veloce e forte", 
      targets: ["Sprint: migliorare tempo 100m", "Allenamento costante 4x/settimana", "Integratori quotidiani"],
      metrics: { weeklyWorkouts: 4, currentWeek: 0 }
    },
    brain: { 
      main: "Laurearmi", 
      targets: ["Studio quotidiano (pomodoro)", "Preparare esami in tempo", "Media > 27"],
      metrics: { dailyStudyMinutes: 120, cfu: 145, cfuTarget: 180 }
    },
    heart: { 
      main: "Relazione solida con Ilaria", 
      targets: ["Tempo di qualità insieme", "Comunicazione costante", "Progetti condivisi"],
      metrics: {}
    }
  });

  useEffect(() => {
    if (data[activeTab] && data[activeTab].length > 0 && !activeRoutineId) {
      setActiveRoutineId(data[activeTab][0].id);
    }
  }, [activeTab, data]);

  const currentTheme = THEMES[activeTab];
  const activeRoutine = data[activeTab]?.find(r => r.id === activeRoutineId) || data[activeTab]?.[0];

  // When the user navigates to a different view/tab/routine or opens a modal,
  // automatically disable edit mode and clean up any active per-item editing.
  useEffect(() => {
    if (!isEditMode) return;

    setIsEditMode(false);

    // Clear any task-level editing state
    if (typeof setEditingTaskId === 'function') setEditingTaskId(null);
    if (typeof setEditingTaskText === 'function') setEditingTaskText('');
    if (typeof setEditingTaskReason === 'function') setEditingTaskReason('');

    // Cleanup any active inline editing element
    if (typeof activeElementRef !== 'undefined' && activeElementRef && activeElementRef.current) {
      try {
        activeElementRef.current.contentEditable = 'false';
        activeElementRef.current.style.outline = '';
        activeElementRef.current.style.background = '';
      } catch (err) {
        // ignore
      }
      activeElementRef.current = null;
    }
  }, [activeTab, activeRoutineId]);

  // --- ACTIVITY LOG SYSTEM (defined early for use in task functions) ---
  const addToLog = (action, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      pillar: activeTab
    };
    setActivityLog(prev => {
      const newLog = [entry, ...prev];
      // Smart cleanup: keep last 100 entries, or entries from last 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const cleaned = newLog.filter((e, i) => i < 100 || new Date(e.timestamp).getTime() > sevenDaysAgo);
      return cleaned.slice(0, 200); // Hard cap at 200
    });
  };

  // --- LOGICHE (Task, Routine, DragDrop) identiche per stabilità ---
  const toggleTask = (rId, tId) => {
    const routine = data[activeTab].find(r => r.id === rId);
    const task = routine?.tasks?.find(t => t.id === tId);
    const newState = !task?.completed;
    
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: r.tasks.map(t => t.id === tId ? {...t, completed: newState} : t)} : r);
    setData({...data, [activeTab]: updated});
    
    addToLog(newState ? 'TASK_COMPLETED' : 'TASK_UNCOMPLETED', task?.text || 'Task');
  };

  const addTask = (rId, text, reason = null) => {
    if(!text.trim()) return;
    const cleanText = text.replace(/\.$/, '').trim(); // Remove trailing period
    const newTask = { id: Date.now(), text: cleanText, completed: false, reason: reason, isAiGenerated: !!reason, deadline: null };
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: [newTask, ...r.tasks]} : r);
    setData({...data, [activeTab]: updated});
    addToLog('TASK_ADDED', cleanText);
  };

  const addTaskWithReason = (rId, text, reason, isAi = false) => {
    if(!text.trim()) return;
    const cleanText = text.replace(/\.$/, '').trim();
    const cleanReason = reason?.replace(/\.$/, '').trim() || null;
    const newTask = { id: Date.now(), text: cleanText, completed: false, reason: cleanReason, isAiGenerated: isAi, deadline: null };
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: [newTask, ...r.tasks]} : r);
    setData({...data, [activeTab]: updated});
    addToLog(isAi ? 'AI_TASK' : 'TASK_ADDED', `${cleanText}${cleanReason ? ` (${cleanReason})` : ''}`);
  };

  const deleteTask = (rId, tId) => {
    const routine = data[activeTab].find(r => r.id === rId);
    const task = routine?.tasks?.find(t => t.id === tId);
    
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: r.tasks.filter(t => t.id !== tId)} : r);
    setData({...data, [activeTab]: updated});
    
    addToLog('TASK_DELETED', task?.text || 'Task');
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    setEditingTaskReason(task.reason || '');
  };

  const saveEditTask = (rId, tId) => {
    if (!editingTaskText.trim()) {
      cancelEditTask();
      return;
    }
    const cleanText = editingTaskText.replace(/\.$/, '').trim();
    const cleanReason = editingTaskReason?.replace(/\.$/, '').trim() || null;
    const updated = data[activeTab].map(r => 
      r.id === rId 
        ? {...r, tasks: r.tasks.map(t => t.id === tId ? {...t, text: cleanText, reason: cleanReason, isAiGenerated: !!cleanReason} : t)} 
        : r
    );
    setData({...data, [activeTab]: updated});
    addToLog('TASK_EDITED', `${cleanText}${cleanReason ? ` (${cleanReason})` : ''}`);
    cancelEditTask();
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
    setEditingTaskReason('');
  };

  

  const handleDeadlineChange = (rId, tId, newDeadline) => {
    const updated = data[activeTab].map(r => 
      r.id === rId 
        ? {...r, tasks: r.tasks.map(t => t.id === tId ? {...t, deadline: newDeadline} : t)} 
        : r
    );
    setData({...data, [activeTab]: updated});
    addToLog('DEADLINE_SET', `Task deadline set to ${newDeadline}`);
  };

  const sortTasksByDeadline = (rId) => {
    const routine = data[activeTab].find(r => r.id === rId);
    if (!routine) return;
    
    const sortedTasks = [...routine.tasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: sortedTasks} : r);
    setData({...data, [activeTab]: updated});
    addToLog('TASKS_SORTED', 'Tasks sorted by deadline');
  };

  const handleApiKeyError = () => {
      setKeyStatus('error');
      // modal removed: do not open modal on API key errors
  };

  // === QUICK ADD AI PROCESSOR ===
  // Carica contesto da Ilaria OS projects se disponibile
  const [ilariaProjects] = useStorage('ilaria_os_projects', []);
  
  const processQuickAdd = async () => {
    if (!quickAddText.trim()) return;
    if (!apiKey) { handleApiKeyError(); return; }
    
    setQuickAddProcessing(true);
    setQuickAddProposal(null);
    setQuickAddResult(null);
    
    // Build FULL context: routines + goals + Ilaria projects + recent activity
    const routinesContext = Object.entries(data).map(([pillar, routines]) => {
      const routineDetails = routines.map(r => {
        const taskList = r.tasks?.slice(0, 5).map(t => `${t.completed ? '✓' : '○'} ${t.text}`).join(', ') || 'vuota';
        return `  - "${r.id}": ${r.title} (${r.desc}) [${taskList}]`;
      }).join('\n');
      return `${THEMES[pillar]?.label} (${pillar}):\n${routineDetails}`;
    }).join('\n\n');
    
    // Goals context
    const goalsContext = Object.entries(goals).map(([pillar, g]) => 
      `${THEMES[pillar]?.label}: "${g.main}" - targets: ${g.targets?.join(', ') || 'nessuno'}`
    ).join('\n');
    
    // Ilaria projects context (from Ilaria OS)
    const ilariaContext = ilariaProjects?.length > 0 
      ? ilariaProjects.map(p => `- ${p.title} (${p.status || 'idea'}, ${p.progress || 0}%)`).join('\n')
      : 'Nessun progetto attivo';
    
    // Recent activity
    const recentActivity = activityLog?.slice(0, 10).map(l => 
      `${l.action}: ${l.details} (${THEMES[l.pillar]?.label || l.pillar})`
    ).join('\n') || 'Nessuna attività recente';
    
    const prompt = `Sei un assistente di life management. L'utente vuole aggiungere qualcosa al suo sistema.

=== STRUTTURA ATTUALE ===
${routinesContext}

=== OBIETTIVI DI VITA ===
${goalsContext}

=== PROGETTI SPECIALI (Ilaria OS) ===
${ilariaContext}

=== ATTIVITÀ RECENTE ===
${recentActivity}

=== PILLARS ===
- wealth: soldi, finanze, lavoro, investimenti, rimborsi
- health: fisico, sport, salute, benessere, allenamento
- brain: mente, studio, università, apprendimento, progetti tecnici
- heart: relazioni, Ilaria (fidanzata), famiglia, amici, progetti romantici

=== INPUT UTENTE ===
"${quickAddText}"

=== ISTRUZIONI ===
Analizza l'input considerando TUTTO il contesto sopra. Il task deve avere SENSO nel quadro generale.

1. Se riguarda un PROGETTO ESISTENTE in Ilaria OS (es. anello), collegalo a quello
2. Se riguarda un OBIETTIVO di vita, mettilo nella routine più pertinente
3. Se è qualcosa di NUOVO che merita una routine dedicata, creala
4. Spiega PERCHÉ questa classificazione ha senso nel contesto globale

RISPONDI con JSON:
{
  "pillar": "wealth|health|brain|heart",
  "action": "add_to_existing" | "create_routine",
  "routineId": "id se add_to_existing",
  "newRoutine": { "id": "...", "title": "...", "desc": "...", "icon": "default" } | null,
  "task": "task riformulato chiaro e azionabile",
  "reason": "spiegazione di come si collega al contesto globale (obiettivi, progetti, attività)",
  "relatedTo": "nome progetto o obiettivo correlato, se applicabile" | null
}`;
    
    try {
      const response = await callGroq(prompt, apiKey, MODEL_SMART, 1000);
      if (!response) throw new Error('No AI response');
      
      let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
      
      const parsed = JSON.parse(jsonStr);
      const pillar = parsed.pillar || 'brain';
      const taskText = parsed.task?.replace(/\.$/, '').trim() || quickAddText.trim();
      const reason = parsed.reason?.replace(/\.$/, '').trim() || 'Classificato automaticamente';
      const relatedTo = parsed.relatedTo || null;
      
      // Determine target routine (existing or new)
      let routineId, routineTitle, routineDesc;
      let isNewRoutine = false;
      
      if (parsed.action === 'create_routine' && parsed.newRoutine) {
        isNewRoutine = true;
        routineId = parsed.newRoutine.id || `routine_${Date.now()}`;
        routineTitle = parsed.newRoutine.title || 'Nuova Routine';
        routineDesc = parsed.newRoutine.desc || 'Creata automaticamente';
      } else {
        routineId = parsed.routineId || data[pillar]?.[0]?.id;
        const existingRoutine = data[pillar]?.find(r => r.id === routineId) || data[pillar]?.[0];
        routineTitle = existingRoutine?.title || 'Routine';
        routineDesc = existingRoutine?.desc || '';
      }
      
      // SET PROPOSAL - User must approve before saving
      setQuickAddProposal({
        originalText: quickAddText,
        pillar,
        pillarLabel: THEMES[pillar]?.label || pillar,
        routineId,
        routineTitle,
        routineDesc,
        isNewRoutine,
        task: taskText,
        reason,
        relatedTo,
        // Editable fields
        editedTask: taskText,
        editedRoutineTitle: routineTitle,
        editedRoutineDesc: routineDesc
      });
      
    } catch (err) {
      console.error('Quick Add error:', err);
      if (err.message === 'INVALID_KEY' || err.message === 'MISSING_KEY') handleApiKeyError();
      else {
        // Show error, let user retry or add manually
        setQuickAddProposal({
          error: true,
          originalText: quickAddText,
          errorMessage: err.message || 'Errore AI'
        });
      }
    } finally {
      setQuickAddProcessing(false);
    }
  };

  // === CONFIRM QUICK ADD PROPOSAL ===
  const confirmQuickAdd = () => {
    if (!quickAddProposal || quickAddProposal.error) return;
    
    const { pillar, routineId, isNewRoutine, editedTask, editedRoutineTitle, editedRoutineDesc, reason, relatedTo } = quickAddProposal;
    
    let targetRoutineId = routineId;
    
    // If new routine, create it first
    if (isNewRoutine) {
      const newRoutine = {
        id: routineId,
        title: editedRoutineTitle,
        desc: editedRoutineDesc,
        icon: 'default',
        tasks: []
      };
      setData(prev => ({
        ...prev,
        [pillar]: [...prev[pillar], newRoutine]
      }));
      targetRoutineId = routineId;
    }
    
    // Add the task
    const newTask = { 
      id: Date.now(), 
      text: editedTask, 
      completed: false, 
      reason: reason,
      relatedTo: relatedTo,
      isAiGenerated: true,
      quickAdded: true ,
      deadline: null
    };
    
    // Need small delay if we just created routine
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        [pillar]: prev[pillar].map(r => 
          r.id === targetRoutineId 
            ? { ...r, tasks: [newTask, ...(r.tasks || [])] } 
            : r
        )
      }));
    }, isNewRoutine ? 50 : 0);
    
    // Show result
    setQuickAddResult({
      pillar,
      pillarLabel: THEMES[pillar]?.label || pillar,
      routine: editedRoutineTitle,
      task: editedTask,
      reason,
      relatedTo,
      createdNewRoutine: isNewRoutine
    });
    
    // Log
    setActivityLog(prev => [{
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: isNewRoutine ? 'QUICK_ADD_NEW_ROUTINE' : 'QUICK_ADD',
      details: `"${editedTask}" → ${THEMES[pillar]?.label}/${editedRoutineTitle}${isNewRoutine ? ' (NUOVA)' : ''}${relatedTo ? ` [${relatedTo}]` : ''}`,
      pillar
    }, ...prev].slice(0, 200));
    
    // Clear
    setQuickAddText('');
    setQuickAddProposal(null);
  };

  // === REJECT/MODIFY PROPOSAL ===
  const rejectQuickAdd = () => {
    setQuickAddProposal(null);
    // Keep the text so user can retry
  };

  const addAiSuggestion = async (rId, routineTitle) => {
    setAiLoading(true);
    
    // Get existing tasks for context
    const routine = data[activeTab]?.find(r => r.id === rId);
    const existingTasks = routine?.tasks?.map(t => t.text).join(', ') || 'nessuno';
    const completedCount = routine?.tasks?.filter(t => t.completed).length || 0;
    const pendingCount = routine?.tasks?.filter(t => !t.completed).length || 0;
    
    // Get recent log for context
    const recentActions = activityLog
      .filter(l => l.pillar === activeTab)
      .slice(0, 5)
      .map(l => l.action)
      .join(', ') || 'nessuna attività recente';
    
    const prompt = `Sei un coach produttività. Genera UN suggerimento per la routine "${routineTitle}" (Categoria: ${currentTheme.label}).

CONTESTO:
- Task esistenti: ${existingTasks}
- Completati oggi: ${completedCount}, In attesa: ${pendingCount}
- Attività recenti: ${recentActions}

RISPONDI SOLO con JSON valido (nessun altro testo):
{"task": "descrizione breve max 5 parole SENZA punto finale", "reason": "perché questo task è utile ora, max 10 parole"}

ESEMPIO: {"task": "Revisiona appunti di ieri", "reason": "Consolida la memoria a lungo termine"}`;
    
    try {
        const response = await callGroq(prompt, apiKey, MODEL_SMART);
        if (response) {
            let parsed;
            try {
                // Clean and parse JSON
                const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(jsonStr);
            } catch {
                // Fallback: extract task text directly
                parsed = { task: response.trim().replace(/\.$/, ''), reason: 'Suggerito dall\'AI' };
            }
            
            // Remove trailing period from task
            const cleanTask = parsed.task?.replace(/\.$/, '').trim() || 'Task suggerito';
            const reason = parsed.reason?.replace(/\.$/, '').trim() || 'Migliora la produttività';
            
            addTaskWithReason(rId, cleanTask, reason, true);
            addToLog('AI_SUGGESTION', `${cleanTask} → ${reason}`);
        } else {
            addTaskWithReason(rId, "Revisione obiettivi", "Mantieni il focus sui goal", false);
        }
    } catch (e) {
        if (e.message === "INVALID_KEY" || e.message === "MISSING_KEY") handleApiKeyError();
        else addTaskWithReason(rId, "Analisi manuale", "Errore AI, rivedi manualmente", false);
    }
    setAiLoading(false);
  };

  // --- NEXUS ANALYSIS (Goal-oriented life analysis) ---
  const runNexusAnalysis = async () => {
    setNexusLoading(true);
    setNexusAnalysis(null);
    
    const pillars = ['wealth', 'health', 'brain', 'heart'];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // ===== 1. TASK STATS PER PILLAR =====
    const stats = {};
    let totalTasks = 0;
    let totalCompleted = 0;
    
    pillars.forEach(pillar => {
      const routines = data[pillar] || [];
      let pillarTasks = 0;
      let pillarCompleted = 0;
      const routineDetails = [];
      
      routines.forEach(routine => {
        const tasks = routine.tasks || [];
        const completed = tasks.filter(t => t.completed).length;
        pillarTasks += tasks.length;
        pillarCompleted += completed;
        routineDetails.push({
          title: routine.title,
          total: tasks.length,
          completed,
          pending: tasks.filter(t => !t.completed).map(t => t.text).slice(0, 3)
        });
      });
      
      stats[pillar] = {
        label: THEMES[pillar]?.label || pillar,
        total: pillarTasks,
        completed: pillarCompleted,
        percentage: pillarTasks > 0 ? Math.round((pillarCompleted / pillarTasks) * 100) : 0,
        routines: routineDetails,
        goal: goals[pillar]
      };
      
      totalTasks += pillarTasks;
      totalCompleted += pillarCompleted;
    });
    
    const overallPercentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    // ===== 2. ANALYZE ACTIVITY LOG FOR TRENDS =====
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentLog = activityLog.filter(e => new Date(e.timestamp).getTime() > sevenDaysAgo);
    
    // Activity per day per pillar
    const dailyActivity = {};
    const pillarActivity = { wealth: 0, health: 0, brain: 0, heart: 0 };
    const completionsPerPillar = { wealth: 0, health: 0, brain: 0, heart: 0 };
    
    recentLog.forEach(entry => {
      const day = entry.timestamp.split('T')[0];
      if (!dailyActivity[day]) dailyActivity[day] = { total: 0, completed: 0 };
      dailyActivity[day].total++;
      if (entry.action === 'TASK_COMPLETED') {
        dailyActivity[day].completed++;
        completionsPerPillar[entry.pillar] = (completionsPerPillar[entry.pillar] || 0) + 1;
      }
      pillarActivity[entry.pillar] = (pillarActivity[entry.pillar] || 0) + 1;
    });
    
    // Today's activity
    const todayLog = recentLog.filter(e => e.timestamp.startsWith(todayStr));
    const todayCompletions = todayLog.filter(e => e.action === 'TASK_COMPLETED').length;
    const todayActions = todayLog.length;
    
    // Find weakest and strongest pillar (by recent activity)
    const sortedPillars = Object.entries(completionsPerPillar).sort((a, b) => b[1] - a[1]);
    const strongestPillar = sortedPillars[0];
    const weakestPillar = sortedPillars[sortedPillars.length - 1];
    
    // Calculate trend (comparing this week to activity level)
    const avgDailyCompletions = Object.values(dailyActivity).reduce((sum, d) => sum + d.completed, 0) / Math.max(Object.keys(dailyActivity).length, 1);
    const trend = todayCompletions >= avgDailyCompletions ? 'positive' : todayCompletions > 0 ? 'neutral' : 'negative';
    
    // ===== 3. FETCH EXTRA DATA =====
    let refundsData = [];
    let garminData = null;
    let ilariaData = null;
    
    try {
      const refundsRes = await fetch('http://localhost:3001/api/store/pillars_refunds_v3');
      if (refundsRes.ok) refundsData = await refundsRes.json();
    } catch (e) { /* silent */ }
    
    try {
      const garminRes = await fetch('http://localhost:3001/api/garmin/today');
      if (garminRes.ok) garminData = await garminRes.json();
    } catch (e) { /* silent */ }
    
    try {
      const ilariaRes = await fetch('http://localhost:3001/api/store/ilaria_os_data');
      if (ilariaRes.ok) ilariaData = await ilariaRes.json();
    } catch (e) { /* silent */ }
    
    // Process refunds
    const urgentRefunds = refundsData.filter(r => {
      if (r.status === 'Completato' || r.status === 'Annullato') return false;
      return r.status === 'Da Fare' || r.status === 'Richiesto';
    });
    const totalRefundValue = getActiveRefundsTotal(refundsData);
    
    // ===== 4. BUILD GOAL-ORIENTED PROMPT =====
    const goalsContext = pillars.map(p => {
      const g = goals[p];
      const s = stats[p];
      return `**${s.label}** - Obiettivo: "${g.main}"
  - Target: ${g.targets.join(', ')}
  - Oggi: ${s.completed}/${s.total} task completati (${s.percentage}%)
  - Ultimi 7gg: ${completionsPerPillar[p]} task completati
  - Task pendenti: ${s.routines.flatMap(r => r.pending).slice(0, 2).join(', ') || 'nessuno'}`;
    }).join('\n\n');
    
    const trendContext = `
=== TREND SETTIMANALE ===
- Media completamenti/giorno: ${avgDailyCompletions.toFixed(1)}
- Oggi: ${todayCompletions} completamenti (${trend === 'positive' ? '↑ sopra media' : trend === 'neutral' ? '→ nella media' : '↓ sotto media'})
- Pillar più attivo: ${THEMES[strongestPillar[0]]?.label} (${strongestPillar[1]} completamenti)
- Pillar trascurato: ${THEMES[weakestPillar[0]]?.label} (${weakestPillar[1]} completamenti)
- Giorni attivi questa settimana: ${Object.keys(dailyActivity).length}/7`;

    const extraContext = [];
    if (urgentRefunds.length > 0) {
      extraContext.push(`RIMBORSI ATTIVI: ${urgentRefunds.length} pratiche, €${Number.isFinite(totalRefundValue) ? totalRefundValue.toFixed(2) : '0.00'} in ballo`);
    }
    if (garminData?.steps) {
      extraContext.push(`GARMIN: ${garminData.steps} passi, ${garminData.calories || '?'} kcal`);
    }
    if (ilariaData?.mood_attuale) {
      extraContext.push(`RELAZIONE: ${ilariaData.mood_attuale}`);
    }
    if (goals.brain?.metrics?.cfu) {
      extraContext.push(`UNIVERSITÀ: ${goals.brain.metrics.cfu}/${goals.brain.metrics.cfuTarget} CFU`);
    }
    
    const prompt = `Sei NEXUS, il coach AI personale di Fabrizio. Analizza i suoi OBIETTIVI DI VITA e il progresso di oggi (${today.toLocaleDateString('it-IT')}).

=== I MIEI OBIETTIVI ===
${goalsContext}
${trendContext}
${extraContext.length > 0 ? '\n=== DATI EXTRA ===\n' + extraContext.join('\n') : ''}

=== RISPONDI A QUESTE DOMANDE ===
Parla direttamente a Fabrizio (usa "tu"). Sii onesto e specifico.

1. **📊 EFFICIENZA OGGI** - Quanto sono stato efficiente oggi nel raggiungere i miei obiettivi? (valuta in base ai task completati vs obiettivi)

2. **⚠️ CARENZE** - In cosa sono stato carente oggi? Quale pillar ho trascurato e perché è un problema per il mio obiettivo?

3. **📈 TREND SETTIMANALE** - Come me la sto cavando ultimamente? Sto migliorando o peggiorando? 

4. **🎯 FOCUS CONSIGLIATO** - Su cosa mi dovrei concentrare ORA per massimizzare il progresso verso i miei goal?

Sii diretto, motivante ma onesto. Max 200 parole. Usa i dati specifici che vedi.`;

    try {
      // Fetch Anki stats (if available)
      let ankiData = null;
      try {
        const ares = await fetch('/api/anki-stats');
        if (ares.ok) {
          const aj = await ares.json();
          ankiData = (aj.stats && aj.stats.length > 0) ? aj.stats[0] : null;
        }
      } catch (e) { /* ignore */ }

      const aiInsight = await callGroq(prompt, apiKey, MODEL_SMART);
      setNexusAnalysis({
        stats,
        totalTasks,
        totalCompleted,
        overallPercentage,
        goals,
        trends: {
          todayCompletions,
          avgDaily: avgDailyCompletions,
          trend,
          strongestPillar: strongestPillar[0],
          weakestPillar: weakestPillar[0],
          activeDays: Object.keys(dailyActivity).length
        },
        refunds: {
          urgent: urgentRefunds.length,
          totalValue: totalRefundValue,
          items: urgentRefunds.slice(0, 3)
        },
        garmin: garminData,
        anki: ankiData,
        aiInsight: aiInsight || "Analisi completata."
      });
    } catch (e) {
      // Provide clearer error messages depending on the error type
      try { logError(e, 'NEXUS_ANALYSIS'); } catch (_) {}

      let aiMsg = "⚠️ Errore AI. Statistiche disponibili.";
      if (e.message === "INVALID_KEY" || e.message === "MISSING_KEY") {
        handleApiKeyError();
        aiMsg = "⚠️ API Key mancante o invalida. Configura Groq per insight AI.";
      } else if (e.message === "RATE_LIMIT") {
        aiMsg = "⚠️ Limite API raggiunto (rate limit). Riprova più tardi.";
      } else if (typeof e.message === 'string' && e.message.startsWith('API Error')) {
        aiMsg = `⚠️ Errore API Groq (${e.message}). Statistiche disponibili.`;
      } else if (e.message) {
        aiMsg = `⚠️ Errore AI: ${e.message}. Statistiche disponibili.`;
      }

      setNexusAnalysis({
        stats,
        totalTasks,
        totalCompleted,
        overallPercentage,
        goals,
        trends: {
          todayCompletions,
          avgDaily: avgDailyCompletions,
          trend,
          strongestPillar: strongestPillar[0],
          weakestPillar: weakestPillar[0],
          activeDays: Object.keys(dailyActivity).length
        },
        refunds: { urgent: urgentRefunds.length, totalValue: totalRefundValue, items: [] },
        garmin: garminData,
        aiInsight: aiMsg
      });
    }
    setNexusLoading(false);
  };

  // Trigger analysis when NEXUS opens
  useEffect(() => {
    if (nexusOpen && !nexusAnalysis && !nexusLoading) {
      runNexusAnalysis();
    }
  }, [nexusOpen]);

  const autoSortTasks = (rId) => {
    const routine = data[activeTab].find(r => r.id === rId);
    if(!routine) return;
    const sortedTasks = [...routine.tasks].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
    const updated = data[activeTab].map(r => r.id === rId ? {...r, tasks: sortedTasks} : r);
    setData({...data, [activeTab]: updated});
  };

  const deleteRoutine = (rId) => {
    // Custom confirm dialog logic could go here, using browser standard for now
    if(window.confirm('Eliminare protocollo?')) {
      const updated = data[activeTab].filter(r => r.id !== rId);
      setData({...data, [activeTab]: updated});
      if(updated.length > 0) setActiveRoutineId(updated[0].id); else setActiveRoutineId(null);
    }
  };

  const addRoutine = () => {
    if(!newRoutineName.trim()) return;
    const newRoutine = { id: Date.now().toString(), title: newRoutineName, icon: 'default', desc: 'Nuovo', tasks: [] };
    setData({...data, [activeTab]: [...data[activeTab], newRoutine]});
    setNewRoutineName('');
    setActiveRoutineId(newRoutine.id);
  };

  // Drag handlers
  const handleDragStart = (e, type, index, item, parentId = null) => { setDraggedItem({ type, index, item, parentId }); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, targetType, targetIndex, targetParentId = null) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== targetType) return;
    if (targetType === 'routine') {
      const list = [...data[activeTab]];
      const [removed] = list.splice(draggedItem.index, 1);
      list.splice(targetIndex, 0, removed);
      setData({...data, [activeTab]: list});
    }
    if (targetType === 'task' && draggedItem.parentId === targetParentId) {
      const routineIndex = data[activeTab].findIndex(r => r.id === targetParentId);
      if (routineIndex === -1) return;
      const newRoutines = [...data[activeTab]];
      const taskList = [...newRoutines[routineIndex].tasks];
      const [removed] = taskList.splice(draggedItem.index, 1);
      taskList.splice(targetIndex, 0, removed);
      newRoutines[routineIndex].tasks = taskList;
      setData({...data, [activeTab]: newRoutines});
    }
    setDraggedItem(null);
  };

  const progress = activeRoutine ? Math.round((activeRoutine.tasks.filter(t => t.completed).length / (activeRoutine.tasks.length || 1)) * 100) : 0;

  const renderSpecialWidget = () => {
    if (!activeRoutine) return null;
    switch(activeRoutine.id) {
      case 'sprint': return <ReactionTester theme={currentTheme} />;
      case 'biohack': return <GarminPanelReal theme={currentTheme} />;
      case 'partner': return <IlariaSystem theme={currentTheme} apiKey={apiKey} onApiKeyError={handleApiKeyError} />;
      case 'uni': return <UnivaqPanel theme={currentTheme} />;
      case 'refunds': return <RefundManager theme={currentTheme} apiKey={apiKey} onApiKeyError={handleApiKeyError} refunds={refunds} setRefunds={setRefunds} refundsLoaded={refundsLoaded} />;
      case 'fabric': return <FabricConfigurator theme={currentTheme} />;
      case 'daily_items': return <DailyItems isEditMode={isEditMode} />;
      case 'sora': return <SoraPlanner isEditMode={isEditMode} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bg} text-slate-200 font-sans transition-all duration-700 ease-out selection:bg-${currentTheme.accent}-500/30`}>
      {holidayEnabled && <Snowfall />}
      {/* API key modal removed - user requested it to not appear */}

      {/* CLOUD SYNC MODAL */}
      {showCloudModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Cloud size={20} className="text-emerald-400"/> Cloud Sync
                    </h3>
                    <button onClick={() => setShowCloudModal(false)} className="text-slate-500 hover:text-white">
                      <X size={20}/>
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-4">
                    Sincronizza i dati con JSONBin.io per accedere da Android senza PC acceso.
                  </p>

                  {/* Status */}
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
                    cloudConfig.apiKey 
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}>
                    {cloudConfig.apiKey ? (
                      <>
                        <Cloud size={16}/>
                        Cloud attivo • Ultimo sync: {cloudInfo?.lastSync ? new Date(cloudInfo.lastSync).toLocaleTimeString('it-IT') : 'mai'}
                      </>
                    ) : (
                      <>
                        <CloudOff size={16}/>
                        Cloud non configurato
                      </>
                    )}
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-slate-950/50 rounded-lg p-4 mb-4 text-xs space-y-2">
                    <p className="font-bold text-white">Setup (2 minuti):</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Vai su <a href="https://jsonbin.io" target="_blank" className="text-emerald-400 underline">jsonbin.io</a></li>
                      <li>Crea un account gratuito</li>
                      <li>Vai su API Keys → copia la "X-Master-Key"</li>
                      <li>Incollala qui sotto</li>
                    </ol>
                  </div>

                  <input 
                    type="password"
                    id="cloudApiKey"
                    placeholder="$2a$10$xxxxx (X-Master-Key)" 
                    defaultValue={cloudConfig.apiKey}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mb-3 focus:border-emerald-500 outline-none text-sm"
                  />
                  
                  <input 
                    type="text"
                    id="cloudBinId"
                    placeholder="Bin ID (opzionale, creato automaticamente)" 
                    defaultValue={cloudConfig.binId}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mb-4 focus:border-emerald-500 outline-none text-sm"
                  />

                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Esporta database</div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        try {
                          const res = await fetch('/api/export-db');
                          if (!res.ok) { alert('Export fallito'); return; }
                          const data = await res.json();
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'pillars_database_export.json'; a.click(); URL.revokeObjectURL(url);
                        } catch (e) { console.error(e); alert('Errore nell\'esportazione'); }
                      }} className="text-xs px-2 py-1 bg-slate-800/40 rounded">Esporta (Download)</button>

                      <button onClick={async () => {
                        if (!confirm('Caricare l\'intero DB su Google Drive e sovrascrivere se presente?')) return;
                        try {
                          const res = await fetch('/api/export-db', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ drive: true, filename: 'pillars_database_export.json' }) });
                          const j = await res.json();
                          if (res.ok) alert('Upload completato'); else alert('Upload Drive fallito: ' + (j && j.error ? j.error : 'errore'));
                        } catch (e) { console.error(e); alert('Errore caricamento su Drive'); }
                      }} className="text-xs px-2 py-1 bg-emerald-600/20 rounded">Carica su Google Drive (fab.savona@gmail.com)</button>
                    </div>
                    <div className="text-[11px] mt-2 text-slate-500">Per caricare su Google Drive: configura `GOOGLE_SERVICE_ACCOUNT_KEY` (service account) o salva un token OAuth via `/api/google-drive/save-token`.</div>
                    <div className="text-[11px] mt-2 text-slate-400">Drive configurato: {driveStatus.hasServiceAccount ? 'Service Account' : driveStatus.hasTokenFile ? 'OAuth token' : 'No'}</div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                        onClick={() => {
                          setCloudConfig({ apiKey: '', binId: '' });
                          setShowCloudModal(false);
                        }}
                        className="flex-1 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 font-bold rounded-lg transition-colors text-xs uppercase border border-red-500/30"
                    >
                        Disattiva
                    </button>
                    <button 
                        onClick={() => {
                            const apiKey = document.getElementById('cloudApiKey').value;
                            const binId = document.getElementById('cloudBinId').value;
                            setCloudConfig({ apiKey, binId });
                            setShowCloudModal(false);
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-xs uppercase"
                    >
                        Salva & Attiva
                    </button>
                  </div>
              </div>
          </div>
      )}

      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentTheme.gradient} z-50`}></div>
        <div className={`absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-${currentTheme.accent}-900/10 blur-[120px] rounded-full transition-all duration-1000`}></div>
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* --- SIDEBAR --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl transition-all duration-300 ease-out hover:border-white/10">
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white uppercase transition-all duration-300">
                    <EditableText id="main_title" defaultText="PILLARS" />
                </h1>
                <div className={`text-[10px] uppercase tracking-[0.2em] font-bold ${currentTheme.text} opacity-80 mt-1 animate-pulse`}>
                  <EditableText id={`status_${activeTab}`} defaultText={currentTheme.status} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => {
                    window.TEXT_EDIT_MODE = !window.TEXT_EDIT_MODE;
                    window.dispatchEvent(new Event('pillars-text-edit-toggle'));
                }} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" title="Attiva Modifica Testo" data-no-edit>
                    <Edit3 size={20} className={window.TEXT_EDIT_MODE ? "text-green-400" : "text-slate-400"} />
                </button>
                <button onClick={async () => {
                    try {
                      await fetch('http://localhost:3001/api/open-vscode', { method: 'POST' });
                    } catch (err) {
                      console.error("Failed to open VS Code", err);
                    }
                }} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" title="Apri VS Code" data-no-edit>
                    <Code size={20} className="text-indigo-400" />
                </button>
                <button onClick={() => setNexusOpen(true)} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" data-no-edit>
                    <span className="absolute inset-0 bg-cyan-500 blur opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></span>
                    <Cpu size={20} className="text-cyan-400" />
                </button>
                <button onClick={() => setExamsOpen(true)} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" title="Esami / Anki" data-no-edit>
                  <span className="absolute inset-0 bg-cyan-500 blur opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></span>
                  <School size={20} className="text-indigo-400" />
                </button>
                <button onClick={() => setHolidayEnabled(prev => !prev)} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" title="Tema natalizio" data-no-edit>
                  <Gift size={20} className={holidayEnabled ? 'text-red-400' : 'text-slate-400'} />
                </button>
                <button onClick={() => setChristmasOpen(true)} className="p-2 sm:p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all duration-300 hover:scale-110 active:scale-90 group relative" title="Regali di Natale" data-no-edit>
                  <CalendarHeart size={20} className="text-cyan-400" />
                </button>
                {/* API key modal removed */}
              </div>
            </div>

            {/* TABS CON ANIMAZIONE FLUIDA */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {Object.values(THEMES).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-2 group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out ${activeTab === t.id ? `bg-slate-800 border-${t.accent}-500 text-white scale-110 shadow-lg shadow-${t.accent}-500/20` : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-800/50 hover:scale-105'}`}>
                      {t.id === 'wealth' && <TrendingUp size={20}/>}
                      {t.id === 'health' && <Dumbbell size={20}/>}
                      {t.id === 'brain' && <Brain size={20}/>}
                      {t.id === 'heart' && <Heart size={20}/>}
                  </div>
                  <span className={`text-[9px] uppercase font-bold tracking-wider transition-colors duration-300 ${activeTab === t.id ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>
                      <EditableText id={`tab_label_${t.id}`} defaultText={t.label} />
                  </span>
                </button>
              ))}
            </div>

            {/* ROUTINES LIST */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">INTERFACCE</span>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  title={isEditMode ? 'Disattiva modalità modifica' : 'Attiva modalità modifica'}
                  aria-pressed={isEditMode}
                  className={`p-1.5 rounded-lg transition-all active:scale-95 ${isEditMode ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-500'}`}>
                  {isEditMode ? <CheckSquare size={14}/> : <Edit3 size={14}/>}
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto overflow-x-visible pr-4 scrollbar-thin scrollbar-thumb-slate-800/50 space-y-1">
                {data[activeTab]?.map((r, index) => (
                  <div 
                    key={r.id} 
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, 'routine', index, r)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'routine', index)}
                    className="relative group transition-all duration-300 ease-out hover:translate-x-1"
                  >
                    {holidayEnabled && <SantaHat />}
                    <div className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${activeRoutineId === r.id ? `bg-gradient-to-r from-slate-800 to-slate-900 border-${currentTheme.accent}-500/50 text-white shadow-lg` : 'bg-transparent border-transparent hover:bg-slate-800/30 text-slate-400'}`}>
                      <button 
                        onClick={() => setActiveRoutineId(r.id)}
                        className="flex-1 flex items-center gap-3 bg-transparent text-left"
                      >
                        {isEditMode && <GripVertical size={14} className="text-slate-600 cursor-grab" />}
                        <div className={`p-1.5 rounded-lg transition-colors ${activeRoutineId === r.id ? `bg-${currentTheme.accent}-500/20 text-${currentTheme.accent}-400` : 'bg-slate-800/50 text-slate-500'}`}>
                          <IconMap name={r.icon} size={16} />
                        </div>
                        <span data-allow-edit className="text-sm font-medium truncate">{r.title}</span>
                        {activeRoutineId === r.id && !isEditMode && <ArrowRight size={14} className={`ml-auto opacity-50 text-${currentTheme.accent}-400 animate-in fade-in slide-in-from-left-2`} />}
                      </button>
                      {isEditMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRoutine(r.id); }}
                          className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 active:scale-95"
                          aria-label={`Elimina ${r.title}`}
                          title={`Elimina ${r.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isEditMode && (
                  <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                    <input value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} placeholder="Nuovo protocollo..." className="flex-1 bg-slate-950/50 border border-slate-800 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-slate-600" />
                    <button onClick={addRoutine} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg active:scale-95"><Plus size={14}/></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN DASHBOARD --- */}
        <div className="lg:col-span-8">
          {activeRoutine ? (
            <div className={`h-full bg-slate-900/60 backdrop-blur-xl border ${currentTheme.border} rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-500 animate-in fade-in zoom-in-[0.99] duration-300`}>
              
              {/* HEADER ROUTINE */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-${currentTheme.accent}-500/10 text-${currentTheme.accent}-400 border border-${currentTheme.accent}-500/20 uppercase mb-3 transition-all hover:bg-${currentTheme.accent}-500/20`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                    ATTIVO
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">{activeRoutine.title}</h2>
                  <p className="text-slate-400 text-sm">{activeRoutine.desc}</p>
                </div>
                {activeRoutine.tasks?.length > 0 && (
                  <div className="text-right">
                    <div className="text-5xl font-mono font-bold text-white tracking-tighter transition-all">{progress}%</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">COMPLETATO</div>
                  </div>
                )}
              </div>

              {/* BARRA PROGRESSO FLUIDA - solo se ci sono task */}
              {activeRoutine.tasks?.length > 0 && (
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-8 border border-slate-800/50">
                  <div 
                    className={`h-full bg-gradient-to-r ${currentTheme.gradient} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]`} 
                    style={{width: `${progress}%`}}
                  ></div>
                </div>
              )}

              {/* TOOLBAR */}
              {isEditMode && (
                <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
                   <button 
                    disabled={aiLoading}
                    onClick={() => addAiSuggestion(activeRoutine.id, activeRoutine.title)} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-${currentTheme.accent}-500/10 text-${currentTheme.accent}-400 hover:bg-${currentTheme.accent}-500/20 border border-${currentTheme.accent}-500/20 transition-all uppercase disabled:opacity-50 disabled:cursor-wait active:scale-95`}
                   >
                     {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>} 
                     {aiLoading ? 'GENERANDO...' : 'SUGGERISCI'}
                   </button>
                   <button onClick={() => autoSortTasks(activeRoutine.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all uppercase active:scale-95">
                     <ArrowDownUp size={12}/> ORDINA
                   </button>
                   <button onClick={() => sortTasksByDeadline(activeRoutine.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all uppercase active:scale-95">
                     <CalendarClock size={12}/> ORDINA PER SCADENZA
                   </button>
                </div>
              )}

              {/* TASK LIST FLUIDA - nascosta se non ci sono task e non è edit mode */}
              {(activeRoutine.tasks?.length > 0 || isEditMode) && (
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-800/50">
                {activeRoutine.tasks.map((t, index) => (
                  <div 
                    key={t.id}
                    data-task-item="true"
                    draggable={isEditMode && editingTaskId !== t.id}
                    onDragStart={(e) => handleDragStart(e, 'task', index, t, activeRoutine.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'task', index, activeRoutine.id)}
                    className={`group p-4 rounded-xl border transition-all duration-300 ease-out hover:scale-[1.01] ${t.completed ? 'bg-slate-950/30 border-slate-800/50 opacity-60' : `bg-slate-900/40 border-slate-800 hover:border-${currentTheme.accent}-500/30 hover:bg-slate-800/60 shadow-sm`}`}
                  >
                    <div className="flex items-center gap-4">
                      {isEditMode && editingTaskId !== t.id && <GripVertical size={16} className="text-slate-600 cursor-grab shrink-0" />}

                      {/* Checkbox per completare - sempre visibile ma non in editing mode del task */}
                      {editingTaskId !== t.id && (
                        <button onClick={() => toggleTask(activeRoutine.id, t.id)} className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 ${t.completed ? `bg-${currentTheme.accent}-500 border-${currentTheme.accent}-500` : 'border-slate-600 hover:border-slate-400'}`}>
                          {t.completed && <CheckCircle2 size={14} className="text-slate-950 animate-in zoom-in duration-200" />}
                        </button>
                      )}
                      
                      {/* Task content - editing mode */}
                      {editingTaskId === t.id ? (
                        <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-200">
                          <input 
                            type="text"
                            value={editingTaskText}
                            onChange={(e) => setEditingTaskText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditTask(activeRoutine.id, t.id);
                              }
                              if (e.key === 'Escape') {
                                cancelEditTask();
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-blue-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            autoFocus
                          />
                          <div className="mt-2 w-full">
                            <input
                              type="text"
                              value={editingTaskReason}
                              placeholder="Descrizione breve (opzionale)"
                              onChange={(e) => setEditingTaskReason(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                            />
                          </div>
                          <button 
                            onClick={() => saveEditTask(activeRoutine.id, t.id)} 
                            className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all active:scale-90"
                            title="Salva (Invio)"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button 
                            onClick={cancelEditTask} 
                            className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all active:scale-90"
                            title="Annulla (Esc)"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        /* Task content - display mode */
                        <div 
                          onClick={() => !isEditMode && toggleTask(activeRoutine.id, t.id)} 
                          className={`flex-1 ${!isEditMode ? 'cursor-pointer' : ''}`}
                        >
                          <span className={`text-sm font-medium transition-colors duration-300 ${t.completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                            {t.text}
                          </span>
                          {t.reason && (
                            <div className={`flex items-center gap-1.5 mt-1 ${t.completed ? 'opacity-40' : 'opacity-70'}`}>
                              <Lightbulb size={10} className={`${t.isAiGenerated ? 'text-amber-400' : 'text-slate-500'}`} />
                              <span className={`text-[10px] italic ${t.isAiGenerated ? 'text-amber-400/80' : 'text-slate-500'}`}>
                                {t.reason}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons in edit mode */}
                      {isEditMode && editingTaskId !== t.id && (
                        <div className="flex items-center gap-1">
                           <div className="flex items-center gap-2">
                            <DeadlineCountdown deadline={t.deadline} />
                            <input 
                              type="date"
                              value={t.deadline || ''}
                              onChange={(e) => handleDeadlineChange(activeRoutine.id, t.id, e.target.value)}
                              className="bg-slate-800 border-slate-700 rounded-md p-1 text-xs text-white w-28"
                            />
                          </div>
                          <button 
                            onClick={() => startEditTask(t)} 
                            className="opacity-0 group-hover:opacity-100 text-blue-400 hover:bg-blue-400/10 p-2 rounded-lg transition-all active:scale-90"
                            title="Modifica task"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteTask(activeRoutine.id, t.id)} 
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all active:scale-90"
                            title="Elimina task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      </div>
                      {/* Deadline section visible in non-edit mode */}
                      {!isEditMode && (
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-800/50">
                          <DeadlineCountdown deadline={t.deadline} />
                          <input 
                              type="date"
                              value={t.deadline || ''}
                              onChange={(e) => handleDeadlineChange(activeRoutine.id, t.id, e.target.value)}
                              className="bg-slate-800/50 border-slate-700/50 rounded-md p-1 text-xs text-slate-400 w-28"
                            />
                        </div>
                      )}
                  </div>
                ))}
                
                {isEditMode && (
                  <div className="mt-4 pt-4 border-t border-slate-800 animate-in slide-in-from-top-2">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        addTask(activeRoutine.id, e.target.elements.taskName.value);
                        e.target.reset();
                      }} className="flex gap-2">
                        <input name="taskName" placeholder="Nuovo task..." className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors" autoFocus />
                        <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl font-bold transition-transform active:scale-95"><Plus/></button>
                      </form>
                  </div>
                )}
              </div>
              )}

              {/* SPECIAL WIDGETS */}
              <div className={`mt-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ${activeRoutine.tasks?.length > 0 ? 'pt-6 border-t border-slate-800/50' : ''}`}>
                {renderSpecialWidget()}
                {activeRoutine?.id === 'daily_items' && (
                  <div className="mt-6">
                    <DailyItems isEditMode={isEditMode} />
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 border border-slate-800 rounded-3xl p-10 border-dashed animate-pulse">
              <Sparkles className="mb-4 opacity-50" size={48} />
              <p className="text-sm uppercase tracking-widest font-bold opacity-70">SELEZIONA UN PROTOCOLLO</p>
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL TEXT EDITOR */}
      <GlobalTextEditor data={data} setData={setData} />

      {/* NEXUS OVERLAY - Real AI Analysis */}
      {nexusOpen && (
         <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <button onClick={() => { setNexusOpen(false); setNexusAnalysis(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"><X/></button>
             
             <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
               <Cpu size={16} className={nexusLoading ? 'animate-spin' : ''}/> NEXUS CORE
             </h3>
             
             {nexusLoading ? (
               <div className="flex flex-col items-center justify-center py-12 gap-4">
                 <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                 <p className="text-slate-400 text-sm animate-pulse">Analisi in corso...</p>
               </div>
             ) : nexusAnalysis ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[70vh] overflow-y-auto pr-2">
                 {/* Overall Stats */}
                 <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-slate-400 text-xs uppercase tracking-wider">Efficienza Globale</span>
                     <span className={`text-2xl font-bold ${
                       nexusAnalysis.overallPercentage >= 70 ? 'text-emerald-400' : 
                       nexusAnalysis.overallPercentage >= 40 ? 'text-amber-400' : 'text-red-400'
                     }`}>
                       {nexusAnalysis.overallPercentage}%
                     </span>
                   </div>
                   <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full transition-all duration-1000 ${
                         nexusAnalysis.overallPercentage >= 70 ? 'bg-emerald-500' : 
                         nexusAnalysis.overallPercentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                       }`}
                       style={{ width: `${nexusAnalysis.overallPercentage}%` }}
                     />
                   </div>
                   <p className="text-slate-500 text-xs mt-2">
                     {nexusAnalysis.totalCompleted}/{nexusAnalysis.totalTasks} task completati
                   </p>
                 </div>
                 
                 {/* Pillar Breakdown with Goals */}
                 <div className="grid grid-cols-2 gap-3">
                   {Object.entries(nexusAnalysis.stats).map(([key, stat]) => (
                     <div key={key} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 group hover:border-slate-600/50 transition-colors">
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-xs font-medium" style={{ color: THEMES[key]?.accent || '#94a3b8' }}>
                           {stat.label}
                         </span>
                         <span className="text-white text-sm font-bold">{stat.percentage}%</span>
                       </div>
                       <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                         <div 
                           className="h-full rounded-full transition-all duration-700"
                           style={{ 
                             width: `${stat.percentage}%`,
                             backgroundColor: THEMES[key]?.accent || '#64748b'
                           }}
                         />
                       </div>
                       {stat.goal && (
                         <p className="text-slate-500 text-[10px] truncate group-hover:text-slate-400 transition-colors">
                           🎯 {stat.goal.main}
                         </p>
                       )}
                     </div>
                   ))}
                 </div>
                 
                 {/* Weekly Trend */}
                 {nexusAnalysis.trends && (
                   <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                     <div className="flex items-center gap-2 mb-3">
                       <TrendingUp size={14} className="text-slate-400" />
                       <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">Trend Settimanale</span>
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                       <div className="text-center">
                         <div className={`text-lg font-bold ${
                           nexusAnalysis.trends.trend === 'positive' ? 'text-emerald-400' :
                           nexusAnalysis.trends.trend === 'neutral' ? 'text-amber-400' : 'text-red-400'
                         }`}>
                           {nexusAnalysis.trends.todayCompletions}
                         </div>
                         <div className="text-[10px] text-slate-500">Oggi</div>
                       </div>
                       <div className="text-center">
                         <div className="text-lg font-bold text-slate-300">
                           {nexusAnalysis.trends.avgDaily.toFixed(1)}
                         </div>
                         <div className="text-[10px] text-slate-500">Media/gg</div>
                       </div>
                       <div className="text-center">
                         <div className="text-lg font-bold text-slate-300">
                           {nexusAnalysis.trends.activeDays}/7
                         </div>
                         <div className="text-[10px] text-slate-500">Giorni attivi</div>
                       </div>
                     </div>
                     <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-[10px]">
                       <span className="text-emerald-400">
                         ↑ Forte: {THEMES[nexusAnalysis.trends.strongestPillar]?.label}
                       </span>
                       <span className="text-red-400">
                         ↓ Debole: {THEMES[nexusAnalysis.trends.weakestPillar]?.label}
                       </span>
                     </div>
                   </div>
                 )}
                 
                 {/* Extra Data Row: Refunds + Garmin */}
                 <div className="grid grid-cols-2 gap-3">
                   {/* Refunds Alert */}
                   {nexusAnalysis.refunds && nexusAnalysis.refunds.urgent > 0 && (
                     <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-500/30">
                       <div className="flex items-center gap-2 mb-2">
                         <AlertCircle size={12} className="text-amber-400" />
                         <span className="text-amber-400 text-xs font-medium uppercase">Rimborsi Urgenti</span>
                       </div>
                       <div className="text-white text-lg font-bold">{nexusAnalysis.refunds.urgent}</div>
                       <p className="text-amber-400/70 text-xs">€{nexusAnalysis.refunds.totalValue.toFixed(2)} in ballo</p>
                     </div>
                   )}
                   
                   {/* Garmin Data */}
                   {nexusAnalysis.garmin ? (
                     <div className="bg-blue-950/30 rounded-xl p-3 border border-blue-500/30">
                       <div className="flex items-center gap-2 mb-2">
                         <Watch size={12} className="text-blue-400" />
                         <span className="text-blue-400 text-xs font-medium uppercase">Garmin</span>
                       </div>
                       <div className="text-white text-lg font-bold">{nexusAnalysis.garmin.steps || '—'}</div>
                       <p className="text-blue-400/70 text-xs">passi oggi</p>
                     </div>
                   ) : (
                     <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 border-dashed">
                       <div className="flex items-center gap-2 mb-2">
                         <Watch size={12} className="text-slate-500" />
                         <span className="text-slate-500 text-xs font-medium uppercase">Garmin</span>
                       </div>
                       <p className="text-slate-600 text-xs">Non configurato</p>
                     </div>
                   )}
                 </div>
                 
                 {/* AI Insight */}
                 <div className="bg-gradient-to-br from-cyan-950/50 to-slate-900 rounded-2xl p-4 border border-cyan-500/20">
                   <div className="flex items-center gap-2 mb-3">
                     <Sparkles size={14} className="text-cyan-400" />
                     <span className="text-cyan-400 text-xs uppercase tracking-wider font-medium">Deep Analysis</span>
                   </div>
                   <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                    {nexusAnalysis.aiInsight.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-cyan-300">{part}</strong> : part
                    )}
                    {/* If the AI indicates a missing API key, show quick actions */}
                    {/API Key|API Key mancante|Chiave/i.test(nexusAnalysis.aiInsight) && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={async () => {
                          try {
                            const res = await fetch('/api/groq-key/load-plaintext', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                            if (res.ok) {
                              const j = await res.json();
                              if (j && j.key) {
                                setApiKey(j.key);
                                // Trigger immediate re-run of analysis
                                runNexusAnalysis();
                              } else {
                                alert('Nessuna chiave server trovata.');
                              }
                            } else {
                              const txt = await res.text();
                              alert('Nessuna chiave server trovata.');
                              console.warn('Load plaintext failed', txt);
                            }
                          } catch (e) { console.error(e); alert('Errore nel leggere la chiave server'); }
                        }} className="py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs">Usa chiave server</button>
                      </div>
                    )}
                   </div>
                 </div>
                 
                 {/* Refresh Button */}
                 <button 
                   onClick={runNexusAnalysis}
                   className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                 >
                   <RefreshCw size={14} /> Aggiorna Analisi
                 </button>
               </div>
             ) : (
               <div className="text-slate-400 text-sm">Preparazione analisi...</div>
             )}
           </div>
         </div>
      )}

      {/* EXAMS / ANKI OVERLAY */}
      {examsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <button onClick={() => { setExamsOpen(false); }} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"><X/></button>
            <h3 className="text-indigo-400 font-mono text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
              <School size={16} /> ESAMI & ANKI
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <ExamCountdown />
              </div>
              <div>
                <AnkiStats />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHRISTMAS GIFTS OVERLAY */}
      {christmasOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-3xl rounded-3xl p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setChristmasOpen(false); }} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"><X/></button>
            <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><CalendarHeart size={16} /> REGALI DI NATALE</h3>
            <ChristmasGifts />
          </div>
        </div>
      )}

      {/* === QUICK ADD FLOATING BUTTON === */}
      <button
        onClick={() => { setQuickAddOpen(true); setQuickAddResult(null); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95"
        title="Quick Add - Aggiungi task velocemente"
      >
        <Plus size={28} />
      </button>

      {/* === QUICK ADD MODAL === */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { setQuickAddOpen(false); setQuickAddResult(null); setQuickAddProposal(null); setQuickAddText(''); }} 
              className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Wand2 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Quick Add</h3>
                <p className="text-slate-400 text-xs">
                  {!quickAddProposal && !quickAddResult ? 'Scrivi qualsiasi cosa, l\'AI la classifica' : 
                   quickAddProposal ? 'Rivedi e approva la proposta' : 'Aggiunto con successo!'}
                </p>
              </div>
            </div>
            
            {/* FASE 1: Input */}
            {!quickAddProposal && !quickAddResult && (
              <div className="space-y-4">
                <textarea
                  value={quickAddText}
                  onChange={e => setQuickAddText(e.target.value)}
                  placeholder="Es: 'cercare gemme per anello ilaria', 'rimborso olio motul amazon', 'studiare per esame analisi'..."
                  className="w-full h-28 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && quickAddText.trim() && !quickAddProcessing) {
                      e.preventDefault();
                      processQuickAdd();
                    }
                  }}
                />
                
                <button
                  onClick={processQuickAdd}
                  disabled={quickAddProcessing || !quickAddText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {quickAddProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analizzo contesto...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Analizza con AI
                    </>
                  )}
                </button>
                
                <p className="text-slate-500 text-[10px] text-center">
                  L'AI analizzerà obiettivi, progetti e attività per classificare correttamente
                </p>
              </div>
            )}

            {/* FASE 2: Proposta AI da approvare/modificare */}
            {quickAddProposal && !quickAddProposal.error && !quickAddResult && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                {/* Original text */}
                <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Hai scritto:</span>
                  <p className="text-slate-300 text-sm mt-1">"{quickAddProposal.originalText}"</p>
                </div>

                {/* AI Proposal - Editable */}
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-indigo-400 font-bold text-xs uppercase">Proposta AI</span>
                  </div>
                  
                  {/* Task - Editable */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase mb-1 block">Task</label>
                    <input
                      type="text"
                      value={quickAddProposal.editedTask}
                      onChange={e => setQuickAddProposal(prev => ({ ...prev, editedTask: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                    />
                  </div>
                  
                  {/* Pillar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase">Pillar:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      quickAddProposal.pillar === 'wealth' ? 'bg-emerald-500/20 text-emerald-400' :
                      quickAddProposal.pillar === 'health' ? 'bg-red-500/20 text-red-400' :
                      quickAddProposal.pillar === 'brain' ? 'bg-indigo-500/20 text-indigo-400' :
                      'bg-pink-500/20 text-pink-400'
                    }`}>
                      {quickAddProposal.pillarLabel}
                    </span>
                  </div>
                  
                  {/* Routine - Editable if new */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-2">
                      Routine
                      {quickAddProposal.isNewRoutine && (
                        <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold">Nuova</span>
                      )}
                    </label>
                    {quickAddProposal.isNewRoutine ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={quickAddProposal.editedRoutineTitle}
                          onChange={e => setQuickAddProposal(prev => ({ ...prev, editedRoutineTitle: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500"
                          placeholder="Nome routine"
                        />
                        <input
                          type="text"
                          value={quickAddProposal.editedRoutineDesc}
                          onChange={e => setQuickAddProposal(prev => ({ ...prev, editedRoutineDesc: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 focus:border-purple-500"
                          placeholder="Descrizione"
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-300">
                        {quickAddProposal.routineTitle}
                      </div>
                    )}
                  </div>

                  {/* Related context */}
                  {quickAddProposal.relatedTo && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Collegato a:</span>
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{quickAddProposal.relatedTo}</span>
                    </div>
                  )}
                  
                  {/* Reason */}
                  <div className="pt-2 border-t border-indigo-500/20">
                    <p className="text-slate-400 text-xs flex items-start gap-2">
                      <Lightbulb size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{quickAddProposal.reason}</span>
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={rejectQuickAdd}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={14} />
                    Rifiuta
                  </button>
                  <button
                    onClick={confirmQuickAdd}
                    className="py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={14} />
                    Approva
                  </button>
                </div>
              </div>
            )}

            {/* FASE 2b: Errore AI */}
            {quickAddProposal?.error && !quickAddResult && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-400 font-bold text-sm">Errore AI</span>
                  </div>
                  <p className="text-slate-400 text-xs">{quickAddProposal.errorMessage}</p>
                </div>
                <button
                  onClick={() => { setQuickAddProposal(null); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* FASE 3: Confermato */}
            {quickAddResult && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className={`${quickAddResult.createdNewRoutine ? 'bg-purple-950/30 border-purple-500/30' : 'bg-emerald-950/30 border-emerald-500/30'} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {quickAddResult.createdNewRoutine ? (
                      <>
                        <Rocket size={18} className="text-purple-400" />
                        <span className="text-purple-400 font-bold text-sm">Routine creata e task aggiunto!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-sm">Task aggiunto!</span>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-16">Task:</span>
                      <span className="text-white font-medium">{quickAddResult.task}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-16">Pillar:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        quickAddResult.pillar === 'wealth' ? 'bg-emerald-500/20 text-emerald-400' :
                        quickAddResult.pillar === 'health' ? 'bg-red-500/20 text-red-400' :
                        quickAddResult.pillar === 'brain' ? 'bg-indigo-500/20 text-indigo-400' :
                        'bg-pink-500/20 text-pink-400'
                      }`}>
                        {quickAddResult.pillarLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-16">Routine:</span>
                      <span className="text-slate-300 flex items-center gap-2">
                        {quickAddResult.routine}
                        {quickAddResult.createdNewRoutine && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold">Nuova</span>
                        )}
                      </span>
                    </div>
                    {quickAddResult.relatedTo && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">Collegato:</span>
                        <span className="text-amber-400">{quickAddResult.relatedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveTab(quickAddResult.pillar);
                      setQuickAddOpen(false);
                      setQuickAddResult(null);
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={14} />
                    Vai al Pillar
                  </button>
                  <button
                    onClick={() => { setQuickAddResult(null); setQuickAddProposal(null); }}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Aggiungi altro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Pillars;
