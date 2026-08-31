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
bun run test     → 239 test su 24 file, tutti verdi
bun run test:e2e → 6 test verdi (uno va davvero offline)
bun audit        → No vulnerabilities found
bun outdated     → solo typescript 5.9.3 (fermo di proposito, vedi sotto)
```

La versione è **2.8.0**: l'audit è chiuso lato codice. Quello che resta non è
codice da scrivere, è **roba da applicare a mano sul progetto Supabase** — vedi
«Quello che serve te», qui sotto.

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

**Fase 6.2a — la sezione a tre stati.** `DataSection`
(`src/components/common/DataSection.tsx`, 103 righe, 8 test) ha assorbito le
dieci copie della terna `LoadingState` / `ErrorState` /
`UnavailableExternalSource`. La fonte esterna di ogni sezione si dichiara una
volta invece di tre (`ExternalSource`: `href`, `label`, `loadingLabel`
opzionale), e la condizione «non ci sono dati» vive in un `isEmpty` solo invece
che in due espressioni che dovevano restare negazioni esatte. Migrate tutte e
quattro le pagine: Formula1 430→409, MotoGP 427→408, Sinner 378→363, Juventus
715→712. Due difetti trovati durante la migrazione, entrambi corretti e in
changelog: il «Riprova» mancante sulla scheda Costruttori F1 e `Date.now()` in
render dentro `MotoGPPage`.

**Fase 5 — sicurezza, la parte che si poteva fare da qui.** Il dedupe del
dispatcher è atomico: il posto in `push_sent_log` si prende **scrivendo**
(`INSERT ... ON CONFLICT DO NOTHING RETURNING id`) invece di leggere e poi
scrivere, e se l'invio fallisce la riga viene cancellata. Logica in
`dedupe.ts`, otto test. Scritte due migration correttive — revoca di `pg_net`
ai ruoli client, e job cron rieseguibile con il segreto nel Vault — **verificate
in lettura contro il database di produzione ma non applicate**.

**Fase 6.4 — PWA.** Il service worker ha un handler `fetch`: documento a
rete-prima-cache-poi, `/assets/` a cache-prima. Icone `any` e `maskable`
separate. Verificato da una e2e che va offline davvero.

**Fase 6.5 — accessibilità.** Quattro correzioni: riga TV non più focusabile a
vuoto, `aria-disabled` sulle frecce di paginazione, nomi accessibili sui
bottoni evento del calendario, `aria-pressed` sui filtri a pillola.

**Fase 6.6 — un solo sistema di toast.** Rimosso quello Radix, che era montato
e non riceveva mai niente. Bundle 550,23 → 534,78 kB.

**Fase 6.2b — `StreamingPage` 788 → 588 righe.** Fuori la serializzazione dei
filtri (`src/lib/streamingFilters.ts`, undici test fra cui l'andata e ritorno)
e i tre sotto-componenti. Costruita prima la e2e sul deep-link, che non
c'era.

**Fase 7 — chiusura.** Versione 2.8.0, sezione nel changelog, nota in
`docs/releases/2.8.0-audit-completo.md`, e recuperata la serie 2.6.x che
mancava dal changelog.

**Fase 4 — struttura agentica e documentazione.** `.claude/` versionata,
AGENTS.md ridotto da 302 a 115 righe in forma di router, CLAUDE.md sottile,
cinque playbook in `docs/agent-playbook/`, i documenti tecnici
(ARCHITECTURE, DATA_SOURCES, SECURITY, CONTRIBUTING, ROADMAP), Renovate al posto
di Dependabot per npm.

## Da fare — riprendere da qui

### 1. Quello che serve te: applicare, non scrivere

È l'unica cosa **bloccante** rimasta, ed è l'unico problema di sicurezza del
progetto con un impatto reale. Il codice c'è; tocca il database di produzione,
e questo non passa da qui.

1. **Applicare `20260831193000_revoke_pg_net_from_client_roles.sql`.** Rischio
   basso, reversibile con un `GRANT`. Verificato sul database reale: `anon` e
   `authenticated` hanno oggi `EXECUTE` su tutte e dodici le funzioni di
   `pg_net`, `net.http_post` compresa.
2. **Applicare `20260831193100_cron_dispatch_secret_from_vault.sql`.** Non
   cambia il segreto — lo estrae dal job stesso — quindi si applica senza
   perdere notifiche.
3. **Ruotare `DISPATCH_SECRET`.** La procedura in quattro passi è in fondo a
   quella migration. Serve la dashboard: il secret della edge function non è
   raggiungibile da SQL.

Finché il passo 3 non è fatto, il valore che sta su GitHub **è ancora valido**.
I passi 1 e 2 non sono una mitigazione: sono il prerequisito che rende il passo
3 una query e un incolla.

### 2. Componenti giganti, quello che resta

Conteggi misurati il 31 agosto 2026: `TonightTvList` 808 righe,
`CalendarPage` 712, `JuventusPage` 712, `StreamingPage` 588,
`JuventusMatchPage` 426, `Formula1Page` 409, `MotoGPPage` 408,
`SinnerPage` 363.

**Prima del taglio, la rete.** È la lezione di `StreamingPage`, e non è
processo per il processo: quella pagina non era visitata da nessuna e2e, e la
parte che poteva rompersi in silenzio era la serializzazione dei filtri
nell'indirizzo — la UI avrebbe continuato a funzionare ignorando l'URL. La e2e
sul deep-link è venuta prima dell'estrazione, non dopo.

Per i due prossimi la rete manca allo stesso modo:

- `TonightTvList` ha **una** e2e (il separatore fra famiglie) e due
  `vi.mock("@tanstack/react-query")` che descrivono le nostre abitudini invece
  del contratto della libreria (vedi sotto).
- `CalendarPage` ha `CalendarPage.a11y.test.tsx`, che copre i nomi accessibili
  e nient'altro, e nessuna e2e. Le fixture e2e usano date nel **2099**, quindi
  il calendario aperto sul mese corrente è vuoto: una e2e utile richiede
  fixture con date relative a oggi.

Del guscio trasversale delle pagine sportive restano i due pezzi esterni —
guardiano offline e intestazione con le tab, ~50 righe su quattro pagine.
Priorità bassa e resa bassa: la terna interna valeva centinaia di righe, questo
no.

### 3. Voci nuove aperte durante il lavoro

Sono in [`docs/ROADMAP.md`](docs/ROADMAP.md) con costo e motivazione:

- i font restano su `fonts.gstatic.com`, quindi offline non arrivano;
- «+N altri» nel calendario apre il quinto evento invece di mostrare gli altri
  (l'`aria-label` ora dice la verità, l'azione no);
- le URL delle fonti F1 hanno `2025` scritto a mano mentre `season` è dinamico;
- il confine streaming è dichiarato ma non validato (`declaredOnly`);
- `push_sent_log` cresce senza retention.

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
- **Il linter vede solo il codice che riesce a leggere.** `MotoGPPage`
  chiamava `Date.now()` durante il render da mesi, con `verify` verde:
  `react-hooks/purity` non entrava nell'IIFE finché questo stava in fondo a
  una catena `calendar && calendar.length > 0 && (() => {...})()`. Tolta la
  catena — la condizione è passata dentro `isEmpty` — la regola ha visto il
  codice ed è diventata rossa al primo lint. Il refactor non ha introdotto il
  difetto: lo ha reso raggiungibile. Vale la pena aspettarselo ogni volta che
  si semplifica un'espressione condizionale complicata.
- **La duplicazione qui non costava righe, costava deriva.** Le dieci copie
  della terna erano già divergenti in due punti — un `onRetry` mancante e un
  ordine dei blocchi diverso da tab a tab — senza che niente fallisse. Il
  guadagno in righe della `DataSection` è modesto (~60 sulle quattro pagine,
  contro 103 righe di componente nuovo più 145 di test): il guadagno vero è
  che ora quei due difetti sarebbero impossibili da scrivere.
- **I `children` di un componente si valutano anche quando non vengono
  resi.** In `DataSection` il contenuto è JSX, quindi le `map` e gli IIFE
  dentro girano pure quando `isEmpty` è vero e React li scarta. Qui è
  irrilevante — si mappa un array vuoto — ma se un giorno un contenuto
  diventasse costoso la soluzione è una render prop, non spostare la
  condizione fuori.
- Nei quattro file sportivi le URL delle fonti F1 contengono **`2025`
  scritto a mano** (`.../racing/2025`, `.../results/2025/drivers`) mentre
  `season` viene da `getCurrentF1Season()`. Precede questo lavoro e non è
  stato toccato, ma è un link alla stagione sbagliata appena l'anno gira.
- `App.tsx` monta ancora **due** sistemi di toast, Sonner e quello Radix. Il
  piano (Task 6.6) prevedeva di tenere solo Sonner: non è stato fatto.
