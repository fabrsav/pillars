# Deploy Pillars to Render (Free Tier)

Render offre un piano gratuito con URL stabile (`yourdomain.onrender.com`) e supporta Node.js.

## Passi per il deploy

1. **Crea un account Render**
   - Vai su https://render.com
   - Registrati (puoi usare GitHub per accesso rapido)

2. **Crea un nuovo Web Service**
   - Dal dashboard Render → "New" → "Web Service"
   - Scegli "GitHub" come repository source (collega il tuo repo GitHub se non già fatto)
   - Seleziona il repository `pillars`
   - Nome del servizio: es. `pillars` (sarà il subdomain: `pillars.onrender.com`)

3. **Configura il Build & Deploy**
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `node server.js`
   - **Runtime:** Node
   - Render leggerà automaticamente `render.yaml` per configurazioni aggiuntive

4. **Scegli il Piano**
   - Seleziona "Free" (limitato, ma sufficiente per testing/wrapper)
   - URL stabile: `https://pillars.onrender.com` (o il nome che hai scelto)

5. **Deploy**
   - Premi "Deploy"
   - Render farà build e push in automatico
   - Attendi ~3-5 minuti per il primo build

6. **Testa l'URL pubblico**
   ```
   https://pillars-yourname.onrender.com
   ```
   (sostituisci `yourname` con il nome che hai dato al servizio)

7. **Aggiorna lo script hotkey**
   Imposta la variabile d'ambiente `PILLARS_URL`:
   ```powershell
   setx PILLARS_URL "https://pillars-yourname.onrender.com"
   ```
   Riavvia la sessione e il hotkey Ctrl+Alt+P aprirà la URL pubblica.

## Note

- **Piano Free Render:** 
  - Spins down dopo 15 minuti di inattività (cold start ~30 sec al riavvio)
  - 750 ore/mese (sufficiente per uso non 24/7)
  - URL stabile
  
- Se vuoi evitare gli spins, puoi usare un servizio gratuito di "keep-alive" (ping ogni 15 min) o passare a un piano a pagamento (di solito ~7$/mese per unlimited uptime).

- **Deploy automatico:** ogni push a GitHub auto-deploya su Render (se collegato).

## Alternativa: Railway

Se preferisci, Railway offre anche un piano freemium simile. Contattami se vuoi procedere con Railway invece di Render.

## Troubleshooting

- **Build fails:** verifica che `npm run build` funzioni localmente (crea cartella `dist`).
- **App non parte:** controlla i log in Render dashboard → Logs.
- **Cold start lungo:** normale nel piano free; considera un upgrade o un ping keepalive.

## Hard reset / Forzare un redeploy (UI)

Questo progetto include un pulsante nell'interfaccia (icona "refresh" in alto a destra) che permette di forzare un redeploy su Render e tentare di pulire la cache di build. Per usare il pulsante dall'interfaccia web devi configurare alcune variabili d'ambiente sul server:

- `RENDER_API_KEY` → API key personale Render (setta nel dashboard Render / GitHub secrets)
- `RENDER_SERVICE_ID` → ID del servizio Render (vedi dashboard)
- `PILLARS_TOKEN` o `RENDER_RESET_TOKEN` (opzionale) → token Bearer richiesto dall'endpoint per sicurezza. Se configurato, il client dovrà inviare `Authorization: Bearer <token>`.

Per permettere al client (web UI) di invocare l'endpoint direttamente, in fase di build imposta la variabile `VITE_PILLARS_TOKEN` con lo stesso valore del token. In questo modo il client invierà automaticamente il Bearer token nell'header delle richieste al backend.

Se preferisci, puoi configurare la variabile `RENDER_USE_CLI=true` e `RENDER_CLI_CMD` con un comando CLI valido (se la macchina ha installato Render CLI). In generale usare l'API REST è più semplice e portabile.

Esempio uso (dalla UI): clicca l'icona refresh → conferma → il server contatterà Render per avviare il deploy. Controlla lo stato nel Render Dashboard (Logs / Deploys).
