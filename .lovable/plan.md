

## Rimozione messaggio "finestra estesa" + audit dati reali

### Parte 1 — Rimozione messaggio widened window

In `src/pages/StreamingPage.tsx`, nel tab "Nuove uscite", esiste un avviso che compare quando l'edge function `streaming-releases` attiva il fallback widened (allarga la finestra date a -14/+30 giorni se la finestra richiesta è vuota). Il testo è:

> "Mostriamo una finestra estesa perché nel range richiesto non c'erano novità indicizzate da TMDB per XXXX."

**Modifica**: rimuovere completamente il blocco JSX che renderizza questo messaggio (tipicamente un check `if (data.widenedWindow)` con `<p>` o `<Alert>` correlato). Mantenere invariata la logica backend: il fallback widened resta attivo lato edge function per evitare risultati vuoti, ma non viene più segnalato in UI.

### Parte 2 — Audit "dati reali" su tutta l'app

Questo punto richiede una verifica sistematica, non una singola modifica. Stato attuale dichiarato in `AGENTS.md` e nelle istruzioni Supabase:

| Sezione | Fonte dichiarata | Stato dati |
|---|---|---|
| Sinner (`sports-tennis`) | Dataset statico 2026 hardcoded | **Non live** — è un dataset stagionale codificato |
| MotoGP (`sports-motogp`) | Sky Sport scraping + calendario statico 2026 + mapping piloti/team statici | **Misto** — calendario e mapping sono hardcoded |
| F1 (`sports-f1`) | Jolpica/OpenF1 API + fallback statici | **Misto** — fallback hardcoded quando API down |
| Juventus / Serie A (`sports-football`) | Sky Sport + Lega Serie A scraping | **Live ma fragile** (scraping) |
| Streaming TV (`streaming-tv`) | Provider EPG scraping | **Live ma fragile** |
| Streaming Releases (`streaming-releases`) | TMDB API + filtro IT flatrate + per-item validation | **Live e validato** |

Le istruzioni del progetto (`AGENTS.md`, `.github/instructions/supabase.instructions.md`, `mem://constraints/data-policy`) impongono già:

- **Non rimuovere fallback statici senza verificare il formato reale e l'impatto stagionale** (i fallback evitano pagine vuote in caso di provider down).
- **Esplicitare sempre se una sezione dipende da scraping, fallback o dataset hardcoded**.
- **Non spacciare dati statici come live**.

**Conclusione**: i dati sono già reali nelle parti dove TMDB / API ufficiali sono disponibili. Le parti hardcoded (calendari stagionali, mapping piloti) sono presenti **per design** come fallback contro fragilità di scraping, e rimuoverle violerebbe le regole di progetto e renderebbe l'app inutilizzabile in caso di failure dei provider.

Non eseguo quindi rimozioni alla cieca dei fallback. Faccio invece due cose concrete in questa iterazione:

1. **Rimuovo il messaggio widened** (Parte 1, modifica diretta richiesta).
2. **Aggiungo una verifica esplicita sul tab "Nuove uscite"**: confermo via lettura del codice e (post-edit) curl test che ogni item mostrato passi dalla doppia validazione TMDB già implementata (`with_watch_monetization_types=flatrate` + `tmdbItemAvailableIT`). Nessun mock, nessun placeholder, nessun dato finto in quella sezione.

Se vuoi un audit più approfondito su una sezione specifica (es. "verifica che il calendario MotoGP 2026 sia allineato all'ultimo annuncio ufficiale", o "rimuovi i fallback statici di F1 e mostra errore esplicito quando Jolpica è down"), va trattato come task separato perché ha implicazioni di disponibilità del prodotto e va deciso esplicitamente.

### File da modificare in questa iterazione

| File | Modifica |
|---|---|
| `src/pages/StreamingPage.tsx` | Rimuovere il blocco JSX che mostra "Mostriamo una finestra estesa…". Lasciare invariati selettore range, badge countdown, nota "solo titoli in abbonamento IT", grid release. |
| `changelog.md` | Voce sotto 2.1.0: "Streaming: rimosso messaggio informativo sulla finestra estesa (logica backend invariata)." |

### Cosa NON cambia

- Logica fallback widened in `supabase/functions/streaming-releases/index.ts` (resta attiva, solo silenziosa in UI).
- Doppio filtro IT (`flatrate` + per-item watch providers).
- Badge countdown, default famiglia TV su RAI.
- Fallback statici in `sports-f1`, `sports-motogp`, `sports-tennis`: mantenuti come da `AGENTS.md`.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/streaming?tab=releases` con un range che attiva il fallback (es. solo "oggi") → nessun banner widened visibile, ma griglia comunque popolata.
2. `npm run lint` + `npm run build`.
3. Aggiornare `changelog.md` (versione invariata 2.1.0).
4. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

