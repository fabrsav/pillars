# Implementation Summary: Secure API Key Management

## Cambiamenti Implementati (Dicembre 2025)

Sistema di gestione sicura delle chiavi API che **NON salva chiavi nel codice sorgente**.

### Principi di Sicurezza

1. ✅ **Nessuna chiave hardcoded** - Le chiavi non sono mai salvate nel codice
2. ✅ **Gestione in memoria** - Le chiavi esistono solo in RAM durante la sessione
3. ✅ **Cancellazione automatica** - Le credenziali vengono eliminate alla chiusura
4. ✅ **Inserimento manuale** - L'utente fornisce le credenziali ogni volta
5. ✅ **Sessioni temporanee** - Uso di sessionStorage invece di localStorage

## File Modificati

### File Principali:
- `src/App.jsx` - Rimosso componente GroqKeySetup (popup password)
- `groq-key-manager.js` - Rimossi tutti gli hardcoded key e ENCRYPTED_KEY
- `public/mobile.html` - Implementato sessionStorage per credenziali temporanee
- `ENCRYPTION_SETUP.md` - Documentazione aggiornata con nuove linee guida
- `IMPLEMENTATION_SUMMARY.md` - Questo file (aggiornato)

### Comportamento Attuale

#### Desktop/Web App:
- Nessun popup all'avvio
- Le chiavi API possono essere fornite tramite:
  - Variabile d'ambiente `GROQ_KEY`
  - API endpoint `/api/groq-key/setup` (se necessario)
- Le chiavi vengono mantenute in memoria del server durante l'esecuzione

#### Mobile App:
- Richiede inserimento credenziali JSONBin.io ad ogni sessione
- Usa `sessionStorage` (si cancella automaticamente alla chiusura)
- Pulsante "Esci" per cancellare manualmente le credenziali
- Event listener `beforeunload` per pulizia automatica

## Come Fornire le Chiavi API

### Opzione 1: Variabile d'Ambiente (Sviluppo)
```bash
# Linux/Mac
export GROQ_KEY="gsk_..."
npm run dev

# Windows PowerShell
$env:GROQ_KEY="gsk_..."
npm run dev
```

### Opzione 2: Runtime (Mobile)
1. Apri l'app mobile
2. Inserisci X-Master-Key e Bin ID
3. Clicca "Connetti"
4. Le credenziali sono valide solo per questa sessione
5. Alla chiusura del browser, tutto viene cancellato

## Sicurezza Implementata

✅ **Zero chiavi in localStorage** - Previene persistenza non sicura
✅ **sessionStorage per mobile** - Cancellazione automatica alla chiusura
✅ **Nessun hardcoded** - Impossibile commit accidentale di chiavi
✅ **Logout esplicito** - Pulsante per cancellare le credenziali
✅ **beforeunload handler** - Pulizia garantita alla chiusura della pagina

## File Deprecati

I seguenti componenti sono stati rimossi o deprecati:

- ❌ `src/GroqKeySetup.jsx` - Non più utilizzato (popup password rimosso)
- ❌ `encrypt-once.js` - Non più necessario
- ❌ Sistema password/encryption - Sostituito con gestione runtime
- ❌ `ENCRYPTED_KEY` in groq-key-manager.js - Rimosso per sicurezza

## Best Practices

### ✅ DA FARE:
- Usare variabili d'ambiente per sviluppo locale
- Fornire chiavi API tramite UI quando necessario
- Cancellare sempre le credenziali dopo l'uso
- Verificare che sessionStorage sia usato (non localStorage)

### ❌ NON FARE:
- Hardcodare chiavi API nel codice
- Salvare chiavi in localStorage
- Committare file .env su Git
- Condividere chiavi API in chat/email

## Note Importanti

⚠️ **Sessioni Temporanee**: Mobile app richiede credenziali ad ogni apertura. Questo è intenzionale per sicurezza.

⚠️ **Nessun Recupero Password**: Non esiste più un sistema di password/encryption. Le chiavi sono gestite runtime.

⚠️ **Git Security**: Assicurati che `.env` e `db/*.json` siano in `.gitignore`.

## Esportazione DB e Google Drive

- Aggiunto endpoint `GET /api/export-db` che restituisce l'intero DB unificato in JSON e salva `db/exported_database.json`.
- Aggiunto endpoint `POST /api/export-db` che, se chiamato con `{ drive: true }`, prova a caricare il file su Google Drive.
- Il caricamento su Drive può avvenire tramite:
  - Service Account: impostare la variabile d'ambiente `GOOGLE_SERVICE_ACCOUNT_KEY` con il JSON della service account;
  - OAuth token: salvare un oggetto con `clientId`, `clientSecret`, `redirectUri` e `token` in `db/google_drive_token.json` tramite `POST /api/google-drive/save-token`.
- Se il file esiste già su Drive con lo stesso nome, viene aggiornato (sovrascritto).

