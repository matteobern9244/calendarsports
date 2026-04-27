## Obiettivo

Nella sezione **Streaming → Nuove uscite** semplificare l'esperienza in un'unica vista "Catalogo Italia" che mostra solo titoli effettivamente disponibili in Italia, con tutti i filtri davvero funzionanti e default ordinamento per data di uscita.

## Problemi attuali

1. Esiste un toggle "Catalogo Italia" / "Per provider" che confonde: la vista "Per provider" usa una query separata (`new-today`) limitata a 4 piattaforme e con logica diversa, sovrapposta a Catalogo Italia.
2. Default ordinamento è "Popolarità" ma deve essere "Data uscita".
3. Con range "Prossimi 7 giorni" il Catalogo Italia restituisce 0 risultati: la finestra è troppo stretta per come TMDB indicizza (`primary_release_date` / `first_air_date` ≠ data ingresso piattaforma) e i filtri qualità (`vote_count.gte=20`) tagliano tutto.
4. La garanzia "solo titoli disponibili in IT" oggi si basa solo sulla whitelist provider mainstream IT, ma manca un fallback automatico server-side che allarghi la finestra quando vuota (esiste solo per `new-today`).
5. Genere selezionato con `kind=all` deve filtrare entrambi i kind in modo coerente (gli ID generi tra movie e tv non coincidono al 100%, ma quelli usati nella select sì — confermato).

## Modifiche

### UI `src/pages/StreamingPage.tsx`

- **Rimuovere il toggle Catalogo Italia / Per provider** e tutto il blocco "Per provider":
  - Rimuovere stato `view`, `provider`, `onlyUpcoming`, `releasesQuery`, `ProviderSelector`, `ItalyProviderFilter` legato a "all/netflix/...".
  - Mantenere solo il filtro **provider IT opzionale** con chip "Tutti / Netflix / Prime Video / Disney+ / HBO Max" (già `ItalyProviderFilter`), come unico modo per restringere a un provider.
  - Rimuovere chip "Solo in arrivo" (esisteva solo nella vista provider; il concetto è già implicito nella finestra date).
- **Default ordinamento**: `sort` iniziale da `"popularity"` → `"release"`. Aggiornare anche la condizione di sync URL (`if (sort !== "release")` invece di `!== "popularity"`).
- **Empty state unificato** che cita la finestra effettiva restituita dal server (`effectiveFrom`/`effectiveTo`) quando il backend ha allargato automaticamente.
- **Header sezione**: sottotitolo passa a "Palinsesto TV serale e nuove uscite in Italia".
- Pulsante "Allarga finestra" resta come scorciatoia per portare il range a 90d.

### Hook + tipi `src/hooks/useStreamingData.ts`

- Tipo `ReleasesItalyPayload` aggiunge: `widenedWindow?: boolean`, `effectiveFrom?: string`, `effectiveTo?: string` (allineato a `ReleasesPayload`).
- Nessuna nuova query: `useReleasesByProvider` resta esportato per non rompere altre eventuali importazioni, ma non viene più usato dalla pagina.

### Edge function `supabase/functions/streaming-releases/index.ts` — action `new-italy`

- **Default sort server-side**: cambiare default da `popularity.desc` a `release` (sort_by `primary_release_date.desc` / `first_air_date.desc`) per allinearsi al nuovo default UI. Il client passa comunque `sort` esplicito, ma il default deve essere coerente.
- **Validazione "in uscita in Italia" rinforzata**: la post-filter già scarta titoli che dopo `/watch/providers` IT non hanno alcun provider whitelist IT. Aggiungere nello stesso step: scartare anche titoli senza `releaseDate` (data nulla = non comparabile come "uscita in IT").
- **Fallback automatico finestra date** (parità con `new-today`):
  - Dopo aver costruito `items`, se `items.length === 0` e l'utente ha passato `dateFrom`/`dateTo` espliciti, rifare la query con `widenedFrom = dateFrom - 14gg`, `widenedTo = dateTo + 30gg`.
  - Restituire nel payload: `widenedWindow: true`, `effectiveFrom`, `effectiveTo` quando il fallback scatta.
  - Evita lo stato "Nessun titolo" per range stretti (7d) come visto nello screenshot utente.
- **Soglia voti meno aggressiva sui range stretti**: quando `dateFrom..dateTo` ≤ 14 giorni, abbassare `vote_count.gte` a `5` (movie) / `2` (tv): le novità imminenti spesso non hanno ancora voti accumulati.
- **Quando un provider singolo è selezionato**: bypassare la whitelist mainstream e usare solo quel provider id (già implementato), ma mantenere comunque il filtro `vote_count` adattivo.

### File toccati

- `src/pages/StreamingPage.tsx` (semplificazione vista, rimozione toggle, default sort)
- `src/hooks/useStreamingData.ts` (tipo payload)
- `supabase/functions/streaming-releases/index.ts` (default sort, fallback finestra, vote threshold adattivo)
- `src/lib/version.ts` (bump a `2.3.2`)
- `changelog.md`, `README.md` (entry "Streaming: vista unificata Catalogo Italia, fallback finestra automatico")

## Comportamento atteso dopo

- Aprendo `/streaming?tab=releases` si vede una sola vista "Catalogo Italia".
- I chip provider permettono di restringere a Netflix / Prime / Disney+ / HBO Max o lasciare "Tutti".
- I select periodo / generi / sort sono visibili sempre e funzionanti.
- Default sort: "Ordina per data uscita".
- Con range 7 giorni e nessun risultato esatto, il backend allarga in automatico e restituisce comunque titoli reali in uscita IT, con un'indicazione testuale tipo "Finestra ampliata a {effectiveFrom} → {effectiveTo} per mostrare risultati".
- Nessun titolo che non è disponibile in IT su provider mainstream comparirà più nelle card.

## Cosa NON cambia

- Nessuna modifica al tab "TV stasera".
- Nessuna modifica alle action `details` / `credits` dell'edge function.
- Nessuna modifica al workflow Git o a Lovable sync.
- Nessun mock o dato hardcoded: tutto resta TMDB live region IT.
- UI italiano e fuso `Europe/Rome` rispettati.
