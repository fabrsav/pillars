# Branch Audit Summary

Generated reports:

- `report-30.json` (threshold 30 days)
- `report-60.json` (threshold 60 days)
- `report-90.json` (threshold 90 days)

## Sintesi (2025-12-16)
Nessun branch remoto candidato alla pulizia è stato trovato usando le soglie 30/60/90 giorni. Questo significa che, al momento, non ci sono branch remoti inattivi che superino queste soglie.

## Raccomandazioni
- Procedere comunque con l'introduzione delle policy (già aggiunte in `CONTRIBUTING.md`) e con la protezione del branch `main` se vuoi un controllo maggiore.
- Abilitare un audit mensile automatico (GitHub Action) che generi report e, opzionalmente, crei issue per i branch che diventano candidati.
- Se preferisci una pulizia più aggressiva, posso rieseguire il report con criteri aggiuntivi (es. elenco di branch con attività non recenti ma meno restrittivo, oppure lista di branch con nomi `wip/` o `merge/`).

## Prossimo passo
Vuoi che proceda con la ristrutturazione proposta (applicare protezioni su `main`, aggiungere GitHub Action per audit periodico, e iniziare la pulizia controllata di branch non desiderati)?

_Ps._ Se mi dai l'ok, applicherò le modifiche su `chore/restructure-proposal`, aprirò PR verso `main` (se richiesto), e procederò alla pulizia manuale solo dopo tua conferma esplicita su ciascuna branch candidata.