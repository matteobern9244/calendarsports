

## Garantire validità "Nuove uscite" in Italia

### Problema

L'edge function `streaming-releases` chiama TMDB Discover con `watch_region=IT` + `with_watch_providers={id}`, ma **non filtra per tipo di monetizzazione**. Risultato: TMDB include titoli che il provider ha solo in modalità "buy/rent" (es. acquisto su Prime Video Store) o "ads", facendoli passare come "Nuova uscita su Netflix/Disney+" anche se in IT non sono nel catalogo flat dell'abbonamento.

Inoltre, Discover non garantisce al 100% la disponibilità IT corrente del singolo titolo: TMDB può restituire un match basato su finestra storica anche se la disponibilità è scaduta. Per "Nuove uscite valide in Italia" serve una verifica per-item su `/{type}/{id}/watch/providers` (regione `IT`).

### Soluzione (2 livelli)

**A. Filtro monetizzazione lato Discover** — in `supabase/functions/streaming-releases/index.ts`, funzione `tmdbDiscover`:

- Aggiungere `with_watch_monetization_types=flatrate` (solo abbonamento, escluso buy/rent/ads).
- Mantenere `watch_region=IT` e `with_watch_providers` invariati.

Questo già elimina la maggior parte dei falsi positivi (titoli "su Prime Video" ma solo a noleggio).

**B. Validazione per-item su `/watch/providers`** — sempre nella stessa edge function:

- Dopo aver raccolto i risultati Discover (movie + tv), eseguire una chiamata `GET /{type}/{id}/watch/providers` per ciascun item (in parallelo, max ~40 chiamate per finestra, accettabile).
- Tenere solo gli item dove `results.IT.flatrate` esiste e contiene il `provider_id` richiesto.
- Cache TTL invariato (1h sui risultati di lista). Le verifiche per-item finiscono nella stessa cache di lista, non serve cache separata.
- Se la lista validata risulta vuota, applicare lo stesso fallback di finestra estesa già esistente.

**C. Trasparenza UI** — in `StreamingPage.tsx`:

- Aggiornare la nota informativa sotto il selettore range: "Solo titoli inclusi nell'abbonamento del provider in Italia (fonte TMDB watch providers, regione IT)."
- Nessun cambio di layout/tab/filtri.

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/streaming-releases/index.ts` | Aggiungere `with_watch_monetization_types=flatrate` in `tmdbDiscover`; nuova funzione `tmdbWatchProviders(kind,id)` + filtro per-item su `results.IT.flatrate`; applicato sia nella query iniziale sia nel fallback widened. |
| `src/pages/StreamingPage.tsx` | Aggiungere riga informativa "Solo titoli in abbonamento in Italia" sopra/sotto il selettore range nel tab Releases. |
| `changelog.md` | Voce sotto 2.1.0: "Streaming: Nuove uscite ora validate per disponibilità reale in abbonamento in Italia (TMDB watch providers, monetization=flatrate)." |
| `README.md` | Aggiornare nota sezione Streaming: spiegare il doppio filtro (monetization flatrate + verifica per-item watch providers IT). |

### Comportamento atteso

- Provider Netflix/Disney+/HBO Max: tutti gli item mostrati sono effettivamente nel catalogo IT in abbonamento al momento della query.
- Provider Prime Video: scompaiono i titoli a noleggio/acquisto del Prime Video Store, restano solo quelli inclusi in Prime.
- Versione resta **2.1.0** (bugfix di correttezza dati, non release).

### Cosa NON cambia

- Niente nuove dipendenze, niente nuove tabelle, niente nuovi secret.
- Provider TMDB e API key invariati.
- Layout, tab, filtri, paginazione UI invariati.
- Logica fallback widened invariata (eredita automaticamente i nuovi filtri).

### Rischi noti

- ~40 chiamate extra per query non cached aumentano la latenza della prima richiesta di ~500-1500ms. Mitigato dalla cache 1h già presente. Accettabile per garantire correttezza.
- TMDB rate limit (~50 req/sec) ampiamente sotto soglia.

### Checklist post-edit

1. Curl test: `provider=netflix`, range `30d` → tutti gli item presenti devono avere TMDB `watch/providers` con `IT.flatrate` contenente Netflix (id 8).
2. Curl test: `provider=prime` → verificare che titoli noleggio/acquisto siano filtrati.
3. UI check `/streaming?tab=releases` per ogni provider, desktop e mobile.
4. `npm run lint` + `npm run build`.
5. Aggiornare `changelog.md` e `README.md` (versione invariata 2.1.0).
6. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

