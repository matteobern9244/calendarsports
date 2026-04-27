## Contesto verificato

**Stato attuale (`supabase/functions/streaming-releases` + `StreamingPage.tsx` tab "Nuove uscite"):**
- TMDB `/discover/{movie|tv}` con `watch_region=IT`, `with_watch_providers=<id>`, `with_watch_monetization_types=flatrate`, finestra `primary_release_date` / `first_air_date`.
- Validazione per-item su `/watch/providers` (`results.IT.flatrate` deve contenere il provider).
- Provider chiusi a 4: Netflix (8), Prime Video (119), Disney+ (337), HBO Max (1899).
- Card mostra solo poster + titolo + data + voto. **Nessun genere, nessun anno, nessun cast/sinossi in lista.**
- L'utente è obbligato a scegliere prima un provider, poi vede cosa è uscito → finestre 7-30gg quasi sempre quasi vuote.

**Confronto con starflicks.it (stessa fonte TMDB, region IT):**
- Vista "New Releases" globale, due sezioni: Film e Serie. Nessuna pre-selezione del provider.
- Card: poster + titolo + **generi testuali** (es. "Thriller, Action") + **rating** + **anno**.
- Dettaglio: poster, backdrop, generi, data, runtime, regista, plot, **box "Available on" con loghi provider IT da `/watch/providers` + link JustWatch (`results.IT.link`)**, trailer YouTube, cast top 10.
- TMDB è la fonte: `release_dates` per `region=IT` (per dettaglio e ordinamento), `discover` con `sort_by=popularity.desc` o `primary_release_date.desc`, `/watch/providers` per la disponibilità Italia.

## Cosa cambiare

### 1. Edge function `streaming-releases`: nuova action `new-italy`

Aggiungere un'action parallela a `new-today` che restituisce un elenco **globale Italia** non legato a un provider:

- TMDB `/discover/movie` e `/discover/tv` con:
  - `watch_region=IT`
  - **niente** `with_watch_providers` di default (vista aggregata)
  - `with_watch_monetization_types=flatrate|free|ads` (escludi solo `rent`/`buy` puri)
  - `primary_release_date.gte/lte` (film) e `first_air_date.gte/lte` (serie) sulla finestra richiesta
  - `sort_by=primary_release_date.desc` / `first_air_date.desc` (default) oppure `popularity.desc`
  - `language=it-IT`, `include_adult=false`, `with_original_language` non vincolato
- Mappare `genre_ids` → label italiane usando `/genre/{movie|tv}/list?language=it-IT` (cache 24h in memoria)
- Per ogni item arricchire con `/watch/providers` (region IT) per popolare:
  - `availableProviders`: array di `{ id, name, logo, type: "flatrate"|"free"|"ads" }`
  - `justWatchLink`: `results.IT.link` (deep link generale del titolo)
- Filtri opzionali via querystring:
  - `provider=netflix|prime|disney|hbo|all` (se `all` o assente: nessun filtro)
  - `kind=movie|tv|all`
  - `genreId=<int>` (TMDB genre id)
  - `dateFrom` / `dateTo` (default: oggi-7 .. oggi+30)
  - `sort=release|popularity` (default `release`)
- Mantenere la cache in memoria 1h per chiave (`new-italy:{provider}:{kind}:{from}:{to}:{sort}:{genreId}`).
- Mantenere `new-today` per retrocompatibilità (la card "Stasera in TV" / Home non è impattata).

### 2. Edge function `streaming-releases`: action `details`

Nuova action `details?type=movie|tv&id=<id>` che ritorna in un'unica chiamata ciò che serve al dialog:
- `/movie/{id}?language=it-IT&append_to_response=credits,watch/providers,videos,release_dates`
- `/tv/{id}?language=it-IT&append_to_response=credits,watch/providers,videos,content_ratings`

Ritorna payload già normalizzato: titolo, anno, generi (label IT), runtime/episodi, regista (movie) o creators (tv), cast top 10, trailer YouTube key, providers IT (flatrate/free/ads), justWatch link.

Cache 24h. Sostituisce le due chiamate attuali (releases + credits) con una sola.

### 3. Frontend `StreamingPage.tsx` — tab "Nuove uscite"

- Aggiungere un selettore "Vista":
  - **"Catalogo Italia"** (default, nuova): chiama `new-italy`, mostra tutto quello che è uscito in Italia nella finestra, con filtro provider opzionale come pill (Tutti / Netflix / Prime / Disney+ / HBO Max).
  - **"Per provider"** (vista attuale): mantiene `new-today` con la logica stretta `flatrate`-validata per chi vuole il taglio rigoroso.
- Card aggiornata (entrambe le viste):
  - Poster (già c'è)
  - Titolo (già c'è)
  - **Riga generi** sotto al titolo: `Thriller, Action` (max 3 chip testuali)
  - **Anno** accanto al voto
  - Voto (già c'è)
  - Mini-strip con **loghi dei provider IT** dove è disponibile (max 3 + "+N")
- Filtri esistenti (kind, range, "solo in arrivo") restano.
- Aggiunto filtro **genere** (dropdown popolato dalla lista TMDB IT).
- Ordinamento: dropdown "Data uscita" / "Popolarità".

### 4. Frontend `ReleaseDetailDialog.tsx`

- Una sola chiamata a `details` (sostituisce `useReleaseCredits`).
- Aggiungere: anno, generi (chip), runtime/numero stagioni, regista/creator, **box "Disponibile su" con loghi provider IT + bottone "Apri su JustWatch"**, **trailer YouTube embed** (se presente), cast (già c'è).

### 5. Hook `useStreamingData.ts`

- Nuovo hook `useReleasesItaly(opts)` per `new-italy`.
- Nuovo hook `useReleaseDetails(type, id)` per `details`.
- Aggiornare i tipi `ReleaseItem` aggiungendo `genres: string[]`, `year: number | null`, `availableProviders: ProviderBadge[]`, `justWatchLink: string | null`.
- Mantenere `useReleasesByProvider` per la vista "Per provider".

### 6. `src/lib/api/sportsApi.ts`

Aggiungere endpoint client per `new-italy` e `details` con validazione parametri.

## Cosa NON tocco

- Tab "TV stasera" e card Home "Stasera in TV": pipeline `streaming-tv` invariata.
- Provider supportati: invariati (Netflix, Prime, Disney+, HBO Max). Aggiungere altri richiede solo nuovi entry nella mappa `PROVIDERS` ma non è in scope ora.
- Auth, RLS, secrets: TMDB_API_KEY già configurato.
- Routing, layout pagine sportive, Juventus, Sinner, F1, MotoGP.

## Rischi e note

- La vista "Catalogo Italia" senza filtro provider è meno "rigorosa": un titolo può essere indicizzato da TMDB con region IT ma non ancora attivo su nessun provider quel giorno. Lo gestiamo mostrando esplicitamente la striscia provider sotto la card (vuota = "in arrivo") e l'utente capisce subito.
- Il numero di chiamate `/watch/providers` cresce (1 per item). Mitigazione: cache 1h per item-key (`watch-providers:{type}:{id}`) e parallelizzazione `Promise.all` come già facciamo.
- Genre map TMDB IT: una sola fetch all'avvio + cache 24h.
- Lingua UI italiana mantenuta: tutte le label nuove ("Catalogo Italia", "Disponibile su", "Apri su JustWatch", "Trailer", "Genere", "Ordina per data uscita", "Ordina per popolarità", ecc.).
- `npm run check:italian` e `npm run check:tz-juventus` continueranno a girare in CI.

## File toccati (stima)

- `supabase/functions/streaming-releases/index.ts` (+~250 righe: action `new-italy`, action `details`, mappa generi)
- `src/hooks/useStreamingData.ts` (+2 hook, tipi estesi)
- `src/lib/api/sportsApi.ts` (+2 endpoint client)
- `src/pages/StreamingPage.tsx` (selettore vista, filtro genere, card arricchita)
- `src/components/streaming/ReleaseDetailDialog.tsx` (riscrittura per usare `details`, box providers, trailer)
- `changelog.md` + `README.md` (aggiornamento sezione Streaming + nota fonti)

## Verifica post-modifica

- `npm run lint`, `npm run build`, `npm run test` (vitest)
- Test edge function `streaming-releases`: chiamata `new-italy` con/senza provider, finestra 30gg, controllo presenza `genres` e `availableProviders`
- Smoke manuale tab "Nuove uscite" → vista "Catalogo Italia" → click su un titolo → dialog con providers IT + trailer
