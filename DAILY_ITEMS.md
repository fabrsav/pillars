## Sezione: Oggettini quotidiani (presa magnetica, basetta, cavo)

Questa sezione aiuta a tenere traccia degli oggetti quotidiani e dello stato delle loro parti: presa magnetica, basetta (dock) e cavo.

Come usare
- Per ogni oggetto crea un blocco con i campi seguenti.
- Mantieni aggiornato il campo `base` e `cable` come `Presente` o `Manca`.
- `magneticMount` è booleano: `Sì` se l'oggetto ha una presa magnetica.

Template (col formato suggerito):

- Item: Nome dell'oggetto
  - Connector: Tipo di connettore (es. `Micro USB`, `USB-C`, `MagSafe`)
  - Presa magnetica: Sì / No
  - Basetta: Presente / Mancante
  - Cavo: Presente / Mancante
  - Note: Eventuali note (es. link, modello basetta richiesto)

Esempio pratico

- Item: Rasoio elettrico
  - Connector: Micro USB
  - Presa magnetica: Sì
  - Basetta: Mancante
  - Cavo: Mancante
  - Note: Comprare basetta compatibile e cavo Micro-B

JSON schema di esempio (piccolo riferimento)

{
  "id": "razor-1",
  "name": "Rasoio elettrico",
  "connector": "Micro USB",
  "magneticMount": true,
  "base": false,
  "cable": false,
  "notes": "Basetta e cavo mancanti"
}

Dove salvare i dati
- Puoi usare `data/items.json` fornito in questo repo come punto di partenza.

Suggerimenti
- Se vuoi un'interfaccia, posso aggiungere un piccolo componente React che mostra e modifica `data/items.json`.

Aggiornamenti recenti
- La sezione è ora accessibile come una tab dedicata **OGGETTINI** nella sidebar.
- Il pulsante **Aggiungi** compare solo quando sei in `Edit Mode` (icona matita nella sidebar), per evitare modifiche accidentali.
  - Gli oggetti possono essere eliminati con il pulsante `Elimina` (richiede conferma).
