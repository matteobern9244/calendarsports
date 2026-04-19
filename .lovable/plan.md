
## Obiettivo

Aggiungere una sezione **Streaming** all'app con:
- nuova pagina `/streaming` con 2 tab: **TV stasera** (prime time 19:00-24:00) e **Nuove uscite** (Netflix, Prime Video, Disney+, HBO Max);
- voce nav `STREAMING` come prima voce dopo `HOME`;
- blocco compatto **Stasera in TV** sulla Home con top 6 highlights + link a `/streaming`.

## Navigazione interna alla tab TV (NUOVO)

Niente "muro" di canali tutti insieme. La tab **TV stasera** usa una navigazione a due livelli:

1. **Selettore famiglia canali** (sticky, come tab pill orizzontali scrollabili su mobile):
   - `Sky Sport` · `Sky Cinema` · `RAI` · `Mediaset` · `Discovery` (Real Time + DMax)
2. **Lista canali della famiglia selezionata** (accordion verticale):
   - clicco `RAI` → vedo solo Rai 1, Rai 2, Rai 3, Rai 4, Rai 5, Rai Movie, Rai Premium, Rai Gulp, Rai Yoyo, Rai Storia, Rai Scuola, Rai News24, Rai Sport, Rai Sport+
   - ogni canale è un accordion item che mostra i programmi prime time 19:00-24:00 quando aperto

**Paginazione interna alla famiglia** (quando i canali sono molti, es. RAI 14 canali, Mediaset 13):
- Componente `Pagination` (già presente in `src/components/ui/pagination.tsx`)
- Default 6 canali per pagina, configurabile via state
- Reset pagina a 1 quando cambio famiglia
- Persisto la famiglia selezionata in URL query param `?family=rai&page=2` per deep link

Stato di default all'apertura della pagina: famiglia `Sky Sport`, pagina 1.

## Navigazione interna alla tab Nuove uscite

Stesso pattern coerente:
- Selettore provider pill: `Netflix` · `Prime Video` · `Disney+` · `HBO Max`
- Solo provider selezionato visibile alla volta
- Paginazione 8 titoli per pagina se >8 uscite nel giorno
- Default: `Netflix`, pagina 1

## Fonti dati (fragilità dichiarata)

| Provider | Fonte | Tipo |
|---|---|---|
| Sky Sport, Sky Cinema | scraping `guidatv.sky.it` | fragile |
| RAI (14 canali) | scraping `raiplay.it/guidatv` | fragile |
| Mediaset (13 canali) | scraping `mediasetinfinity.it` | fragile |
| Real Time, DMax | XMLTV `iptv-org/epg` | fragile |
| Netflix/Prime/Disney+/HBO Max | TMDB API `/discover` + `with_watch_providers` + `watch_region=IT` | richiede `TMDB_API_KEY` |

## Edge Functions nuove

1. `supabase/functions/streaming-tv/index.ts`
   - Azioni: `prime-time`
   - Param obbligatorio: `family` (sky-sport|sky-cinema|rai|mediaset|discovery), opzionale `channel`, `date`
   - Validazione regex stretta su tutti i param
   - CORS + rate limit identici agli altri
   - Filtro orario 19:00-24:00 server-side
   - Output: `{ family, channels: [{ id, name, logo, programs: [{ start, end, title, genre }] }] }`

2. `supabase/functions/streaming-releases/index.ts`
   - Azione: `new-today`
   - Param: `provider`
   - Chiama TMDB con secret `TMDB_API_KEY`
   - Cache in-memory 1h per provider
   - Output: `{ provider, items: [{ tmdbId, title, type, releaseDate, poster, overview }] }`

## Frontend

- `src/lib/api/sportsApi.ts` → aggiungo `streamingApi.getTvByFamily(family, date?)` e `streamingApi.getReleasesByProvider(provider)`
- `src/hooks/useStreamingData.ts` nuovo: `useTvByFamily(family)`, `useReleasesByProvider(provider)` con React Query (`staleTime` 15min TV, 1h releases)
- `src/pages/StreamingPage.tsx` nuovo:
  - Tabs TV / Nuove uscite (`@/components/ui/tabs`)
  - Sotto-selettore famiglia/provider pill scrollabile orizzontale
  - Lista canali paginata (6 per pagina) con `Accordion` per ogni canale
  - Lista uscite paginata (8 per pagina) come grid card
  - URL state: `?tab=tv&family=rai&page=1`
- `src/pages/Index.tsx`: blocco **Stasera in TV** (top 6 highlights misti) sopra "Prossimi Eventi"
- `src/components/layout/Header.tsx`: aggiungo `STREAMING` come prima voce dopo `HOME`
- `src/App.tsx`: route `<Route path="/streaming" element={<StreamingPage />} />`

## UI

- Riuso esclusivo di token esistenti (oro/navy/Oswald/Inter)
- Pill famiglia: `Badge` o `Button` variant outline, attivo = filled gold
- Accordion canale: header con logo + nome, body con righe orarie
- Paginazione: shadcn `Pagination` esistente, centrata sotto la lista

## Vincoli operativi

- Feature branch da `develop`, PR verso `develop`
- Nessuna modifica a `src/integrations/supabase/*`, `supabase/config.toml`, env, branch policy
- Import client da `@/lib/supabaseClient`
- Validazione regex su tutti i param edge (lezione `season_param_url_injection`)
- Aggiorno `README.md`, `AGENTS.md`, `changelog.md` sotto `[Unreleased]`

## Cosa serve da te

1. **TMDB API key** (per tab Nuove uscite). Senza, la tab mostra `EmptyState` "Configura TMDB_API_KEY".
2. Conferma accettazione rischio fragilità (5 scraper + 1 EPG community + 1 API esterna).

## Ordine di implementazione

1. Edge function `streaming-releases` + secret request TMDB
2. Edge function `streaming-tv` (Sky → RAI → Mediaset → XMLTV Discovery)
3. `streamingApi` + hooks
4. `StreamingPage` con tab + selettore famiglia + paginazione + URL state
5. Header nav + route
6. Blocco "Stasera in TV" su Home
7. Aggiornamento docs
8. Lint + build + verifica manuale end-to-end

## Fuori scope

- Login / personalizzazione
- Notifiche / promemoria
- Catalogo storico oltre il giorno corrente
- Ricerca full-text
- Deep-link verso app provider
