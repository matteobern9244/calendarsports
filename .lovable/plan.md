

## Fix "Nuove uscite" sempre vuoto

### Diagnosi

La funzione **non è rotta tecnicamente** (`TMDB_API_KEY` configurata, `configured: true`, risposta 200), ma è **mal calibrata** rispetto al modo in cui TMDB indicizza i cataloghi streaming.

Test eseguiti contro l'edge function `streaming-releases` in produzione:

| Range | dateFrom | dateTo | Risultato Netflix |
|---|---|---|---|
| "Oggi" (default UI) | 2026-04-21 | 2026-04-21 | **0 items** |
| "Prossimi 7 giorni" | 2026-04-21 | 2026-04-28 | **0 items** |
| Test diagnostico ampio | 2026-04-01 | 2026-05-31 | **decine di titoli** |

### Cause

1. **Finestre troppo strette.** TMDB Discover con `with_watch_providers=8` (Netflix IT) restituisce risultati solo se `primary_release_date` cade nella finestra. Per il 21 aprile 2026 ci sono pochissimi titoli con quella data esatta — un range di 1, 3 o 7 giorni non basta.
2. **Campo data sbagliato per "uscite streaming".** Il filtro su `primary_release_date` (film) e `first_air_date` (serie) significa **data della prima uscita mondiale del titolo**, non **data in cui è entrato sulla piattaforma in Italia**. TMDB non espone una data di "platform add" su `discover`; per quella servirebbe l'endpoint `changes` o `watch/providers` per singolo titolo.
3. **Niente fallback nel periodo "vuoto".** Quando la finestra esatta non produce risultati, l'UI mostra `EmptyState` senza spiegare la natura del filtro.

### Soluzione proposta (3 livelli, conservativi)

**A. Allargare le finestre di default in `StreamingPage.tsx`**

Sostituire i 3 range attuali con range più realistici per come TMDB indicizza:

```text
"7d"  → ultimi 0 / +7 giorni (era "Oggi")
"30d" → ultimi 0 / +30 giorni (era "3 giorni")  ← nuovo default
"90d" → ultimi -30 / +60 giorni (era "7 giorni")
```

Etichette aggiornate: "Prossimi 7 giorni", "Prossimi 30 giorni", "Finestra estesa". Il default passa a "30d" (oggi → +30 giorni), allineato a come funziona realmente l'indice TMDB per i provider streaming.

**B. Migliorare la copertura nell'edge function `streaming-releases`**

Quando la prima query restituisce `[]`, fare un **secondo tentativo automatico ampliato** lato backend (fallback trasparente):

- Se `items.length === 0` dopo le due chiamate (movie + tv) sulla finestra richiesta, ripetere la stessa query con `dateFrom -= 14 giorni` e `dateTo += 30 giorni`, **senza** rilassare `with_watch_providers` (il provider resta corretto).
- Aggiungere nel payload il campo `widenedWindow: boolean` per tracciabilità (l'UI può mostrare un piccolo hint "Mostriamo una finestra estesa perché in questo momento non ci sono novità imminenti").
- Mantenere il filtro `with_watch_providers` (corretto) e `watch_region=IT`.
- Cache key aggiornata per includere il flag widened in modo da non confondere risultati.

**C. EmptyState informativo**

Aggiornare `EmptyState` (o l'invocazione in `StreamingPage`) quando `releasesQuery.data?.items?.length === 0` per mostrare un messaggio più utile:

> "Nessuna uscita catalogata da TMDB per **{provider}** nella finestra selezionata. Prova ad allargare il range con il filtro qui sopra."

E un pulsante secondario "Allarga finestra" che imposta `range = "90d"`.

### Cosa NON cambiare

- **Niente nuove dipendenze.**
- **Niente nuove tabelle Supabase.**
- **Niente cambio del provider TMDB** o dell'API key.
- **Niente scraping** dei siti dei provider (rispetto alla regola "evitare scraping fragile").
- Versione resta **2.1.0** (bugfix, non release).

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/streaming-releases/index.ts` | Aggiungere fallback automatico con finestra estesa quando `items=[]`; aggiungere `widenedWindow` al payload; aggiornare cache key. |
| `src/pages/StreamingPage.tsx` | Sostituire array `RANGES` con finestre più ampie; default su "30d"; aggiungere CTA "Allarga finestra" nell'empty state. |
| `src/hooks/useStreamingData.ts` | Aggiungere `widenedWindow?: boolean` a `ReleasesPayload`. |
| `changelog.md` | Voce bugfix sotto la sezione corrente 2.1.0 (Cambiamenti / Bugfix): "Fix Nuove uscite vuote: finestre ampliate + fallback automatico TMDB". |
| `README.md` | Aggiornare la nota sulla sezione Streaming: spiegare che le "Nuove uscite" si basano sul `primary_release_date` TMDB e che la finestra di default è 30 giorni. |

### Checklist post-edit

1. `supabase functions deploy streaming-releases` (automatico via Lovable).
2. Curl test: `provider=netflix`, default range → deve restituire ≥1 item.
3. Curl test: `provider=hbo` (provider con meno catalogo IT) → verificare che il fallback widened scatti.
4. Verifica UI in `/streaming?tab=releases` desktop + mobile.
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md` e `README.md`, mantenendo versione 2.1.0.
7. Lavorare su `develop`, PR verso `develop`, assegnare a `@matteobern9244`.

