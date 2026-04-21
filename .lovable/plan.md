

## Cambio default famiglia TV su pagina Streaming

### Modifica

Nella pagina `/streaming`, tab "TV stasera", il selettore famiglia ha attualmente come default `sky-sport`. Va cambiato in `rai`.

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/StreamingPage.tsx` | Cambiare il fallback `initialFamily` da `"sky-sport"` a `"rai"` (riga ~95). |
| `changelog.md` | Aggiungere voce sotto 2.1.0 (versione invariata): "Streaming: famiglia TV di default impostata su RAI all'atterraggio sulla pagina". |
| `README.md` | Aggiornare nota descrittiva sezione Streaming se menziona il default. |

### Comportamento atteso

- Atterrando su `/streaming` senza query string, il tab TV mostra **RAI** selezionata.
- Se l'URL contiene `?family=sky-sport` (o altra famiglia valida), quella prevale (logica `isFamily` invariata).
- Versione resta **2.1.0** (micro-fix UX).

### Cosa NON cambia

- Ordine delle famiglie in `STREAMING_FAMILIES` (resta RAI, Mediaset, Sky Sport, Sky Cinema, Discovery).
- Logica di sync URL state.
- Default tab (`tv`) e default provider per tab "Nuove uscite".

