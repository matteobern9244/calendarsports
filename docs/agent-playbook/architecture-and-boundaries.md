# Architettura e confini

## Scopo

Questa guida vale per modifiche a route, pagine, componenti, hook e al modo in
cui il frontend parla con le edge function. Per lo schema e il dettaglio delle
funzioni consulta [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). Si applicano
sempre anche le regole root in [`AGENTS.md`](../../AGENTS.md).

## Regole

### La struttura di `src/` non è negoziabile senza motivo

- `src/pages/` — una pagina per route, esportata come default. Il routing è
  dichiarativo in `src/App.tsx`: niente data router, niente loader.
- `src/components/common/` — componenti trasversali riusabili
  (`ErrorState`, `LoadingState`, `OfflineFallback`, `EventCard`, `TeamLogo`).
- `src/components/ui/` — **generati dalla CLI shadcn, non si scrivono a mano.**
  Esportano di proposito varianti e hook accanto al componente: separarli
  romperebbe il ri-allineamento con la CLI. Per questo sono esentati da
  `react-refresh/only-export-components` e da `check:italian`.
- `src/hooks/` — un hook per concetto. I dodici hook di dati stanno in
  `useSportsData.ts` e `useStreamingData.ts` e sono involucri sottili attorno a
  React Query.
- `src/lib/` — logica pura e senza React. È il posto giusto per tutto ciò che
  vuoi poter testare senza montare un componente.

Una pagina non importa da un'altra pagina. Se due pagine hanno bisogno della
stessa cosa, quella cosa scende in `components/common/` o in `lib/`.

### Il client Supabase si importa da un solo punto

Sempre da `@/lib/supabaseClient`, **mai** da `@/integrations/supabase/client`.

Il file auto-generato legge `import.meta.env` senza rete di sicurezza. In alcune
build di produzione quelle variabili non venivano iniettate, il client nasceva
con `URL = undefined`, e le richieste finivano su
`https://<host>/undefined/functions/v1/...`, che risponde HTML con stato 200.
React Query non vedeva un errore: vedeva una risposta valida che non era JSON, e
restava in caricamento per sempre. Un guasto che dalla UI sembra lentezza.

Il divieto è una regola ESLint (`no-restricted-imports` in
[`eslint.config.js`](../../eslint.config.js)) e vale anche ora che il file
generato non esiste: serve proprio a coprire il caso in cui Lovable lo rigeneri.

### I dati arrivano solo da React Query

Nessun `fetch` dentro i componenti. Il trasporto vive in
`src/lib/api/sportsApi.ts`, gli hook in `src/hooks/`, i componenti consumano.

Il retry sta in **un solo** livello: `fetchEdgeWithRetry` riprova su 502/503/504
con backoff. Il `QueryClient` non deve riprovare a sua volta, altrimenti i due
livelli si moltiplicano e una edge function fredda produce una raffica di
richieste per ogni query in pagina.

### Lo stato si aggiusta durante il render, non in un effect

Per azzerare la paginazione quando cambia un filtro, confronta il valore con
quello del render precedente:

```tsx
const [prevFilter, setPrevFilter] = useState(filter);
if (prevFilter !== filter) {
  setPrevFilter(filter);
  setPage(1);
}
```

Farlo in un `useEffect` sembra equivalente e non lo è: gli effect girano **anche
al mount**. La pagina arrivata da `?page=3` veniva riscritta a 1 prima ancora di
essere mostrata, e l'URL riscritto senza il parametro. Il deep-link era rotto in
silenzio. Lo intercetta `react-hooks/set-state-in-effect`.

### Niente valori impuri durante il render

`Math.random()` e `Date.now()` non si chiamano dentro il corpo di un componente
né dentro una `useMemo`: il risultato non è riproducibile e React non può
ricalcolarlo in sicurezza. Per l'orario corrente esiste `useNowMinute()` /
`useNowSecond()` (`src/hooks/useNow.ts`), che leggono il clock condiviso come
store esterno. Per i valori casuali, generali dentro un effect e conservali in
stato. Lo intercetta `react-hooks/purity`.

## Contratti: il confine con le edge function

Ogni funzione risponde con questa busta:

```json
{ "success": true, "data": <payload>, "meta": { "dataSource": "...", "source": "..." } }
```

`callEdgeFunction` solleva quando `success` è falso, e restituisce `data`.
`callEdgeFunctionWithMeta` restituisce entrambi: la usa `useSyncAll` per capire
se una sezione sta servendo dati vivi o degradati.

**Alcune funzioni impaginano solo se glielo chiedi**, e non lo fanno tutte allo
stesso modo:

| Funzione                   | Senza `page`/`pageSize` | Con `page`/`pageSize`                                             |
| -------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `sports-football:calendar` | array nudo              | `{ items, total, page, pageSize, totalPages, nextUpcomingIndex }` |
| `sports-tennis:results`    | array nudo              | `{ items, pagination: { page, pageSize, total, totalPages } }`    |

Le due forme sono diverse per ragioni storiche, non per disegno. Chi legge deve
accettarle entrambe: `matchesOf` in `src/pages/JuventusMatchPage.tsx` è
l'esempio. **Le fixture end-to-end replicano questo contratto** (`paginate` in
`e2e/support/mockSportsApi.ts`): una fixture che restituisce sempre l'array nudo
ha già nascosto per mesi un crash della pagina Juventus, perché il codice reale
leggeva `calendar.items.length` su `undefined` e l'unico test che passava di lì
non se ne accorgeva.

`streaming-tv` e `streaming-releases` **non** restituiscono `meta`: per loro la
distinzione live/degradato non è disponibile lato client.

## Verifiche

```bash
bun run typecheck        # tsc -b, strict
bun run lint             # eslint, zero avvisi ammessi
bun run test             # unità
bun run test:e2e         # navigazione reale con mock
```

Il gate completo è `bun run verify`.

## Riferimenti

- Fonti dati, fuso orario e stagioni: [`data-sources-and-time.md`](data-sources-and-time.md).
- Dove mettere le mani per area: [`area-entrypoints.md`](area-entrypoints.md).
- Test, guardiani e consegna: [`verification-and-change-management.md`](verification-and-change-management.md).
- Schema, route e funzioni nel dettaglio: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
