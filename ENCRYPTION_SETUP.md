# Groq API Key Security - DEPRECATED

**IMPORTANTE: Questo sistema di crittografia con password è stato rimosso per motivi di sicurezza.**

## Configurazione Corrente

L'applicazione **NON salva più chiavi API nel codice sorgente** per motivi di sicurezza.

### Come Fornire la Chiave API

Hai due opzioni:

#### Opzione 1: Variabile d'Ambiente (Consigliato per Sviluppo)
Imposta la variabile d'ambiente `GROQ_KEY` prima di avviare il server:

**Windows (PowerShell):**
```powershell
$env:GROQ_KEY="gsk_..."
node server.js
```

**Linux/Mac:**
```bash
export GROQ_KEY="gsk_..."
node server.js
```

#### Opzione 2: Inserimento Runtime (Consigliato per Produzione)
L'applicazione chiederà la chiave API ogni volta che viene avviata. La chiave verrà:
- Mantenuta **solo in memoria** durante la sessione
- **Cancellata automaticamente** alla chiusura del browser/app
- **Mai salvata** su disco o in localStorage

### Note di Sicurezza

- ✅ Le chiavi API sono gestite solo in memoria (RAM)
- ✅ Nessuna chiave hardcoded nel codice sorgente
- ✅ Le credenziali vengono cancellate alla chiusura della sessione
- ✅ Ogni sessione richiede l'inserimento delle credenziali
- ❌ NON usare localStorage per salvare chiavi API
- ❌ NON committare file con chiavi API su Git

- Don't commit your password to version control

## Troubleshooting

Encryption has been retired in this repository. If you see key-related errors:
- Ensure `GROQ_KEY` environment variable is set, or
- Persist a plaintext key using the `/api/groq-key/setup` or `/api/groq-key/force-setup` endpoints, or
- Place a plaintext string in `db/pillars_groq_key.json` (not recommended for production).
