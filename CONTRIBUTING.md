# Contributing

Grazie per voler contribuire a Pillars! Questa guida descrive le convenzioni di branching, le regole per le PR e la policy di pulizia dei branch.

## Branching (raccomandato: Trunk-based)
- Branch protetto: `main` (require CI green + review).
- Feature brevi: `feature/<descrizione>` (durata consigliata < 7 giorni).
- Fix bug: `fix/<descrizione>`.
- Chore / refactor: `chore/<descrizione>`.
- Evitare `wip/` o `merge/` come nomi permanenti: se servono, devono essere temporanei e segnalati in descrizione PR.

## Pull Request
- Aprire PR verso `main` per ogni modifica non triviale.
- Eseguire `npm test` e `npm run lint` localmente prima della PR.
- Usa il template PR (`.github/PULL_REQUEST_TEMPLATE.md`) e includi descrizione, test, e suggerimento di merge (squash/rebase).
- I merge su `main` devono essere effettuati solo dopo CI green e almeno 1 review approvata.

## Merge strategy
- Raccomandazione: **squash and merge** per mantenere una history lineare e leggibile.

## Pulizia branch
- Branch inattivi > 90 giorni sono candidati a pulizia/richiesta di aggiornamento.
- Usa lo script `npm run audit:branches` per trovare branch inattivi.
- Prima di cancellare un branch remoto: verificare se il lavoro è stato integrato o riaprire una PR pulita.

## Come proporre grandi cambiamenti
- Crea una PR `chore/restructure-proposal` con la proposta, i motivi, e i passi di migrazione richiesti.

## Script utili
- `npm run audit:branches -- --days=90` — segnala branch remoti che non hanno commit recenti.

Grazie! Seguendo queste semplici regole manteniamo il repo pulito e facile da navigare.
