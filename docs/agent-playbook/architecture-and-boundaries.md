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

### Le chiavi si compongono, e il placeholder si ferma al confine della lista

Le chiavi di cache stanno tutte in `src/lib/queryKeys.ts`, anche quelle di un
`prefetchQuery` dentro una pagina. Una chiave paginata si compone: prima cio'
che identifica la lista (`calendarList`: squadra, stagione, filtro), poi
`page` e `pageSize` in coda. Quel prefisso non e' cosmetico — e' come
`keepPreviousPageOf` distingue «un'altra pagina» da «un'altra squadra».

`placeholderData: (prev) => prev` e' **vietato**: React Query passa i dati
dell'ultima query osservata dallo stesso hook qualunque fosse la sua chiave,
quindi al cambio squadra serve le partite di quella precedente sotto
l'intestazione di quella nuova — senza errore e senza spinner. Si usa
`keepPreviousPageOf(<chiave della lista>)` da `src/lib/queryPlaceholder.ts`.

Il controllo eseguibile e' il guardiano in `src/lib/queryPlaceholder.test.ts`,
non questa sintesi.

### Una richiesta possiede esattamente i campi che ha toccato

Le preferenze si scrivono in anticipo sul server (`onMutate` in
`src/hooks/useProfile.ts`): `UserPrefsContext` legge il profilo prima del
valore locale, quindi senza anticipo dal clic alla risposta della rete la
pagina non e' lenta, mostra la preferenza **precedente** come se fosse quella
scelta.

L'unita' di misura dell'anticipo e' l'insieme dei campi del `patch`, non il
profilo intero — in avanti, all'indietro sul rollback, e anche quando si
scrive la risposta del server. Tema, squadra e sezioni partono come tre
richieste separate a un istante di distanza: fotografare e ripristinare tutto
il profilo farebbe disfare, al fallimento di una, la modifica accanto che il
server aveva gia' accettato; e copiare in cache per intero la riga che il
server restituisce riporterebbe indietro un campo che quella richiesta non
aveva nemmeno chiesto di cambiare, perche' la riga e' stata letta prima.

`onMutate` comincia con `cancelQueries`: una lettura gia' in volo risponde con
la riga di prima e, atterrando dopo, cancella l'anticipo — stesso sintomo, da
un'altra porta.

I controlli eseguibili sono in `src/hooks/useProfile.test.tsx` e `src/contexts/UserPrefsContext.test.tsx`, non questa
sintesi.

### La preferenza grezza si ferma al contesto

`favoriteTeam` non e' una stringa: e' una `SerieATeam`, risolta una volta sola
in `UserPrefsContext` con `resolveTeam`, che e' totale. La preferenza e' nata
come casella di testo libero, quindi in `profiles.favorite_team` e in
`localStorage` puo' esserci un nome, un alias, uno spazio o niente — e nessuno
di quei valori deve arrivare a una chiave di cache, a un parametro di edge
function o a una URL. Il tipo e' li' apposta: chi ha bisogno dello slug deve
scrivere `.slug`, e non puo' prenderlo per sbaglio da una stringa non
validata.

Vale anche in uscita. `loadLocalTeam` risolve **prima** di restituire, perche'
quel valore non serve solo a mostrare qualcosa: al primo accesso la migrazione
lo copia sul profilo, e un nome digitato anni fa finirebbe cosi' dentro la
colonna da cui lo si sta togliendo.

E lo specchio locale si disfa insieme al profilo. Squadra e sezioni scrivono
`localStorage` in anticipo come la cache, quindi un salvataggio rifiutato va
annullato in tutti e due i posti: il ripristino sta nel gestore che ha scritto
lo specchio (`onError` della singola `mutate`), per la stessa ragione per cui
il rollback della cache sta nella richiesta che ha toccato quei campi. Il tema
e' l'eccezione, e non per dimenticanza: l'effect che riallinea `useTheme` al
profilo lo riporta indietro da solo.

E dal lato dello schermo la tendina e' **pilotata**, non inizializzata:
`TeamSelect` riceve `value`, mai `defaultValue`. La preferenza cambia anche da
fuori — il profilo che arriva dal server al primo accesso, un salvataggio
rifiutato che viene annullato — e un controllo non pilotato continuerebbe a
mostrare la squadra vecchia senza che niente lo segnali. Il controllo
eseguibile e' `src/components/preferences/TeamSelect.test.tsx`: e' l'unica
verifica che uccide quella mutazione, perche' la e2e non ha modo di far
cambiare la preferenza da fuori senza una sessione.

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

### Le edge function passano dal typecheck, ma con un progetto loro

`tsconfig.app.json` include soltanto `src`. Per questo le edge function hanno il
proprio progetto, [`tsconfig.edge.json`](../../tsconfig.edge.json), referenziato
da `tsconfig.json` e quindi incluso in `tsc -b`. Prima non c'erano: 27 file di
produzione il cui unico controllo era ESLint, che i tipi non li vede.

Girano su Deno, che qui non esiste. Le sue API sono dichiarate a mano in
[`types/edge.d.ts`](../../types/edge.d.ts), **solo quelle usate e con la firma
vera**: un `declare const Deno: any` farebbe passare il typecheck senza
controllare niente, il che è peggio di non averlo perché somiglia a copertura.
Il file vive fuori da `supabase/functions/` perché quella cartella è
esattamente ciò che Supabase impacchetta al deploy.

Stesso discorso per i test end-to-end, che hanno
[`tsconfig.e2e.json`](../../tsconfig.e2e.json): una suite che non compila non
fallisce nel gate, fallisce quando qualcuno la lancia.

Che nessun file TypeScript resti fuori da tutti i progetti lo verifica
`src/test/tooling/typecheckCoverage.test.ts`, dentro `bun run test`.

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
