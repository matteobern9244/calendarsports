
## Cosa succede oggi

La edge function `streaming-releases?action=new-italy` risponde 200 con dati reali, ma il catalogo che esce è pieno di titoli di nicchia (es. "Black Holes Suck" su Plex con popolarità 0.15) perché:

1. La query TMDB Discover usa la finestra `primary_release_date` (prima uscita mondiale) anziché l'ingresso effettivo sulle piattaforme IT, quindi pesca tantissimi titoli marginali con almeno una disponibilità qualunque in Italia.
2. Manca una soglia di qualità: niente `vote_count.gte`, niente filtro popolarità, niente esclusione di titoli senza poster/overview.
3. L'ordinamento di default è "data uscita desc": i titoli noti vengono sepolti dietro micro-release recenti.
4. Il filtro provider include qualsiasi piattaforma (anche Plex/Pluto) e non c'è una whitelist dei provider rilevanti per il pubblico italiano (Netflix, Prime, Disney+, Sky/NOW, Apple TV+, Paramount+, RaiPlay, Mediaset Infinity, Crunchyroll).

Risultato: l'utente vede quasi sempre poche uscite oscure → percezione "non ci sono risultati".

Riferimento: starflicks.it ordina per popolarità, mostra solo titoli con voti reali, e raggruppa per provider mainstream IT.

## Cosa cambia

### Edge function `streaming-releases` (azione `new-italy`)

- Aggiunta whitelist provider IT rilevanti (`watch_providers` IT principali + RAI/Mediaset/DAZN/Crunchyroll). Quando `provider=all`, passare a TMDB `with_watch_providers` come OR-list di questa whitelist (separatore `|`), così Discover restituisce solo titoli realmente in catalogo sulle piattaforme che contano.
- Aggiunto `vote_count.gte=20` (movie) e `vote_count.gte=10` (tv) per tagliare i titoli senza riscontro reale del pubblico.
- Default `sort_by=popularity.desc` (allineato a starflicks.it). L'ordinamento "data uscita" resta opzionale dal client.
- Allargata la finestra di ricerca lato server quando l'utente non specifica date: `dateFrom = today-30`, `dateTo = today+60`, così "Catalogo Italia" mostra anche le novità recenti già disponibili.
- Discover paginato fino a 2 pagine (40 titoli per kind) per dare materiale sufficiente al filtro client; cap finale a 60 item ordinati.
- Esclusione titoli senza poster (poster_path nullo).
- Arricchimento `/watch/providers` IT invariato, ma scarta gli item che dopo l'arricchimento non hanno alcun provider della whitelist IT (evita "solo Plex").

### Client `src/pages/StreamingPage.tsx` + `src/hooks/useStreamingData.ts`

- Default `sort = "popularity"` (era `"release"`).
- Default `range` resta `30d` ma la finestra effettiva è gestita lato server (today-30 … today+60).
- Empty state differenziato: se l'edge function ritorna `configured: true` ma `items: []`, suggerire allargamento finestra a 90d e reset filtro genere.
- Mostrare nella card un piccolo badge "Disponibile su" con il logo del primo provider mainstream IT (Netflix/Prime/Disney+ ecc.), non il primo qualsiasi.
- Nel selettore `ItalyProviderFilter` allineare l'elenco alla nuova whitelist rilevante per IT (rimuovere provider esotici).

### Documentazione

- `changelog.md`: voce v2.3.1 "Catalogo Italia: filtro provider mainstream IT, soglia voti, ordinamento per popolarità di default".
- `README.md`: sezione Streaming aggiornata con lista provider whitelist e logica anti-noise.
- `src/lib/version.ts`: bump a `2.3.1`.

## File toccati

- `supabase/functions/streaming-releases/index.ts`
- `src/pages/StreamingPage.tsx`
- `src/hooks/useStreamingData.ts`
- `src/lib/api/sportsApi.ts` (solo se serve esporre `kind`/`sort` default diversi)
- `src/lib/version.ts`
- `changelog.md`
- `README.md`

## Cosa NON cambia

- Nessuna modifica al workflow Git, nessun push diretto su `main`.
- Nessuna modifica alle altre azioni dell'edge function (`new-today`, `details`, `credits`).
- Nessun mock o dato hardcoded: tutto resta TMDB live in regione IT.
- UI italiano, fuso `Europe/Rome` rispettati.
