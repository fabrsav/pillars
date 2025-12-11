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

**"NO_ENCRYPTED_KEY" error:**
- You haven't completed Step 3 (updating ENCRYPTED_KEY in groq-key-manager.js)

**"INVALID_PASSWORD" error:**
- The password is incorrect
- Check that you're using the same password you used in encrypt-once.js

**Key not working:**
- The original Groq API key may have expired or been revoked
- Generate a new key from Groq and re-run the encryption process
