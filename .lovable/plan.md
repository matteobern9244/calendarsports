
## Piano: estensioni Streaming

Sei richieste, raggruppate per area. Includo anche un **fix critico** scoperto nell'esplorazione: la rotta `/streaming` non è registrata in `App.tsx` e la voce nav non esiste in `Header.tsx` (il messaggio precedente diceva fossero state aggiunte, ma il codice mostra il contrario).

### 1. Nav: STREAMING tra HOME e JANNIK SINNER

`src/components/layout/Header.tsx` → aggiungo `{ label: "STREAMING", path: "/streaming" }` in seconda posizione.
`src/App.tsx` → aggiungo `import StreamingPage` + `<Route path="/streaming" element={<StreamingPage />} />`.

### 2. Edge function `streaming-tv`: integrazione XMLTV iptv-org per Real Time + DMax

In `supabase/functions/streaming-tv/index.ts`:
- aggiungo `fetchDiscoveryXmltv(date)` che scarica `https://raw.githubusercontent.com/iptv-org/epg/master/sites/mediaset.it/mediaset.it.channels.xml` o equivalente. Fonte XMLTV reale per Real Time/DMax: `https://iptv-org.github.io/epg/guides/it/mediasetinfinity.mediaset.it.epg.xml` (o feed analogo iptv-org for Italy).
- parser XMLTV minimale via regex (no libreria DOM in Deno edge): estraggo `<programme start="..." stop="..." channel="..."><title>...</title><desc>...</desc><category>...</category></programme>`.
- mapping: `real-time` → channel id XMLTV "RealTime.it", `dmax` → "DMax.it" (verifico con curl al deploy).
- cache in-memory 1h del feed completo, parse lazy per canale.
- `fetchProgramsForChannel` chiama il parser solo per family `discovery`. Le altre famiglie restano stub vuoto (dichiarato `programsAvailable: false`), come oggi.
- fallback: se fetch o parse fallisce → lista vuota, mai dati inventati.

Cache key: `xmltv-discovery:${date}`. TTL 1h.

### 3. Edge function `streaming-releases`: range 7 giorni + selettore data

In `supabase/functions/streaming-releases/index.ts`:
- accetto nuovo param opzionale `dateFrom` e `dateTo` (regex `DATE_RE` già presente). Se assenti: `dateFrom = oggi`, `dateTo = oggi + 7`.
- TMDB `/discover` supporta nativamente `primary_release_date.gte` + `.lte` → cambio i parametri esistenti per accettare il range invece del singolo giorno.
- output payload: aggiungo `dateFrom`, `dateTo` + ogni item mantiene `releaseDate` (già presente). 
- cache key: `${provider}:${dateFrom}:${dateTo}`.

In `src/lib/api/sportsApi.ts`:
- estendo `streamingApi.getReleasesByProvider(provider, dateFrom?, dateTo?)`.

In `src/hooks/useStreamingData.ts`:
- estendo `useReleasesByProvider(provider, dateFrom?, dateTo?)`, queryKey include il range.

### 4. Filtro Film/Serie nella tab Nuove uscite

In `StreamingPage.tsx` tab `releases`:
- nuovo state `kindFilter: "all" | "movie" | "tv"` (default `all`), persistito in URL come `?kind=movie`.
- 3 pill `Tutti` / `Film` / `Serie` sotto il `ProviderSelector`.
- filtro client-side su `items` prima del paginamento (TMDB già restituisce `type` per ogni item).
- selettore data: aggiungo un `Select` `Oggi` / `Prossimi 3 giorni` / `Prossimi 7 giorni` (default `Oggi`) sopra le pill, persistito in URL come `?range=7d`. Calcolo `dateFrom`/`dateTo` lato client e li passo all'hook.

### 5. Dialog dettaglio poster

Nuovo componente `src/components/streaming/ReleaseDetailDialog.tsx`:
- props: `item: ReleaseItem | null`, `provider: StreamingProviderId`, `onClose`.
- usa `Dialog` di shadcn (già presente in `src/components/ui/dialog.tsx`).
- mostra: poster grande, titolo, badge tipo (Film/Serie), data uscita, voto, **overview** (già nel payload TMDB), **link diretto al provider** (URL deep-link generico per provider: Netflix `https://www.netflix.com/title/{id}` non è disponibile da TMDB; uso fallback `https://www.themoviedb.org/{type}/{tmdbId}` come "Vedi dettagli su TMDB" + link homepage provider come secondo CTA).

**Cast**: TMDB `/discover` non restituisce cast. Per averlo serve seconda chiamata `/movie/{id}/credits` o `/tv/{id}/credits`. Due opzioni:
- A) lazy on click: nuova edge function action `get-credits?type=movie&id=123` → fetch on-demand quando si apre il dialog (più pulito, niente sprechi).
- B) prefetch in `discover` (impossibile: non c'è append_to_response su `/discover`).

Adotto **A**: estendo `streaming-releases` con action `credits` (param `type`, `id`), nuovo hook `useReleaseCredits(type, id)` con `enabled: !!id`, cache lunga (24h). Il dialog mostra skeleton per il cast finché carica, top 6 attori con nome.

In `StreamingPage.tsx`: card poster diventa `<button onClick={() => setSelectedItem(item)}>`, `<ReleaseDetailDialog item={selectedItem} ... />` montato a fianco della grid.

### 6. Home: quadro rapido "Stasera in TV" reale

Oggi la card Home ha solo i pill di link alle famiglie. La richiesta è vedere **un quadro rapido della programmazione**.

In `src/pages/Index.tsx`:
- uso `useTvByFamily("discovery")` per fetchare i programmi reali (l'unica famiglia con dati XMLTV dopo il punto 2).
- mostro fino a 6 righe compatte: ora + canale + titolo programma, ordinate per orario, solo prime time.
- se `programsAvailable === false` o lista vuota → mostro i pill famiglie come oggi (fallback grazioso).
- mantengo CTA "Apri Streaming".

Limite onesto: solo Real Time + DMax avranno dati reali; Sky/RAI/Mediaset restano elencati come pill di navigazione finché non integrate. Lo dichiaro nel sottotitolo della card.

### Vincoli rispettati

- Branch: lavoro su `develop`, PR verso `develop`. Lovable scriverà su `main` automaticamente.
- Nessuna modifica a `src/integrations/supabase/*`, `supabase/config.toml`, env, branch policy.
- Validazione regex su tutti i nuovi param edge (`type`, `id`, `dateFrom`, `dateTo`).
- Fonti dichiarate fragili: XMLTV iptv-org community (può cambiare struttura/disappear), TMDB (richiede key, già configurata).
- Aggiorno `README.md` (nuova fonte XMLTV + dettaglio dialog + range 7gg) e `changelog.md` sotto `[Unreleased]`.

### File toccati

- `src/App.tsx` (route)
- `src/components/layout/Header.tsx` (nav)
- `src/pages/Index.tsx` (quadro Stasera in TV reale)
- `src/pages/StreamingPage.tsx` (filtro Film/Serie, selettore data, dialog wiring)
- `src/components/streaming/ReleaseDetailDialog.tsx` (nuovo)
- `src/hooks/useStreamingData.ts` (nuovi hook + range)
- `src/lib/api/sportsApi.ts` (firme estese)
- `supabase/functions/streaming-tv/index.ts` (XMLTV parser Discovery)
- `supabase/functions/streaming-releases/index.ts` (range 7gg + action credits)
- `README.md`, `changelog.md`

### Ordine di esecuzione

1. Fix nav + route (sblocca tutto)
2. `streaming-tv` XMLTV Discovery + verifica curl
3. Home quadro reale
4. `streaming-releases` range + filtri
5. Action credits + dialog
6. Filtri Film/Serie + selettore data UI
7. Docs + verifica end-to-end
