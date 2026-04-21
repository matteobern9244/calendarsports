

## Paginazione calendario Juventus (frontend + backend)

### Stato attuale

`supabase/functions/sports-football` action `calendar` scarica tre widget Sky (Serie A, UCL, Coppa Italia) + broadcaster map Lega Serie A, fa parsing HTML, filtra solo le partite Juventus, ordina per data e restituisce **l'intero array** (tipicamente 40-60 match per stagione). Il frontend in `JuventusPage.tsx` tab "Calendario" rende **tutte** le card insieme in una grid 2 colonne, con `prioritizeNextUpcoming` per evidenziare la prossima.

Non c'è alcuna paginazione: scroll lungo, render iniziale pesante, nessun indicatore di posizione.

### Approccio

Paginazione **ibrida**:

- **Backend**: l'edge function continua a fare scraping completo (necessario perché Sky non espone pagination upstream e serve l'array completo per ordinare cronologicamente cross-competition), ma accetta `page` e `pageSize` opzionali e restituisce solo la slice richiesta + metadata `{ total, page, pageSize, totalPages }`.
- **Frontend**: la pagina passa `page` + `pageSize` alla query, mostra la slice e un `Pagination` UI sotto la grid. Default `pageSize=12` (6 righe x 2 colonne), default `page` = pagina che contiene la "prossima partita" (per landing UX coerente con `prioritizeNextUpcoming`).

Se `page`/`pageSize` non vengono passati (retrocompatibilità con altri client), il backend restituisce l'array intero come oggi.

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-football/index.ts` | Action `calendar`: leggere `page` e `pageSize` da query params, validare (`pageSize` 1-50, `page` >= 1), calcolare slice dopo l'ordinamento, restituire `{ items, total, page, pageSize, totalPages }` quando i parametri sono presenti; altrimenti payload attuale (array piatto) per non rompere altri eventuali consumer. |
| `src/lib/api/sportsApi.ts` | `footballApi.getCalendar(season, page?, pageSize?)`: passare i parametri quando definiti. Tipare il return come union (array legacy oppure oggetto paginato). |
| `src/hooks/useSportsData.ts` | `useJuventusCalendar(season, page, pageSize)`: includere `page`/`pageSize` nella `queryKey`, `keepPreviousData: true` per UX fluida tra cambi pagina. |
| `src/pages/JuventusPage.tsx` | Stato locale `page` (default 1), costante `PAGE_SIZE = 12`. Calcolare `defaultPage` al primo load mappando l'indice della prossima partita (via `prioritizeNextUpcoming` su `items`). Renderizzare solo `items` ricevuti. Aggiungere componente `Pagination` (shadcn `src/components/ui/pagination.tsx` già presente) sotto la grid con prev/next + numeri pagina (con ellipsis se `totalPages > 7`). Reset pagina a 1 al cambio stagione. |
| `changelog.md` | Voce sotto Unreleased: "Juventus: aggiunta paginazione (backend + frontend) al calendario partite, default 12 match per pagina, landing sulla pagina della prossima partita." |

### Dettagli UX

- **Landing page intelligente**: al primo render con `data` disponibile, calcolare `Math.floor(highlightIndex / PAGE_SIZE) + 1` e impostarlo come pagina iniziale solo se l'utente non ha ancora interagito (flag locale).
- **Highlight "Prossima"**: continua a funzionare perché il backend ordina cronologicamente prima di paginare; basta passare anche l'indice globale della prossima partita nei metadata, oppure ricalcolarlo lato frontend usando i flag `status !== 'FullTime'` sui soli `items` della pagina corrente.
- **Counter**: piccolo testo sopra la grid tipo "Partite 13-24 di 47".
- **Mobile**: paginazione full-width, prev/next prominenti, numeri compressi.

### Cosa NON cambia

- Fonti Sky Sport / Lega Serie A.
- Logica scraping, broadcaster mapping, competizioni incluse.
- Tab "Classifica" (nessuna paginazione necessaria).
- Tipi card, animazioni, badge competizione, broadcaster pills.
- Versione resta **2.1.0**.

### Rischi

- Cambio shape risposta `calendar`: mitigato mantenendo retrocompatibilità (array piatto se nessun parametro).
- `keepPreviousData` evita flicker tra pagine ma può mostrare brevemente dati stale: accettabile.
- Se l'utente cambia stagione mentre è a pagina 4, il reset a pagina 1 evita richieste fuori range.

### Checklist post-edit

1. Deploy edge function `sports-football`.
2. Curl `calendar?season=2026&page=1&pageSize=12` → verificare struttura `{ items, total, page, pageSize, totalPages }`.
3. Curl `calendar?season=2026` (senza pagination) → verificare array piatto legacy.
4. `/juventus` tab "Calendario": landing su pagina con "Prossima", numeri pagina visibili, prev/next funzionanti, contatore corretto.
5. Cambio stagione → reset a pagina 1, nessuna richiesta out-of-range.
6. `npm run lint` + `npm run build`.
7. Aggiornare `changelog.md`.
8. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

