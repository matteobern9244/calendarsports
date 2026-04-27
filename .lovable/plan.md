## Diagnosi precisa

I link TMDB che hai inviato puntano a pagine **per network** TMDB:

- `/network/213` → Netflix
- `/network/1024` → Prime Video
- `/network/2739` → Disney+
- `/network/8304` → HBO Max

Questi sono **network IDs** TMDB (chi produce/distribuisce il contenuto). Sono **diversi** dai watch-provider IDs che usiamo oggi (Netflix=8, Prime=119, Disney+=337, HBO Max=1899).

Le pagine TMDB linkate filtrano internamente con:
- `with_networks=NNN` per le **serie TV**
- `with_companies=NNN` per i **film**

ordinate per `first_air_date.desc` / `primary_release_date.desc` su tutto il catalogo storico, **senza** vincolo `watch_region=IT`. Per questo restituiscono sempre risultati ricchi e ordinati.

La nostra implementazione attuale invece:
1. Usa `with_watch_providers=119|...` + `watch_region=IT` + `with_watch_monetization_types=flatrate`
2. Filtra per finestra date stretta sulla **prima messa in onda assoluta del titolo** (non sulla data di arrivo IT)
3. Applica `vote_count.gte` minimi e una post-validazione `/watch/providers IT`

Risultato: per Prime Video / Disney+ / HBO Max il Catalogo Italia rende spesso vuoto o quasi, perché `first_air_date` di una serie storica non cade mai nei "prossimi 7/30/90 giorni" anche se il titolo è uscito ieri sulla piattaforma in IT.

## Soluzione

Allineare il backend alla **stessa logica TMDB** usata dalle pagine che hai linkato, mantenendo però la garanzia "disponibile in IT" per la coerenza.

### 1. Edge function `streaming-releases` — nuova action `new-italy`

Aggiungo mapping network/company per ciascun provider:

```ts
const PROVIDER_TMDB_IDS = {
  netflix: { network: 213,  company: 145174 }, // Netflix
  prime:   { network: 1024, company: 20580 },  // Amazon / Amazon Studios
  disney:  { network: 2739, company: 2 },      // Disney+ / Walt Disney Pictures
  hbo:     { network: 8304, company: 174 },    // HBO Max / Warner Bros
};
```

Cambio strategia di Discover quando viene scelto un provider:

- **TV**: `with_networks=<networkId>` + `sort_by=first_air_date.desc`
- **Movie**: `with_companies=<companyId>` + `sort_by=primary_release_date.desc`
- Niente più `with_watch_providers` per queste due chiamate
- Niente più finestra date obbligatoria: la pagina TMDB non la usa, ordiniamo per data desc e prendiamo le prime N. La finestra date diventa un **filtro opzionale** lato client per la card "Prossimi 7/30 giorni".

Quando provider = "all" (Tutti i provider IT): faccio le 4 chiamate per-network in parallelo (Netflix/Prime/Disney/HBO) per le serie + le 4 per-company per i film, dedup per `tmdbId`, e mantengo la whitelist mainstream IT come garanzia di disponibilità.

### 2. Filtro "disponibile in IT"

Manteniamo l'arricchimento `/watch/providers/IT` per ogni candidato (cache 1h già presente) e:

- Se l'utente ha scelto un provider singolo → richiediamo che il titolo abbia quel provider in `flatrate IT`
- Se l'utente ha scelto "Tutti" → richiediamo solo che ci sia almeno un provider mainstream IT in `flatrate/free/ads`

Questo garantisce: **se un titolo non è in IT, non compare** (rispetta il tuo requisito originale).

### 3. Filtri (range, kind, genere, sort)

- **Range periodo (7/30/90 gg)**: applicato come post-filter sulla `releaseDate` del titolo. Se "Prossimi 7 giorni" non ha risultati per il provider selezionato, mostro chiaramente "Nessuna uscita in questa finestra" e in fondo mostro le ultime N uscite del provider come fallback (con label "Uscite recenti").
- **Kind (Tutti/Film/Serie)**: già funzionante, lo mantengo.
- **Genere**: passato come `with_genres=<id>` alle Discover (id condivisi tra movie e tv per i generi base TMDB della select attuale).
- **Sort**: `release` (default) → `*_date.desc` server-side; `popularity` → `popularity.desc`.

### 4. Soglia `vote_count`

La tolgo per la modalità "per network/company" (pagina TMDB ufficiale non la usa). Introduco solo `vote_count.gte=1` minimo per scartare titoli ghost senza alcun riscontro.

### 5. UI `StreamingPage.tsx`

- Nessun cambiamento ai controlli (chip provider, select range/genere/sort, chip kind).
- Aggiungo gestione del nuovo flag `fallbackRecent: true` restituito dal backend quando il range stretto è vuoto e mostriamo "uscite recenti" come ripiego, con messaggio dedicato: *"Nessuna uscita su {provider} nei prossimi {N} giorni — mostriamo le uscite più recenti."*
- Mantengo il `widenedWindow` esistente per il caso "Tutti i provider".

### 6. Verifica reale post-deploy

Faccio `curl` mirati con i 4 provider × {movie, tv} e ordinamenti, controllo che:

- Netflix → presenta serie come *Stranger Things*, *Squid Game*, *Wednesday* ordinate per data
- Prime Video → *The Boys*, *Fallout*, *Reacher*
- Disney+ → *The Mandalorian*, *Loki*, *Andor*
- HBO Max → *House of the Dragon*, *The Last of Us*

Se uno di questi non risponde, è anomalia da indagare prima di chiudere.

## File toccati

- `supabase/functions/streaming-releases/index.ts` — nuova logica `new-italy` per-network/company, fallback recent, mapping ID
- `src/hooks/useStreamingData.ts` — aggiungo `fallbackRecent?: boolean` al tipo `ReleasesItalyPayload`
- `src/pages/StreamingPage.tsx` — messaggio dedicato per `fallbackRecent`
- `src/lib/version.ts` — bump a `2.3.3`
- `changelog.md`, `README.md` — entry "Streaming Catalogo Italia: discovery per-network/company allineato a TMDB"

## Cosa NON cambia

- Nessuna modifica al tab "TV stasera"
- Nessun cambiamento ai controlli UI (filtri, sort, range, genere, chip kind, chip provider)
- Nessun mock o dato hardcoded — tutto resta TMDB live
- Lingua IT e fuso `Europe/Rome` rispettati
- Workflow Git/Lovable invariato
