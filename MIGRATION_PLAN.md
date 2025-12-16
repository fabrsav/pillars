# Migration plan: Branching & Cleanup Proposal

## Goal
Rendere il repository più ordinato e sostenibile con regole chiare di branching, strumenti di audit e una procedura sicura per pulire i branch remoti inattivi.

## High-level steps
1. Definire e pubblicare la policy (già fatto in `CONTRIBUTING.md`).
2. Aggiungere script che individuino branch candidati alla pulizia e producano un report (incluso in `scripts/prepare-branch-report.js`).
3. Creare PR di sanificazione per branch che richiedono piccolo lavoro di integrazione o ricreare PR pulite per lavoro parziale.
4. Applicare regole di protezione su `main` (richieste: ci verde, review obbligatoria).
5. Eseguire pulizia controllata: chiudere branch già integrati, richiedere aggiornamento per branch attivi isolandoli in issue, e cancellare branch ormai obsoleti.

## Safety & process
- Nessun branch remoto sarà cancellato automaticamente dallo script: lo script produce un report e suggerisce azioni.
- Per ogni branch candidato, creare un'issue con suggerimento (opzionale) o aprire PR pulita su richiesta.
- Comunicazione: inviare una breve nota nel canale del team e aprire la PR `chore/restructure-proposal` per approvazione prima di cancellare branch.

## Scripts aggiunti
- `scripts/list-stale-branches.js` — script semplice che elenca branch remoti più vecchi di N giorni.
- `scripts/prepare-branch-report.js` — script avanzato che produce un report JSON/CSV, controlla se il branch è già stato merge-ato in `main`, e tenta di trovare PR aperte (se `gh` è disponibile).

## How to run
- Audit rapido: `npm run audit:branches -- --days=90`
- Report dettagliato: `npm run audit:report -- --days=90 --output=report.json`

## Next actions (proposal)
1. Review della proposta su `chore/restructure-proposal` e approvazione tramite PR.
2. Eseguire report con soglie diverse (30/60/90 giorni) e raccogliere feedback.
3. Eseguire pulizia manuale dei primi 3 branch candidati come prova.
4. Se tutto ok, programmare pulizia periodica (es. monthly) e aggiungere un job che ricorda al team.

---

_Piccola nota_: posso anche aggiungere un'azione GitHub per eseguire automaticamente l'audit e creare issue con i risultati (solo con tuo OK e token adeguato).