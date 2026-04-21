

## Fix definitivo: crash `Cannot read properties of undefined (reading 'find')` su pagina dettaglio Juventus

### Diagnosi (verificata su edge function live)

`JuventusMatchPage.tsx` chiama `useJuventusCalendar(season, undefined, undefined)` quando `searchPage === 1` (righe 70-74). L'edge function `sports-football?action=calendar` ha **due forme di risposta**:

- **Senza `page` né `pageSize`** → ritorna `data = allMatches` (array piatto).
- **Con `page` o `pageSize`** → ritorna `data = { items, total, page, pageSize, totalPages, nextUpcomingIndex }`.

Confermato via curl reale: la chiamata paginata funziona, l'id `2025-giornata-26-juventus-como` esiste correttamente a pagina 4 di 5.

Nel frontend, `firstPage` viene typato come `PaginatedCalendar` ma in realtà arriva come **array piatto**. Quindi `findMatch(searchData, ...)` esegue `calendar.items.find(...)` su un array → `array.items` è `undefined` → crash.

Inoltre `searchPage >= searchData.totalPages` non scatta mai perché `totalPages` è `undefined`, quindi anche la guard di paginazione è rotta.

### Fix

Una sola pagina, una sola modifica chirurgica in `src/pages/JuventusMatchPage.tsx`:

**Forzare sempre la forma paginata.** Passare esplicitamente `searchPage` e `PAGE_SIZE` in entrambe le query, anche per la prima:

```ts
const firstPageQuery = useJuventusCalendar(season, 1, PAGE_SIZE);
const searchQuery = useJuventusCalendar(season, searchPage, PAGE_SIZE);
const searchData = (searchPage === 1 ? firstPage : (searchQuery.data as PaginatedCalendar | undefined));
```

Con questa modifica:
- `firstPage` arriva come `{items, totalPages, ...}` (paginato).
- `searchData.items.find(...)` non crasha più.
- La paginazione (`searchPage >= searchData.totalPages`) funziona correttamente.
- React Query unisce automaticamente `firstPageQuery` e `searchQuery` quando `searchPage === 1` perché hanno la stessa `queryKey` `["juventus","calendar",season,1,12]`.

Difesa in profondità: in `findMatch`, prima del `.find()` aggiungere guard `if (!Array.isArray(calendar?.items)) return null;` per evitare crash futuri se la shape cambia upstream.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/pages/JuventusMatchPage.tsx` | EDIT | Riga 70-75: passare sempre `searchPage` + `PAGE_SIZE` a `useJuventusCalendar`. Riga 41-51: aggiungere guard `Array.isArray(calendar?.items)` in `findMatch`. |

### Cosa NON cambia

- Nessuna modifica al backend (l'edge function è già corretta e deploya il campo `id`).
- Nessuna modifica all'API client, ai test, ai hook.
- Nessuna modifica alle altre pagine.
- Nessuna modifica al routing.
- Branch policy invariata.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`.
2. Apertura preview `/juventus`:
   - Click su "Juventus–Como" (giornata 26) → carica pagina dettaglio reale di Juventus–Como.
   - Click su "Juventus–Parma" (giornata 1) → mostra Juventus–Parma.
   - Click su altre partite → ognuna mostra i propri dati.
   - URL inesistente (es. `/juventus/partite/foo`) → mostra "Partita non trovata", non crash.
3. Verifica console: nessun errore React, nessun ErrorBoundary.

### Checklist post-edit

1. `useJuventusCalendar` chiamato sempre con `searchPage` + `PAGE_SIZE` espliciti.
2. `findMatch` resiste a shape inattese (`Array.isArray` guard).
3. Tutte le partite Juventus aprono il proprio dettaglio reale.
4. Nessun "Cannot read properties of undefined" in console.

