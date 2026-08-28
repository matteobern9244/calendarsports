# WIP — audit completo, punto di ripresa

Lavoro in corso sul branch `develop`. Questo file esiste per poter riprendere a
freddo: dice cosa è stato fatto, cosa resta, e dove ricominciare esattamente.

Il piano completo da cui nasce il lavoro si chiama **«Audit completo
calendarsports — Piano di implementazione»** e vive fuori dal repository, in
`~/.claude/plans/fai-un-audit-completo-splendid-rainbow.md`. Contiene le sette
fasi con i task numerati citati qui sotto, la matrice delle dipendenze verificate
sul registro npm e la tabella dei rischi per ogni cluster di aggiornamento.

## Stato verificato al momento dell'interruzione

Misurato, non ricordato:

```text
bun run verify   → exit 0 (typecheck, lint, italiano, fuso, test, build)
bun run test     → 208 test su 20 file, tutti verdi
bun run test:e2e → 4 test verdi
bun audit        → No vulnerabilities found
bun outdated     → solo typescript 5.9.3 (fermo di proposito, vedi sotto)
```

Il tree è pulito. La CI **non è ancora stata eseguita** sulla nuova
configurazione: `ci.yml` sostituisce i due workflow precedenti e va guardata al
primo push.

## Decisioni prese, da non rimettere in discussione

- **Bun** è il package manager, un solo lockfile `bun.lock`.
- **Vite 8** con `@vitejs/plugin-react` (il plugin SWC si ferma a Vite 7).
- **Tailwind 4**, configurazione nel blocco `@theme` di `src/index.css`. Non
  esiste più `tailwind.config.ts`.
- **react-router 8**, importato da `react-router` (lo shim `react-router-dom` si
  è fermato alla 7 ed è stato rimosso).
- **TypeScript resta sulla 5.9.** `typescript-eslint` dichiara
  `typescript <6.1.0`: la 7 spegnerebbe il linting type-aware. È l'unica voce
  che `bun outdated` mostra ferma, ed è ferma per questa ragione.
- **`.env` è tracciato** di proposito: serve a Lovable e contiene solo valori
  pubblici.
- **`tailwindcss-animate` non diventa `tw-animate-css`**: funziona via `@plugin`
  e le circa cento classi di animazione in uso non sono coperte da test.
- **Prettier è un errore di lint**, ultimo elemento della flat config. La
  formattazione non si discute più in review.
- **La CI lancia `bun run verify`**, non l'elenco dei suoi anelli: due elenchi
  separati divergono, ed è così che una CI smette di essere un gate.

## Fasi chiuse

**Fase 0 — baseline verde.** La CI era rossa da aprile. Rimossa una funzione
segnaposto mai chiamata che portava l'unico `@ts-ignore`; le fixture e2e ora
replicano il contratto di paginazione reale delle edge function, che è ciò che
faceva morire JuventusPage nell'ErrorBoundary.

**Fase 1 — igiene e Bun.** Un lockfile solo, `husky` e `lint-staged` fuori da
`dependencies`, quattro file morti rimossi, `.env` tracciato.

**Fase 2 — dipendenze.** Tutti i cluster completati. Oltre agli aggiornamenti,
29 componenti shadcn irraggiungibili e 26 dipendenze orfane sono stati **rimossi
invece che aggiornati**.

**Fase 3 — toolchain di qualità.** Prettier configurato, formattazione globale
in un commit isolato, poi reso obbligatorio. Lint esteso a `scripts/**`,
`e2e/**` e `supabase/functions/**`, che non erano analizzati da nessuna regola.
I tre test delle edge function ora girano davvero, e sul codice vero: la logica
pura è uscita in moduli importabili senza far partire `Deno.serve`. I due
workflow CI sono diventati uno. Aggiunti tre guardiani sul tooling in
`src/test/tooling/`.

**Fase 6.3 — tipizzazione dei payload al confine.** `callEdgeFunction` valida
ogni risposta con uno schema zod (`src/lib/api/schemas.ts`) e i tipi delle
pagine derivano da li'. Spariti i 25 `any` di `src/`,
`@typescript-eslint/no-explicit-any` e' di nuovo accesa. Restano fuori le
cinque azioni streaming, che passano da `declaredOnly`: e' la voce nuova del
ROADMAP che ha sostituito quella chiusa.

**Fase 6.1 — memoizzazioni.** `useCalendarEvents` restituiva un array
nuovo a ogni render: il tick da 60 secondi di `CalendarPage` rifaceva
l'espansione, il filtro e l'ordinamento di ~350 eventi e invalidava a
cascata le quattro `useMemo` della pagina. In `TonightTvList` la memo
dipendeva da `[tvQueries]`, cioe' dall'array che `useQueries` ricrea a
ogni render: ora l'aggregazione e' la sua `combine`, una funzione di
modulo. Hoistati i formatter `Intl`: misurato in Chromium, costruirne uno
per data costa 13,9 ms ogni 350 date contro 0,20 ms riusandolo.

**Fase 4 — struttura agentica e documentazione.** `.claude/` versionata,
AGENTS.md ridotto da 302 a 115 righe in forma di router, CLAUDE.md sottile,
cinque playbook in `docs/agent-playbook/`, i documenti tecnici
(ARCHITECTURE, DATA_SOURCES, SECURITY, CONTRIBUTING, ROADMAP), Renovate al posto
di Dependabot per npm.

## Da fare — riprendere da qui

### 1. Fase 6, i due task rimasti

Sono voci di [`docs/ROADMAP.md`](docs/ROADMAP.md), a priorità bassa e media;
ognuna ha lì costo e motivazione scritti.

- **Componenti giganti.** `StreamingPage` (828 righe), `TonightTvList` (760),
  `JuventusPage` (631), `CalendarPage` (601). Da estrarre per gradi: prima gli
  hook di derivazione, poi i presentazionali, poi un `SportPageShell` che
  unifichi il guardiano offline e la struttura a tab ripetuta in quattro pagine.
- **PWA e accessibilità** — voce «L'app installata non funziona offline», più le
  tre correzioni puntuali di a11y elencate nel piano (riga TV focusabile ma non
  interattiva, `aria-disabled` mancante su `PagerNav`, nomi accessibili sui
  bottoni evento del calendario).

### 2. Fase 5 — richiede te

Non è stata eseguita di proposito: tocca il database di produzione, e AGENTS.md
dice di non modificare Supabase senza richiesta esplicita. Tutto è documentato
in [`docs/SECURITY.md`](docs/SECURITY.md) e in cima a
[`docs/ROADMAP.md`](docs/ROADMAP.md).

- **Rotazione di `DISPATCH_SECRET`** (serve la dashboard Supabase). Il valore è
  in chiaro nella migration `20260523084606_*.sql`, è nella storia di Git e su
  GitHub, ed è l'unica autenticazione di `push-dispatcher`. Va considerato
  compromesso. Riscrivere la storia di `main` non è praticabile con la
  sincronizzazione Lovable attiva: è la rotazione a neutralizzarlo.
- `REVOKE USAGE ON SCHEMA extensions FROM anon, authenticated` — `pg_net`
  raggiungibile da `anon` è metà di una primitiva SSRF.
- Migration del cron **idempotente**: oggi `cron.unschedule` di un job
  inesistente solleva, quindi quella migration fallisce su un database nuovo.
- Dedupe atomico nel dispatcher: scrivere prima di inviare con
  `ignoreDuplicates`, invece di `SELECT` e poi `INSERT` con l'errore scartato.
  Produce notifiche doppie sui dispositivi reali.

### 3. Fase 7 — chiusura

Changelog e nota di rilascio. La versione attuale è `2.7.0` in `package.json` e
`src/lib/version.ts`; l'audit merita una `2.8.0` con la sua sezione in
`changelog.md` e la nota in `docs/releases/2.8.0-*.md`. Da recuperare anche la
serie `2.6.x`, che manca dal changelog pur avendo già una nota in
`docs/releases/`.

**Da non perdere**: otto voci sono state cancellate da `docs/ROADMAP.md` perché
realizzate, e la regola del ROADMAP dice che si spostano nel changelog. Vanno
quindi raccontate nella sezione 2.8.0: code splitting per route con
`ErrorBoundary` dentro `Layout`; chiavi di cache in una fabbrica sola; test
delle edge function eseguiti davvero; Prettier obbligatorio; lint esteso alle
tre aree scoperte; un solo workflow CI che lancia il gate locale; payload delle
edge function validati al confine con `no-explicit-any` riaccesa; calendario e
scheda TV che non ricalcolano più tutto a ogni render.

## Cose scoperte durante il lavoro che vale la pena ricordare

- **Un test-copia è peggio di nessun test: è verde e sbagliato.** Due file di
  test ricopiavano a mano la logica delle edge function e un terzo verificava
  le proprie fixture senza mai chiamare la funzione, perché `index.ts`
  chiama `Deno.serve` a livello di modulo e importarlo da un test farebbe
  partire un server. Appena i test hanno importato la funzione vera, uno è
  diventato rosso: la `GENRE_WHITELIST` ricopiata si era fermata a sei generi
  mentre quella di produzione ne ha decine. La cura non è un mock, è spostare
  la logica pura in un modulo che all'import non fa niente.
- **Un guardiano con una lista scritta a mano non fallisce mai: guarda sempre
  meno codice.** `check-rome-tz.mjs` aveva una lista di file, e `CalendarPage`
  non c'era. Ora un test in `src/test/tooling/` verifica il contrario: che ogni
  pagina che manipola date sia nella lista.
- **`new Date(Date.UTC(...))` è corretto e non va zittito.** Riceve un numero,
  non una stringa. Il guardiano del fuso ora lo riconosce, invece di farsi
  mettere a tacere da `@tz-ignore` su codice giusto.
- Estendere il lint a cartelle mai coperte ha trovato otto problemi reali in
  dieci minuti, fra cui uno zero-width space nascosto dentro `/* */` in
  `check-italian-ui.mjs` e due parser di date abbandonati.
- Il codemod di Tailwind ha rinominato anche il **valore della prop**
  `variant="outline"` in `"outline-solid"` su quattro bottoni, trattandolo come
  una classe CSS. Non l'ha visto né il lint né la build: l'ha trovato `tsc`
  quando è stato attivato `strict`. Dopo un codemod, rilanciare subito il
  typecheck.
- Su macOS il filesystem è case-insensitive: due moduli che differiscono solo
  per maiuscole collidono in locale e sono distinti su Linux in CI. È già
  successo con `PreferencesPanelContext.tsx` e `preferencesPanelContext.ts`.
- La lockfile rimasta indietro inchiodava i pacchetti transitivi a versioni
  vecchie: `bun audit` riportava 29 vulnerabilità che sono sparite tutte con un
  `bun install` da zero.
- Il wrapper del Toaster leggeva il tema da `next-themes`, che questa app non
  monta: i toast uscivano chiari sopra l'interfaccia scura. Le e2e sono basate
  sul testo e non lo vedevano; è stato trovato guardando uno screenshot.
- **Le e2e non coprono il rischio visivo.** Per Tailwind 4 sono state verificate
  a schermo Home, Juventus, Streaming, Calendario, F1 e Sinner in tema chiaro e
  scuro. Qualunque intervento sullo stile va verificato allo stesso modo.
- **Un campo che si chiama `constructor` non e' mai davvero opzionale.** zod
  legge i campi con `value[key]`, che attraversa la catena dei prototipi: su
  ogni oggetto uscito da `JSON.parse` quella chiave esiste e vale una
  funzione. La classifica costruttori MotoGP si sarebbe svuotata in silenzio.
  L'ha trovato una e2e, non il typecheck.
- **`any` al confine non lascia senza tipo soltanto i payload.** Essendo
  assegnabile a qualunque cosa, rendeva non verificate anche le annotazioni
  scritte a mano a valle: `useQuery<TvFamilyPayload>` era un cast travestito
  da tipo, e quattro campi letti da `MotoGPPage` non esistevano da nessuna
  parte.
- **Costruire un `Intl.DateTimeFormat` costa ~70 volte la sua `format`.**
  Misurato in Chromium: 13,9 ms contro 0,20 ms per 350 date. Erano dieci
  righe innocue dentro `toRomeYMD`, chiamata una volta per evento del
  calendario, cioè ~14 ms di thread bloccato a ogni render della pagina.
  I formatter vanno costruiti a livello di modulo.
- **Un mock che ignora un'opzione della libreria collauda una libreria che
  non esiste.** I due `vi.mock("@tanstack/react-query")` di `TonightTvList`
  implementavano `useQueries` senza `combine`: finché nessuno la usava
  sembravano fedeli. Venti test sono diventati rossi appena il componente
  ha iniziato a usarla — il che è il comportamento giusto, ma dice che il
  mock descriveva le nostre abitudini, non il contratto.
- `App.tsx` monta ancora **due** sistemi di toast, Sonner e quello Radix. Il
  piano (Task 6.6) prevedeva di tenere solo Sonner: non è stato fatto.
