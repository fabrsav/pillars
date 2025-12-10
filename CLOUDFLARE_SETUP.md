# CLOUDFLARE TUNNEL - Guida Completa Setup

## Prerequisiti
- Account Cloudflare (gratuito)
- Un dominio (puoi usare un sottodominio del tuo dominio esistente)
- Server Node.js in esecuzione sulla porta 3001

## Passo 1: Download e Installazione

Esegui lo script di setup:
```powershell
.\setup_cloudflare_tunnel.ps1
```

Questo script:
1. Scarica cloudflared.exe se non è già installato
2. Ti guida attraverso il login
3. Crea un tunnel chiamato "pillars-tunnel"

## Passo 2: Configurazione

Dopo aver creato il tunnel, devi configurarlo:

1. **Ottieni il tunnel UUID:**
   ```
   cloudflared tunnel list
   ```
   Copia l'UUID del tuo tunnel.

2. **Crea config.yml:**
   Copia `config.yml.template` in `config.yml` e modifica:
   - Sostituisci `<TUNNEL-UUID>` con il tuo UUID
   - Cambia `pillars.yourdomain.com` con il tuo dominio

3. **Configura il DNS:**
   ```
   cloudflared tunnel route dns pillars-tunnel pillars.tuodominio.com
   ```
   Oppure manualmente su Cloudflare Dashboard:
   - Vai su DNS settings
   - Aggiungi record CNAME: `pillars` → `<TUNNEL-UUID>.cfargotunnel.com`

## Passo 3: Avvio

### Manuale
```
.\start_cloudflare_tunnel.bat
```

### Automatico (come servizio Windows)
```
cloudflared service install
```

## Passo 4: Verifica

Apri il browser e vai su: `https://pillars.tuodominio.com`

Dovresti vedere la tua app Pillars!

## Vantaggi Cloudflare Tunnel

✅ HTTPS automatico (certificato SSL gratuito)
✅ Nessuna porta da aprire sul router
✅ Protezione DDoS integrata
✅ Accessibile da qualsiasi dispositivo
✅ Nessun costo (piano gratuito)

## Troubleshooting

### Errore "tunnel credentials file not found"
Assicurati che il percorso in config.yml sia corretto:
```
C:\Users\PC-FabrizioSavona25\.cloudflared\<UUID>.json
```

### Errore "service: http://localhost:3001 unreachable"
Verifica che il server Node.js sia in esecuzione:
```
node server.js
```

### Tunnel non si connette
1. Verifica login: `cloudflared tunnel login`
2. Controlla che il tunnel esista: `cloudflared tunnel list`
3. Verifica config.yml

## Comandi Utili

```powershell
# Lista tutti i tunnel
cloudflared tunnel list

# Elimina un tunnel
cloudflared tunnel delete pillars-tunnel

# Info tunnel
cloudflared tunnel info pillars-tunnel

# Run tunnel con debug
cloudflared tunnel --config config.yml run pillars-tunnel --loglevel debug

# Installa come servizio Windows
cloudflared service install

# Disinstalla servizio
cloudflared service uninstall
```

## Integrazione con Duck DNS (Opzionale)

Se vuoi usare Duck DNS invece di un dominio Cloudflare:
1. Crea un dominio su Duck DNS (es: pillars.duckdns.org)
2. Su Cloudflare Dashboard, aggiungi il dominio Duck DNS come CNAME
3. Configura config.yml con il dominio Duck DNS

## Prossimi Passi

1. ✅ Installa e configura Cloudflare Tunnel
2. 🔄 Modifica `launch_pillars.bat` per avviare anche il tunnel
3. 📱 Testa l'accesso da mobile
4. 🔐 Aggiungi autenticazione se necessario (Cloudflare Access)
