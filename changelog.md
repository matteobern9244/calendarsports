<!-- markdownlint-disable MD024 -->

# Changelog

Questo file adotta la struttura di **Keep a Changelog**, adattata alle regole
operative del repository.

Le voci sotto riportate distinguono tra modifiche **verificate** e storico Git
**non normalizzato**. Quando una modifica tocca fonti dati fragili, scraping,
dataset statici o policy sensibili su `main`, questo viene esplicitato.

> Le sezioni **2.6.0, 2.6.1 e 2.6.2** sono state ricostruite il 31 agosto 2026
> dallo storico Git: mancavano del tutto, pur essendo versioni realmente
> rilasciate. Le date e il contenuto vengono dai commit che spostano
> `src/lib/version.ts` e dai diff fra un bump e l'altro, non dalla memoria. La
> 2.6.2 aveva già la sua nota in `docs/releases/`; le altre due no, e i loro
> commit si chiamano tutti «Changes», quindi la ricostruzione descrive **i file
> cambiati**, non le intenzioni di chi li ha cambiati.

## [Unreleased]

### Corretto

- **I font non si perdono più, offline.** Oswald e Inter arrivavano da
  `fonts.googleapis.com`: il service worker non può mettere in cache una
  risorsa cross-origin, quindi senza rete l'app si apriva ripiegando sui
  font di sistema. Ora i file sono ospitati nel progetto, passano da
  `/assets/` con l'hash nel nome e li copre la stessa cache di tutto il
  resto. Sono gli **stessi file** che Google serviva, non altri: le sue
  sessanta dichiarazioni `@font-face` puntavano a dodici file soli, uno
  per subset. Di quei dodici restano i quattro che questa app può davvero
  rendere — `latin` e `latin-ext`, che è dove stanno Vlahović e Beşiktaş.
  In più: due connessioni in meno all'avvio, e nessun indirizzo IP dei
  visitatori che arriva a Google.

- **Il service worker precaricava tutto tranne i font.** Ricavava gli
  asset da mettere in cache leggendo il documento, ma i font sono
  nominati solo dentro il CSS: nessuno li vedeva passare, e chi apriva
  l'app offline dopo una sola visita se li ritrovava mancanti. Ora, dopo
  aver messo in cache i fogli di stile, cerca anche dentro quelli. Il
  difetto non si vedeva finché i font erano su Google, perché quella è
  un'origine che il service worker non tocca comunque.

- **«+N altri» nel calendario adesso mostra davvero gli altri.** Nella
  vista mese, un giorno con più di quattro eventi chiude il resto dietro
  quel bottone: il testo prometteva gli altri e il codice apriva il
  dettaglio del quinto, uno solo, scelto dalla posizione in elenco. Ora
  apre l'elenco completo del giorno, da cui si sceglie. La vista sotto
  `md` non era interessata: lì gli eventi si vedevano già tutti.

- **Il registro delle notifiche inviate smette di crescere senza fine.**
  `push_sent_log` non aveva nessuna cancellazione in tutto il progetto:
  una riga per ogni notifica mandata, alimentata da un job che gira ogni
  cinque minuti, e un indice su `sent_at` che nessuno interrogava. Ora una
  migration aggiunge un job giornaliero che cancella oltre i trenta giorni,
  e quell'indice serve a qualcosa. La migration è scritta ma **non ancora
  applicata**: richiede accesso al database.

- **La data del ranking di Sinner seguiva il fuso di chi guardava.** La
  scheda giocatore la formattava con `new Date(iso)` e senza `timeZone`:
  dall'Italia il risultato coincideva, a ovest di Greenwich mostrava il
  giorno prima. Ora passa da `formatLongDateIT`, che normalizza a UTC e
  presenta in `Europe/Rome` come tutto il resto dell'app.

### Modificato

- **Le due sezioni streaming controllano davvero quello che ricevono.** Il
  palinsesto TV e le uscite dei provider passavano da un confine che
  tipizzava senza verificare niente: un campo rinominato a monte sarebbe
  arrivato fino allo schermo come cella vuota, senza un errore da nessuna
  parte. Ora hanno schemi ricavati da ciò che le edge function producono, e
  un titolo malformato viene scartato dalla lista invece di comparire rotto
  accanto agli altri. Le interfacce scritte a mano che li precedevano
  erano già in ritardo sul codice su due punti: dichiaravano obbligatori
  una ventina di campi che il dettaglio senza chiave TMDB non manda
  affatto, e non nominavano `genreIds`, che ogni titolo porta con sé.

- **Il calendario non tiene più un timer suo.** La pagina rileggeva
  `Date.now()` ogni minuto con un `setInterval` che girava anche a scheda
  nascosta, per ingrigire gli eventi conclusi. Ora legge il clock
  condiviso dell'app, che in background si ferma e al ritorno riparte
  allineato.

Il resto del lavoro di questo ciclo è refactoring senza effetti
percepibili — il guscio comune delle quattro pagine sportive, le tre viste
del calendario, la selezione del programma di prima serata — e per regola
non prende una voce qui: per chi usa l'app non cambia niente, e l'insieme
delle classi CSS identico prima e dopo è la prova che è davvero così.

## [2.8.0] — Audit completo: sicurezza, PWA offline, accessibilità (2026-08-31)

Bump applicativo `2.7.0` → `2.8.0` esposto da `src/lib/version.ts` e
`package.json`. Nota di rilascio:
[`docs/releases/2.8.0-audit-completo.md`](docs/releases/2.8.0-audit-completo.md).

Questa versione raccoglie un audit completo del repository, svolto per fasi fra
il 26 e il 31 agosto 2026. Le voci qui sotto includono anche otto lavori
chiusi durante l'audit che erano stati tolti da `docs/ROADMAP.md` senza passare
di qui: la regola del ROADMAP dice che una voce realizzata si sposta nel
changelog, e questo è quel passaggio.

### Infrastruttura e qualità (lavori dell'audit non ancora raccontati)

- **Code splitting per route.** Nove pagine arrivano con `lazy()`, con un
  `ErrorBoundary` dentro `Layout` chiavato sul pathname: un errore in una
  pagina non porta giù l'intera applicazione, e cambiare rotta lo azzera.
- **Le chiavi di cache nascono da una fabbrica sola** (`src/lib/queryKeys.ts`),
  invece di essere scritte a mano in ogni hook.
- **I test delle edge function girano davvero, e sul codice vero.** Due file
  ricopiavano a mano la logica di produzione e un terzo verificava le proprie
  fixture senza mai chiamare la funzione, perché `index.ts` invoca
  `Deno.serve` a livello di modulo. Appena hanno importato la funzione vera
  uno è diventato rosso: la `GENRE_WHITELIST` ricopiata si era fermata a sei
  generi mentre quella di produzione ne ha decine. La cura non è un mock, è
  spostare la logica pura in un modulo che all'import non fa niente.
- **Prettier è un errore di lint**, ultimo elemento della flat config: la
  formattazione non si discute più in review.
- **Il lint copre `scripts/**`, `e2e/**` e `supabase/functions/**`**, che non
  erano analizzati da nessuna regola. Estenderlo ha trovato otto problemi
  reali in dieci minuti, fra cui uno zero-width space nascosto dentro un
  commento e due parser di date abbandonati.
- **Un solo workflow CI**, che lancia `bun run verify` invece dell'elenco dei
  suoi anelli: due elenchi separati divergono, ed è così che una CI smette di
  essere un gate.
- **I payload delle edge function sono validati al confine** con schemi zod
  (`src/lib/api/schemas.ts`), e `@typescript-eslint/no-explicit-any` è di
  nuovo accesa. `any` al confine non lasciava senza tipo soltanto i payload:
  essendo assegnabile a qualunque cosa rendeva non verificate anche le
  annotazioni scritte a mano a valle, e quattro campi letti da `MotoGPPage`
  non esistevano da nessuna parte.
- **Calendario e scheda TV non ricalcolano più tutto a ogni render.**
  `useCalendarEvents` restituiva un array nuovo a ogni render, quindi il tick
  da 60 secondi rifaceva espansione, filtro e ordinamento di ~350 eventi; in
  `TonightTvList` la memo dipendeva dall'array che `useQueries` ricrea ogni
  volta. Hoistati anche i formatter `Intl`: misurato in Chromium, costruirne
  uno per data costa 13,9 ms ogni 350 date contro 0,20 ms riusandolo.

### Security

- **Il dispatcher non può più mandare la stessa notifica due volte.** Il
  controllo era `SELECT` → invia → `INSERT`: fra la lettura e la scrittura c'è
  una finestra in cui una seconda esecuzione legge «non ancora inviata» e
  invia di nuovo. Il cron scatta ogni cinque minuti mentre la finestra di
  selezione è di sei, quindi le esecuzioni si sovrappongono di proposito e la
  finestra veniva imboccata davvero. Ora il posto si prende **scrivendo**
  (`INSERT ... ON CONFLICT DO NOTHING RETURNING id`): il vincolo `UNIQUE` che
  esisteva già in tabella decide chi manda, prima dell'invio invece che dopo.
  Se l'invio fallisce la riga viene cancellata, così il giro successivo può
  riprovare invece di saltare la notifica per sempre. Logica in
  `supabase/functions/push-dispatcher/dedupe.ts`, otto test.
- **Il segreto del dispatcher non è più nel corpo del job cron.** Applicata la
  migration `20260831193100_cron_dispatch_secret_from_vault.sql`: il valore vive
  nel Vault e il job lo legge a ogni esecuzione. Applicata senza perdere
  notifiche, perché il segreto è stato **estratto dal job stesso** invece che
  rigenerato — verificato con un'uguaglianza fra i due valori, non a occhio.
  La migration è anche rieseguibile su un database vuoto, cosa che quella del
  23 maggio non era (`cron.unschedule` di un job inesistente solleva).

  **La rotazione vera resta da fare** e richiede la dashboard Supabase: finché
  non è fatta, il valore in chiaro nella migration del 23 maggio — quindi su
  GitHub — è ancora valido. La procedura in quattro passi è in fondo alla
  migration.

- **Il dispatcher andava in timeout nove giri su dieci, e nessuno poteva
  saperlo.** Emerso applicando la migration e leggendo `net._http_response`:
  65 richieste su 72 finivano in timeout a 5000 ms, il default di `pg_net`, e
  solo 7 arrivavano a leggere una risposta (200, `{"ok":true}`). Il difetto è
  precedente ed è silenzioso per costruzione — `cron.job_run_details` segna
  `succeeded`, perché l'SQL è andato a buon fine: è la richiesta HTTP a essere
  stata mollata. Il job ora dichiara `timeout_milliseconds := 120000`.
- **La revoca di `pg_net` non è applicabile, e lo sappiamo per averla
  provata.** Il `REVOKE` non ha sollevato errori e non ha cambiato niente: le
  funzioni appartengono a `supabase_admin`, le migration girano come
  `postgres`, e un `REVOKE` da chi non è owner emette un warning e prosegue.
  La revoca corretta sarebbe da `PUBLIC` — è da lì che `anon` eredita — ma
  fermerebbe le notifiche, perché nella stessa ACL non compare `postgres`, il
  ruolo del job cron. Il rischio reale è misurato dall'esterno con la anon
  key: `net` non è fra gli schemi esposti da PostgREST e `public` non contiene
  nessuna funzione da cui rimbalzare. La migration è stata **svuotata e
  lasciata come nota**, perché nessuno riscriva la stessa fra sei mesi.

### Added

- **L'app installata si apre senza rete.** `public/sw.js` gestiva solo le
  notifiche push: nessun handler `fetch`, quindi nessuna cache, e aprire la
  PWA offline mostrava la pagina d'errore del browser. Ora il documento va a
  rete-prima-cache-poi (mai il contrario: con cache-first una `index.html`
  vecchia resterebbe servita per sempre, ed è l'unico file senza hash nel
  nome) e gli asset di `/assets/` a cache-prima, perché l'hash nel nome li
  rende immutabili. Le chiamate alle edge function restano **fuori** dalla
  cache di proposito: la scadenza dei dati la conosce React Query, e un
  service worker che li memorizzasse mostrerebbe classifiche vecchie senza
  dirlo.
- **Icona maskable vera.** Il manifest dichiarava una sola icona usata sia
  come `any` sia come `maskable`, per giunta dichiarata `512x512` mentre il
  file era `1024x1024`. Su Android la maschera circolare tagliava il testo e
  mostrava il bordo bianco agli angoli. Ora ci sono `icon-192`, `icon-512`
  (`any`) e `icon-maskable-512`, quest'ultima su fondo pieno `#0B1A33` con il
  contenuto dentro la zona di sicurezza.

### Fixed

- **Accessibilità, tre correzioni puntuali.**
  - _Stasera in TV_: ogni riga del palinsesto aveva `tabIndex={0}` e
    `cursor-pointer` senza alcun `onClick`. Il tab si fermava su decine di
    righe senza niente da attivare, e il puntatore prometteva un'azione
    inesistente. In una `role="table"` le righe non vanno comunque nel
    percorso da tastiera: gli screen reader hanno i propri comandi.
  - _Streaming, paginazione_: le frecce disabilitate erano `<a href="#">` con
    solo `pointer-events-none`, che non tocca la tastiera. Restavano nel tab
    order e attivabili con Invio, senza dichiarare `aria-disabled`. Ora
    dichiarano lo stato e escono dal percorso da tastiera.
  - _Calendario_: i bottoni evento avevano come nome accessibile la somma
    degli span — diceva cosa c'è scritto, non che il controllo apre qualcosa —
    e lo stato «concluso» era affidato al solo `line-through`, invisibile a
    chi ascolta. Ora hanno un `aria-label` esplicito e `type="button"`.
- **Formula 1, scheda Costruttori: torna il pulsante «Riprova».** Era l'unica
  delle dieci sezioni sportive il cui stato di errore non offriva alcun modo di
  ritentare: `refetch` non era nemmeno destrutturato dall'hook. Chi incontrava
  un errore lì poteva solo cambiare scheda o ricaricare la pagina. Trovato
  unificando le dieci copie della terna caricamento/errore/fonte-vuota.
- **MotoGP, stato dei weekend di gara: letto dal clock condiviso.** Il calcolo
  di «in corso» / «completato» chiamava `Date.now()` durante il render, quindi
  dipendeva da _quando_ React ridisegnava invece che dall'orario. Ora usa
  `useNowMinute()`, che legge lo stesso clock come store esterno con snapshot
  stabile. Il difetto esisteva da prima ed era invisibile a
  `react-hooks/purity`: la regola non arrivava dentro l'IIFE finche' questo era
  in fondo a una catena `dati && dati.length > 0 && (...)`.

### Removed

- **Un solo sistema di toast.** `App.tsx` ne montava due, Sonner e quello
  Radix di shadcn. Verificato prima di togliere: **nessun file** importava
  `useToast`, quindi il `<Toaster />` Radix era montato e non riceveva mai
  niente — tutte le notifiche passano da `sonner`. Rimossi
  `components/ui/toaster.tsx`, `components/ui/toast.tsx` e
  `hooks/use-toast.ts`. Bundle principale 550,23 kB → 534,78 kB (gzip 173,01
  → 168,51).

### Changed

- **`TonightTvList` scende da 808 a 661 righe**, e la sua logica smette di
  dipendere da un mock. `combineTvHighlights` e i predicati della fascia di
  prima serata vivono in `src/lib/tonightTv.ts` con nove test **diretti**:
  prima erano verificabili solo montando il componente con due
  `vi.mock("@tanstack/react-query")`, e quei mock descrivevano le nostre
  abitudini invece del contratto della libreria — uno implementava `useQueries`
  senza `combine`, e finché nessuno la usava sembrava fedele.
- **`TvProgram.end` era dichiarato obbligatorio e non lo è.** Il codice lo
  sapeva già (`Boolean(p.end)`, e in mancanza non mostra nessuna durata invece
  di inventarne una); il tipo prometteva al chiamante qualcosa che il payload
  non garantisce. Essendo `declaredOnly`, senza validazione a runtime, nessuno
  lo avrebbe smentito.
- **`CalendarPage` scende da 712 a 620 righe**, e la matematica del calendario
  ha finalmente dei test. `buildMonthGrid` e le funzioni di data in fuso
  italiano vivono in `src/lib/calendarGrid.ts` con dodici test: griglia sempre
  6×7, settimana che comincia di lunedì (la conversione da `getUTCDay()`, che
  conta da domenica, è quella che si sbaglia di un giorno), cambio d'anno in
  testa e in coda, 29 febbraio, e la proprietà che ogni cella disti
  esattamente 24 ore dalla precedente anche attraverso il cambio dell'ora.
- **Il guardiano del fuso guarda anche `src/lib/`.** Guardava le pagine e tre
  cartelle di componenti: la logica sulle date che migra in `src/lib` — cioè
  proprio quella che si estrae per poterla testare — usciva dal controllo, e il
  controllo restava verde. Unica esenzione, motivata, `dateUtils.ts`, che
  **implementa** la policy ed è il posto dove `new Date(stringa)` deve stare;
  più i file di test, che costruiscono date scorrette di proposito. Due test in
  `src/test/tooling/` sorvegliano che quell'esenzione non si allarghi.
- **`StreamingPage` scende da 788 a 588 righe.** La serializzazione dei filtri
  nell'indirizzo esce in `src/lib/streamingFilters.ts` come coppia di funzioni
  pure (`readFilters` / `writeFilters`) con undici test, fra cui la proprietà
  che conta: **l'andata e ritorno**. È la parte di quella pagina che può
  rompersi senza che si veda — la UI continuerebbe a funzionare ignorando
  l'indirizzo, e un link condiviso riporterebbe a uno stato diverso da quello
  che si stava guardando. I tre sotto-componenti definiti in fondo al file
  (`FamilySelector`, `ItalyProviderFilter`, `PagerNav`) sono ora in
  `src/components/streaming/`. Prima del taglio è stata costruita la rete che
  mancava: una e2e che verifica il deep-link in lettura e in scrittura.
- **`formatHour` costruiva un `Intl.DateTimeFormat` a ogni chiamata**, cioè
  una volta per programma del palinsesto. È lo stesso difetto già corretto in
  `toRomeYMD` ad agosto, sopravvissuto qui: costruire un formatter costa circa
  settanta volte la sua `format`. Ora è a livello di modulo.
- **I filtri a pillola dichiarano `aria-pressed`.** Famiglia TV, piattaforma e
  tipo comunicavano la selezione con il solo colore del bottone: chi usa uno
  screen reader non aveva modo di sapere quale filtro fosse attivo.

- Le quattro pagine sportive (`Formula1Page`, `MotoGPPage`, `SinnerPage`,
  `JuventusPage`) montano un componente comune `DataSection` al posto delle
  dieci copie di `LoadingState` / `ErrorState` / `UnavailableExternalSource`.
  La fonte esterna di ogni sezione si dichiara **una volta** invece di tre, e
  la condizione «non ci sono dati» esiste in un punto solo invece che in due
  espressioni che dovevano restare negazioni esatte l'una dell'altra.
  Nessuna classe CSS e' cambiata in nessuna delle quattro pagine (verificato
  confrontando l'insieme dei `className` prima e dopo: 195 occorrenze, zero
  differenze).

## [2.7.0] — Juventus: tutte le competizioni, niente stagioni passate (2026-08-18)

Bump applicativo `2.6.2` → `2.7.0` esposto da `src/lib/version.ts` e
`package.json`.

### Fixed

- `sports-football` (action `calendar`) non ripiega piu' sulla stagione
  precedente: se il widget Sky della stagione richiesta non esiste (es.
  Champions League non ancora pubblicata) la competizione viene semplicemente
  saltata, invece di inserire partite dell'anno passato.

### Added

- Discovery competizioni: oltre a Serie A, Champions League e Coppa Italia la
  funzione interroga una lista di id candidati Sky per intercettare
  Supercoppa, Mondiale per Club, amichevoli e altri tornei. Gli id non
  pubblicati rispondono 404 e vengono ignorati. Il nome competizione, quando
  non presente nella mappa statica, viene dedotto dallo slug dei link Sky.
- Meta di risposta `competitionsIncluded` / `competitionsUnavailable`.
- Parametro `upcoming=1` che esclude le partite gia' giocate.
- Pagina Juventus: toggle "Prossime / Tutte" (default "Prossime", preferenza
  persistita in `localStorage`).
- `useSyncAll` sincronizza entrambe le varianti (con e senza filtro) di tutte
  le pagine del calendario Juventus.

Nota: la sezione dipende da scraping Sky Sport; struttura e disponibilita' dei
widget possono cambiare senza preavviso.

## [2.6.2] — Notifiche push in fuso italiano (2026-05-17)

Bump applicativo `2.6.1` → `2.6.2`. Nota di rilascio:
[`docs/releases/2.6.2-push-notifiche-rome-timezone.md`](docs/releases/2.6.2-push-notifiche-rome-timezone.md).

### Fixed

- `push-dispatcher` tratta le date evento con la policy condivisa: ISO naive
  come UTC, uscita sempre in `Europe/Rome`. Lo scheduling non usa più
  `Date.parse()` diretto ma `toEventTimestampMs`, che toglie la dipendenza
  implicita dal fuso del runtime.
- Il calcolo della stagione lato dispatcher usa il giorno italiano, per
  evitare il salto a cavallo della mezzanotte UTC (soprattutto Juventus).

### Added

- Il payload Web Push porta l'orario italiano già formattato nel corpo
  («alle 21:00»), più i metadati `eventDateTime` e
  `eventTimeZone: Europe/Rome`.
- `supabase/functions/push-dispatcher/timezone.test.ts`: ISO naive, ora legale,
  ora solare, offset espliciti dei provider, stagione sul giorno di Roma.

## [2.6.1] — Sky Sport cambia formato, il calendario regge (2026-05-16)

Bump applicativo `2.6.0` → `2.6.1`.

### Fixed

- `sports-football` legge il nuovo formato dei widget Sky (2026), in cui i dati
  arrivano come JSON dentro
  `<script type="application/json" data-props="true">`. Il vecchio attributo
  `model='...'` resta come fallback: la funzione prova prima il formato nuovo e
  ripiega sul vecchio, così la pagina Juventus regge entrambi.

Nota: la sezione dipende da scraping Sky Sport, e questa voce è la prova che il
formato cambia senza preavviso.

## [2.6.0] — Notifiche push (2026-05-06)

Bump applicativo `2.5.0` → `2.6.0`.

### Added

- **Notifiche push per gli eventi sportivi**, con anticipo scelto dall'utente.
  L'intera catena entra in questa versione:
  - `public/sw.js` — service worker che riceve la push e apre l'app al click;
  - `src/lib/pushClient.ts` e `src/hooks/usePushNotifications.ts` — permesso,
    iscrizione, disiscrizione lato browser;
  - il pannello preferenze, da cui si attivano le notifiche e si scelgono gli
    anticipi;
  - tre edge function: `push-vapid-key` (chiave pubblica), `push-subscribe`
    (iscrizione) e `push-dispatcher` (invio, protetto da segreto condiviso e
    invocato da un job cron);
  - le tabelle `push_subscriptions` e `push_sent_log`, con RLS attiva e
    nessuna policy permissiva: solo la service role vi accede.

## [2.5.0] — Calendario: vista Agenda + filtri sport (2026-05-04)

Bump applicativo `2.4.0` → `2.5.0` esposto da `src/lib/version.ts` e
`package.json`.

### Aggiunto

- Nuova **vista Agenda** in `/calendario`: elenco cronologico raggruppato
  per giorno (header data lunga IT, ora `Europe/Rome`, badge sport,
  contesto e broadcaster quando disponibile). Coesiste con la vista
  Mese tramite un toggle segmentato `Mese` / `Agenda` in toolbar,
  persistito in `localStorage` (`calendar.view`).
- **Filtri sport cliccabili**: la legenda è ora una serie di toggle
  (`Juventus`, `F1`, `MotoGP`) con stato `aria-pressed`, più bottone
  `Tutti` per il reset. Si applicano sia alla vista Mese sia alla
  vista Agenda. Persistenza in `localStorage` (`calendar.filters`).

### Modificato

- `src/pages/CalendarPage.tsx`: introdotti `viewMode`, `enabled`,
  `filteredEvents` e `agendaDays`; legenda statica sostituita da
  pulsanti toggle; aggiunta sezione Agenda; nessuna modifica all'hook
  `useCalendarEvents` né alle Edge Functions.

### Verificato

- Tutti i formatter UI continuano a usare `timeZone: "Europe/Rome"`
  (conforme a `npm run check:tz-juventus`).
- Lingua UI invariata in italiano (conforme a `npm run check:italian`).

## [2.4.0] — Pagina Calendario aggregato Juventus + F1 + MotoGP (2026-05-04)

Bump applicativo `2.3.6` → `2.4.0` esposto da `src/lib/version.ts` e
`package.json`.

### Aggiunto

- Nuova pagina `/calendario` (vista mese stile Google Calendar) con tutti gli
  eventi reali di Juventus, Formula 1 e MotoGP nel mese corrente.
  Voce di menu **CALENDARIO** inserita tra Home e Streaming
  (`src/components/layout/Header.tsx`, nuova `CalendarBrandIcon` in
  `BrandIcons.tsx`).
- Hook aggregato `src/hooks/useCalendarEvents.ts` che riusa le stesse
  `queryKey` delle pagine sport (`["f1","calendar",season]`,
  `["motogp","calendar",season]`, `["juventus","calendar",season,page,12]`).
  Significa che il pulsante **Sincronizza** (Home + nuova pagina) aggiorna
  automaticamente anche il Calendario in tempo reale.
- Espansione delle sessioni: F1 mostra FP1/FP2/FP3/Sprint Quali/Sprint/
  Qualifiche/Gara (campi già forniti da Jolpica). Juventus mostra ogni
  partita (Serie A + coppe).
- **Vista responsive**: griglia 7×6 desktop, lista per giorno su mobile.
- Dialog dettaglio evento con orario `Europe/Rome`, contesto, broadcaster
  (Juventus) e link alla pagina sport corrispondente.

### Backend (verificato live)

- `supabase/functions/sports-motogp` — l'azione `calendar` è stata estesa
  per arricchire ogni round con il campo `sessions[]` reale, recuperato
  via Pulselive
  `GET /motogp/v1/results/sessions?eventUuid=&categoryUuid=` (categoria
  MotoGP™ risolta una sola volta via `categories?eventUuid=`, cache 24h).
  Mapping IT dei tipi sessione (`FP/PR → Prove libere`, `Q → Qualifiche`,
  `SPR → Sprint`, `WUP → Warmup`, `RAC → Gara`).
- Strategia di errore "graceful": `Promise.allSettled` per le N chiamate
  sessione, se una fallisce il round mantiene solo `date_start/date_end`
  (mai dati sintetici, coerente con la policy "no fake data").
- Edge function deploy verificato (`curl` su season 2025): payload
  contiene per ogni GP la lista completa di sessioni con datetime ISO
  in UTC.

### Design system

- Aggiunti 3 token sport in `src/index.css` (light + dark):
  `--sport-juventus`, `--sport-f1`, `--sport-motogp`. Usati come pallini
  colorati nelle celle e badge nel dialog. Nessun colore hardcoded nei
  componenti.

### Note operative

- Tutta la formattazione data/ora passa per `toRomeDate` /
  `formatDateTimeIT` (`src/lib/dateUtils.ts`) → fuso `Europe/Rome`
  garantito anche per i client fuori Italia.
- UI 100% italiana (LUN/MAR/…, "Oggi", "Mese precedente/successivo",
  label sessioni in italiano), conforme a `npm run check:italian`.
- Nessun cambio di shape per i consumer esistenti di MotoGP calendar:
  `sessions` è opzionale.

## [2.3.6] — Streaming Catalogo Italia: filtro "Tutti" ai 4 provider mainstream + UI trasparente (2026-04-27)

Bump applicativo `2.3.5` → `2.3.6` esposto da `src/lib/version.ts`.
Refactor mirato della sezione **Streaming → tab "Nuove uscite"** per
rendere coerente l'opzione "Tutti" con i 4 provider effettivamente
filtrabili dalla UI (Netflix, Prime Video, Disney+, HBO Max). In
precedenza `provider=all` usava la whitelist mainstream IT estesa
(Apple TV+, Paramount+, NOW/Sky, Crunchyroll, RaiPlay, Mediaset
Infinity, Discovery+, Plex, Pluto): risultava un mix non
confrontabile con i pulsanti provider della UI. Nessun cambio di
stack, branch policy o policy Lovable. Le altre sezioni (Home,
Juventus, Sinner, F1, MotoGP, "TV stasera") non sono toccate.

### Changed

- **Edge function `streaming-releases` — action `new-italy`.** Quando
  `provider=all`, la `with_watch_providers` ora usa esclusivamente la
  whitelist `[8, 119, 337, 1899]` (Netflix, Amazon Prime Video,
  Disney+, HBO Max). Il post-filter mainstream IT è stato ristretto
  alla stessa lista. Rimosso il codice legacy
  `tmdbDiscoverByNetworkOrCompany` e la mappa `PROVIDER_TMDB_IDS`
  basata su `with_networks`/`with_companies`: la sezione resta su una
  sola sorgente logica (provider TMDB IT con validazione `flatrate`).
- **`useSyncAll` (`src/hooks/useSyncAll.ts`).** Il prefetch della
  sincronizzazione globale ora chiama `streamingApi.getReleasesItaly`
  con la stessa `queryKey` usata da `StreamingPage` (`["streaming-releases-italy", pid, "all", today, dateTo7, "release", 0]`)
  per ciascuno dei 4 provider IT più "Tutti". In precedenza prefetchava
  l'azione obsoleta `new-today`, scaldando una cache mai consumata
  dalla UI.
- **UI `src/pages/StreamingPage.tsx`.** Aggiunto un riepilogo dei
  filtri attivi (provider, kind, genere, ordinamento, finestra
  effettiva, contatore titoli) sotto la barra controlli, in modo che
  l'utente veda subito perché una lista è vuota o ridotta. Quando il
  backend ha applicato il fallback automatico finestra (`widenedWindow=true`)
  o il fallback popolarità (`fallbackRecent=true`), il messaggio in
  italiano espone `effectiveFrom` e `effectiveTo`.

### Verified

- `bunx tsc --noEmit -p tsconfig.app.json` pulito.
- `npm run check:italian` 0 violazioni.
- Edge function deployata e testata via `curl` per
  `provider=all|netflix|prime|disney|hbo`: nessun titolo da provider
  fuori dai 4 mainstream, validazione `flatrate IT` confermata su
  ogni item del payload.

File toccati: `supabase/functions/streaming-releases/index.ts`,
`src/pages/StreamingPage.tsx`, `src/hooks/useSyncAll.ts`,
`src/lib/version.ts`, `changelog.md`.

## [2.3.5] — Streaming Catalogo Italia: queryKey time-aware + bundle refresh (2026-04-27)

Bump applicativo `2.3.4` → `2.3.5` esposto da `src/lib/version.ts`.
Fix di consistenza React Query nella sezione **Streaming → tab
"Nuove uscite"**: il `queryKey` di `useReleasesItaly` non includeva
esplicitamente `dateFrom`/`dateTo`, quindi cambiando rapidamente
filtri provider o periodo l'UI poteva mostrare temporaneamente la
lista relativa al fetch precedente prima di rifrescare. Bump versione
anche per forzare il refresh del bundle client e ripulire eventuali
chunk cache obsoleti dopo gli interventi backend di `2.3.3`/`2.3.4`.
Nessun cambio di stack, fonti dati o branch policy.

### Changed

- **`src/hooks/useStreamingData.ts`.** `useReleasesItaly` ora
  serializza `dateFrom`, `dateTo`, `sort` e `page` dentro la
  `queryKey`, garantendo invalidazione precisa al cambio filtri e
  evitando flicker tra liste eterogenee. `staleTime` e `gcTime`
  invariati.
- **`src/lib/version.ts`.** Bump a `2.3.5` per invalidare la cache
  bundle client e propagare la nuova logica edge.

### Verified

- Smoke test manuale via `curl` su edge function `new-italy` per i 4
  provider IT con finestra 7 giorni: payload reale, niente
  duplicati, `dataSource: 'tmdb'`.
- Build dev verificato senza warning aggiuntivi.

File toccati: `src/hooks/useStreamingData.ts`, `src/lib/version.ts`,
`changelog.md`.

## [2.3.4] — Streaming Catalogo Italia: discovery provider-first IT (2026-04-27)

Bump applicativo `2.3.3` → `2.3.4` esposto da `src/lib/version.ts`.
Correzione mirata della sezione **Streaming → Nuove uscite (Catalogo
Italia)**. La precedente strategia per `with_networks`/`with_companies`
era allineata alle pagine TMDB `/network/<id>` ma NON al catalogo
effettivamente disponibile in Italia: titoli come _Daredevil: Born
Again_ su Disney+ Italia venivano esclusi perché non appartenenti al
network Disney+ TMDB `2739` o con `first_air_date` storica fuori
finestra.

- `supabase/functions/streaming-releases/index.ts`: `new-italy` torna a
  una logica provider-first ufficiale TMDB Discover con
  `watch_region=IT` + `with_watch_providers=<id>`. Monetizzazione
  `flatrate` quando un provider è scelto, `flatrate|free|ads` quando
  Tutti (con whitelist mainstream IT). Validazione finale per ogni
  titolo via `/{type}/{id}/watch/providers` su `results.IT.flatrate`.
- Recupero multi-pagina TMDB (1..3) con dedup `(kind,id)` per intercettare
  catalogo storico (Daredevil, House of the Dragon, ecc.) anche con
  finestre date strette.
- Soglia `vote_count.gte` rimossa di default: TMDB Discover su
  `watch_region=IT` è già fonte ufficiale del catalogo, tagliarla per
  voti escludeva nuove stagioni e novità appena entrate.
- Fallback a tre livelli: (1) finestra date stretta, (2) finestra
  allargata ±14/+30gg, (3) catalogo IT senza vincolo data ordinato per
  popolarità. Mantengo flag `widenedWindow` e `fallbackRecent` per i
  messaggi UI in italiano già esistenti.

File toccati: `supabase/functions/streaming-releases/index.ts`,
`src/lib/version.ts`, `changelog.md`.

## [2.3.3] — Streaming Catalogo Italia: discovery per network/company TMDB (2026-04-27)

Bump applicativo `2.3.2` → `2.3.3` esposto da `src/lib/version.ts`.
Riallineata la logica della sezione **Streaming → Catalogo Italia** alla
stessa strategia delle pagine pubbliche TMDB
(`/network/213-netflix`, `/network/1024-prime-video`,
`/network/2739-disney`, `/network/8304-hbo-max`):

- Per le serie usiamo ora `with_networks=<networkId>` (213/1024/2739/8304),
  per i film `with_companies=<companyId>` (145174/20580/2/174). In
  precedenza usavamo solo `with_watch_providers` + finestra
  `first_air_date` IT, che escludeva titoli realmente disponibili in IT
  ma con prima messa in onda fuori dalla finestra (specialmente Prime
  Video, Disney+ e HBO Max).
- La disponibilità in IT resta validata per ogni titolo via
  `/watch/providers IT`: solo i titoli realmente in catalogo IT su
  provider mainstream vengono mostrati.
- Aggiunto secondo fallback `fallbackRecent`: se la finestra
  selezionata è vuota anche dopo l'allargamento ±14/+30gg, l'API
  ritorna le uscite più recenti del provider con messaggio dedicato
  in UI ("Nessuna uscita su {provider} nella finestra selezionata:
  stiamo mostrando le uscite più recenti.").
- Eliminata la soglia `vote_count.gte` rigida (era 5/20 movie, 2/10
  tv): per discovery via network/company non ha più senso, allineata
  a TMDB Discover ufficiale.

File toccati: `supabase/functions/streaming-releases/index.ts`,
`src/hooks/useStreamingData.ts`, `src/pages/StreamingPage.tsx`,
`src/lib/version.ts`. Verificato via `curl` per Netflix, Prime Video,
Disney+ e HBO Max: tutte le risposte restituiscono titoli reali (es.
_Girigo_, _Cochinas_, _Star Wars: Maul - Shadow Lord_, _Gina
Lollobrigida: Diva Contesa_) con disponibilità IT confermata.

## [2.3.2] — Streaming: vista unificata Catalogo Italia (2026-04-27)

Bump applicativo `2.3.1` → `2.3.2` esposto da `src/lib/version.ts`.
Riorganizzazione della sezione **Streaming → tab "Nuove uscite"**: rimossa
la vista alternativa "Per provider", che generava confusione e duplicava
la logica del Catalogo Italia. Ora esiste una sola vista, sempre
filtrata su titoli realmente disponibili in Italia su provider
mainstream. Default ordinamento allineato alla richiesta utente: "data
uscita" (era "popolarità"). Aggiunto fallback automatico finestra date
lato edge function quando il range richiesto è vuoto, per evitare lo
stato "nessun risultato" sui range stretti (7 giorni). Nessun cambio di
stack, branch policy o policy Lovable. Le altre sezioni (Home, Juventus,
Sinner, F1, MotoGP, tab "TV stasera") non sono toccate.

### Changed

- **UI `src/pages/StreamingPage.tsx`.** Rimosso il toggle "Catalogo
  Italia" / "Per provider" e tutta la logica della vista alternativa
  (stato `view`, `provider`, `onlyUpcoming`, hook
  `useReleasesByProvider`, componente `ProviderSelector`). Il filtro
  provider IT (Tutti / Netflix / Prime Video / Disney+ / HBO Max) resta
  come unico modo per restringere a una piattaforma. Default ordinamento
  passa da `popularity` a `release` (data uscita) e l'URL viene
  serializzato con `release` come default implicito. Default range resta
  `7d` (Prossimi 7 giorni). Empty state semplificato; quando il backend
  ha allargato la finestra in automatico viene mostrato un messaggio
  "Stiamo mostrando le uscite tra {effectiveFrom} e {effectiveTo}".
- **Edge function `streaming-releases` — action `new-italy`.** Default
  `sort_by` lato server passa a data uscita (`primary_release_date.desc` /
  `first_air_date.desc`) per allinearsi al nuovo default UI.
  Implementato fallback automatico finestra date a parità di logica con
  `new-today`: se `items.length === 0` viene rifatta la query con
  `dateFrom-14d .. dateTo+30d` e il payload espone
  `widenedWindow=true`, `effectiveFrom`, `effectiveTo`. Soglia
  `vote_count.gte` resa adattiva: range ≤ 14 giorni usa `5` (movie) /
  `2` (tv) anziché `20`/`10`, perché le novità imminenti spesso non
  hanno ancora voti accumulati su TMDB. Quando un provider IT specifico
  è selezionato, la post-filter richiede esplicitamente quel provider in
  `flatrate` IT (non solo "qualsiasi mainstream"). Esclusi anche i
  titoli senza data di uscita (`release_date` / `first_air_date` nulla).
- **Hook `src/hooks/useStreamingData.ts`.** `ReleasesItalyPayload`
  espone i campi opzionali `widenedWindow`, `effectiveFrom`,
  `effectiveTo` per supportare il messaggio di finestra ampliata in UI.

### Verifica

- `bunx tsc --noEmit -p tsconfig.app.json` → ok.
- Edge function deployata e testata via `curl` con
  `dateFrom=2026-04-27&dateTo=2026-05-04`: la finestra 7gg è vuota, il
  fallback porta automaticamente a `2026-04-13 .. 2026-06-03` e
  restituisce titoli reali (Apex/Netflix, Stranger Things/Netflix,
  Girigo/Netflix) tutti con `availableProviders` mainstream IT.
- Test funzionale UI a carico dell'utente: i filtri periodo, generi,
  ordinamento e Tutti/Film/Serie producono ora liste coerenti.

## [2.3.1] — Catalogo Italia: filtro provider mainstream + soglia voti (2026-04-27)

Bump applicativo `2.3.0` → `2.3.1` esposto da `src/lib/version.ts`. Fix
funzionale circoscritto alla sezione **Streaming → tab "Nuove uscite" →
vista "Catalogo Italia"**: i risultati erano dominati da titoli di nicchia
(es. catalogo Plex con popolarità < 0.2) perché TMDB Discover restituiva
qualunque titolo con almeno una disponibilità in IT, anche su AVOD
secondari. Allineato il comportamento al riferimento starflicks.it.
Nessun cambio di stack, branch policy o policy Lovable. Le altre sezioni
(Home, Juventus, Sinner, F1, MotoGP, "Stasera in TV", "Per provider") non
sono toccate.

### Changed

- **Edge function `streaming-releases` — action `new-italy`.** Quando
  l'utente non specifica un provider, la query TMDB Discover usa una
  whitelist di `with_watch_providers` IT mainstream (Netflix, Prime,
  Disney+, Apple TV+, Paramount+, NOW/Sky, Crunchyroll, RaiPlay, Mediaset
  Infinity, Discovery+) come OR-list, anziché lasciare il filtro vuoto.
  Aggiunto `vote_count.gte=20` (movie) / `vote_count.gte=10` (tv) per
  tagliare titoli senza riscontro reale. Esclusi a monte i titoli senza
  poster (`poster_path` nullo). Default `sort_by` allineato a
  `popularity.desc`; `release` resta opzionale dal client.
- **Finestra di default ampliata** lato server quando `dateFrom`/`dateTo`
  non sono specificati: `today-30 .. today+60` (era `today-7 .. today+30`).
  Discover indicizza per data di prima uscita mondiale, non per ingresso
  sulla piattaforma IT, quindi serve una finestra realistica.
- **Paginazione TMDB**: 2 pagine per kind (~40 candidati per movie/tv) per
  alimentare i filtri client e il cap finale di 60 item.
- **Post-filtro mainstream IT**: dopo l'arricchimento `/watch/providers`
  IT, gli item che non hanno alcun provider della whitelist mainstream
  vengono scartati (evita il caso "disponibile solo su Plex").
- **Frontend `StreamingPage`**: default UI per la vista "Catalogo Italia"
  cambia da "Ordina per data uscita" a "Ordina per popolarità", coerente
  con starflicks.it. La preferenza viene serializzata in URL solo se
  diversa dal nuovo default.

### Notes

- Nessuna modifica a `new-today`, `details`, `credits`, all'autenticazione
  o agli altri provider sportivi.
- Continua a non esistere alcun mock/placeholder: tutti i titoli mostrati
  in "Catalogo Italia" provengono da TMDB live in regione IT.
- L'ordinamento per data uscita resta disponibile dal selettore UI per
  chi vuole tracciare le uscite più recenti indipendentemente dalla
  popolarità.

## [2.3.0] — Streaming "Catalogo Italia" + dettaglio TMDB arricchito (2026-04-27)

Bump applicativo `2.2.0` → `2.3.0` esposto da `src/lib/version.ts` e dal
footer (`Calendar Events · v2.3.0`, `v` minuscola). Modifica funzionale
significativa **solo sulla sezione Streaming → tab "Nuove uscite"**: nuova
vista aggregata Italia ispirata al modello starflicks.it (anche lui basato
su TMDB), con generi, providers IT e link JustWatch sul singolo titolo.
Nessun cambio di stack, branch policy o policy Lovable. Le altre sezioni
sportive (Home, Juventus, Sinner, F1, MotoGP, "Stasera in TV") non sono
toccate.

### Added

- **Edge function `streaming-releases` — action `new-italy`.** Catalogo
  aggregato region IT senza vincolo provider in upfront. TMDB
  `/discover/{movie|tv}` con `watch_region=IT`,
  `with_watch_monetization_types=flatrate|free|ads`, finestra
  `primary_release_date` / `first_air_date`. Filtri opzionali via query:
  `provider=netflix|prime|disney|hbo|all`, `kind=movie|tv|all`,
  `genreId=<int TMDB>`, `dateFrom`/`dateTo`, `sort=release|popularity`.
  Generi mappati in italiano da `/genre/{movie|tv}/list?language=it-IT`
  (cache 24h). Per ogni titolo: arricchimento `availableProviders`
  (logo + nome + tipo flatrate/free/ads) e `justWatchLink` da
  `/watch/providers` IT (cache 1h). Cache risposta 1h per chiave.
- **Edge function `streaming-releases` — action `details`.** Payload
  one-shot per il dialog dettaglio: titolo, anno, generi IT, runtime o
  numero stagioni, regista (movie) o creators (tv), cast top 10,
  trailer YouTube key, providers IT con logo, link JustWatch del
  titolo. TMDB con `append_to_response=credits,watch/providers,videos`.
  Cache 24h.
- **`StreamingPage.tsx` — vista "Catalogo Italia" (default).** Toggle
  vista accanto alla precedente "Per provider" (mantenuta come opzione
  per il taglio rigoroso flatrate). Filtri: provider pill (Tutti +
  Netflix/Prime/Disney+/HBO Max), kind, genere TMDB IT (15 generi
  principali), ordinamento (data uscita / popolarità), finestra date.
- **Card uscita arricchita.** Riga generi sotto al titolo
  (es. "Thriller · Azione"), anno accanto al badge tipo,
  mini-strip con loghi dei provider IT disponibili (max 3 + "+N").
- **Dialog dettaglio uscita.** Box "Disponibile su (Italia)" con loghi
  e badge "Gratis"/"Con pubblicità" per free/ads, **trailer YouTube
  embed** (youtube-nocookie) quando presente, regista o creators,
  runtime o stagioni, generi, CTA principale "Vedi dove è disponibile"
  che usa il link JustWatch del titolo (deep link IT TMDB).

### Changed

- **Edge function `streaming-releases` — action `new-today`.** Mantiene
  la validazione rigorosa `flatrate IT` per il provider scelto, ma ora
  arricchisce ogni item con `genres` (label IT), `availableProviders` e
  `justWatchLink` per coerenza visiva con la nuova vista. Riusa la
  cache `/watch/providers` condivisa con `new-italy`.
- **Hook `useStreamingData.ts`.** Estesi i tipi `ReleaseItem` con
  `year`, `genres`, `availableProviders`, `justWatchLink`,
  `popularity`. Aggiunti `useReleasesItaly` e `useReleaseDetails`.
- **`ReleaseDetailDialog`** ora consuma una sola query `details`
  invece di `credits` + dati card, riducendo il roundtrip e
  garantendo dati TMDB freschi anche quando si apre un titolo dalla
  vista provider.
- **API client `sportsApi.ts`.** Aggiunti `streamingApi.getReleasesItaly`
  e `streamingApi.getReleaseDetails`.

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` pulito.
- `npm run check:italian` 0 violazioni.
- Edge function deployata e testata via curl: `new-italy` (kind=movie,
  sort=release) restituisce items con `genres` italiani,
  `availableProviders` con logo, `justWatchLink` valido. `details` su
  `movie/1318447` (Apex) restituisce Netflix come flatrate IT, regista
  "Baltasar Kormákur", trailer YouTube key, generi "Thriller, Azione".

### Note operative

- Le "uscite" restano basate su `primary_release_date` / `first_air_date`
  TMDB: è la data di prima pubblicazione mondiale, non la data di
  ingresso sulla singola piattaforma in Italia. La striscia provider
  sotto la card chiarisce esplicitamente "dove è già disponibile in IT
  oggi". Stesso compromesso adottato da starflicks.it.
- Provider IT supportati invariati: Netflix, Prime Video, Disney+, HBO
  Max. La vista "Catalogo Italia" mostra però **anche** loghi di altri
  provider (es. Plex, RaiPlay, Mediaset Infinity) quando TMDB li indicizza
  per il titolo, perché derivano da `/watch/providers` e non da una lista
  statica.

## [2.2.0] — UI/UX consolidation (2026-04-21)

Bump applicativo `2.1.0` → `2.2.0` esposto da `src/lib/version.ts` e dal
footer (`Calendar Events · v2.2.0`, `v` minuscola). Nessun cambio di stack,
fonti dati, schema payload edge function, branch policy o policy Lovable.
Tutte le voci sono UI/UX e helper di presentazione sopra la baseline `2.1.0`.

### Changed

- **Timezone Europe/Rome esteso a tutte le pagine sportive.** Audit e
  refactor di `src/pages/SinnerPage.tsx`, `src/pages/JuventusPage.tsx`,
  `src/pages/JuventusMatchPage.tsx`, `src/pages/Formula1Page.tsx` e
  `src/pages/MotoGPPage.tsx` per sostituire ogni `new Date(iso).getTime()`
  diretto sugli ISO con l'helper `toRomeDate` di `src/lib/dateUtils.ts`
  (policy "stringa naive = UTC, output Europe/Rome"). Caso reale corretto:
  in `MotoGPPage.tsx` il calcolo dello stato weekend (`prossimo` /
  `in_corso` / `completato`) usava `new Date(date)` sui campi date-only
  (`YYYY-MM-DD`), che venivano interpretati come midnight nel fuso del
  browser; ora `toRomeDate(date)?.getTime()` garantisce un timestamp
  coerente in qualunque fuso client. Nessun cambio al payload backend.
- **Stasera in TV — orario di fine programma in card.** In
  `src/components/home/TonightTvList.tsx` la cella ora di ogni programma
  in prima serata mostra adesso l'intervallo `HH:MM – HH:MM` quando il
  payload edge function include `endTime` esplicito (`hasExplicitEnd`
  true), così l'utente capisce perché un titolo è ancora in onda nella
  fascia 21:00–23:00. Per i programmi con sola durata stimata viene
  conservato l'orario di inizio singolo, evitando di esporre orari
  inferiti come fossero ufficiali. Versione mobile (`<article>`) e
  desktop/tablet (grid table) aggiornate in modo coerente; aria-label
  parlate adeguate ("dalle 21:30 alle 23:25"). Nessuna modifica a edge
  function, lista canali, payload o filtri.
- **Risultati Sinner — paginazione fissa a 4 card per pagina.** In
  `src/pages/SinnerPage.tsx` la sezione "Risultati" mostra ora sempre
  esattamente 4 elementi visibili (le ultime 4 schede della pagina
  corrente); il resto scorre tramite la paginazione esistente
  (`Precedente` / `Successiva`). Constante `RESULTS_PAGE_SIZE = 4`
  unica fonte di verità (passata anche al prefetch e all'hook
  `useSinnerResults`). Ridotto carico cognitivo: nessuna lista
  infinita, scroll prevedibile, identica esperienza su mobile e
  desktop.

### Added

- **Stato di caricamento durante cambio pagina nei risultati Sinner.**
  `src/pages/SinnerPage.tsx` mostra un overlay `LoadingState` con
  messaggio "Caricamento risultati…" quando `useSinnerResults`
  è `isFetching` su una pagina diversa dalla cache locale, eliminando
  l'ambiguità del momento in cui le 4 card precedenti restavano a
  schermo durante il fetch della pagina successiva. Nessuna modifica
  alla shape della query o al payload edge function.
- **Prefetch della pagina successiva nei risultati Sinner.** Aggiunto
  un `useEffect` in `src/pages/SinnerPage.tsx` che, appena la pagina
  corrente diventa stabile e `totalResultPages` è noto, invoca
  `queryClient.prefetchQuery` con la stessa `queryKey` di
  `useSinnerResults` per la pagina `N+1`. Risultato: cliccando
  "Successiva" la nuova lista è già in cache (`staleTime` 5 minuti) e
  appare istantaneamente; il prefetch è skippato sull'ultima pagina e
  quando `totalResultPages` non è ancora calcolato. Aggiornato
  `src/pages/SinnerPage.test.tsx` con un helper `renderWithClient` che
  monta i test dentro un `QueryClientProvider` (richiesto da
  `useQueryClient`).
- **Loading gate full-page su Juventus.** `src/pages/JuventusPage.tsx`
  mostra ora `<LoadingState message="Caricamento dati Juventus..." />`
  finché calendario, classifica e — quando rilevante — il fetch della
  pagina contenente la prossima partita non sono tutti completati. Nuovo
  derivato locale `isAwaitingNextMatch` che rileva i casi in cui il
  prossimo match risiede su una pagina diversa da quella visualizzata,
  così card "Prossima Partita" e resto del contenuto compaiono
  insieme, senza lo sfarfallio in cui prima si vedeva la pagina
  parzialmente popolata. Errori (`calError` / `stError`) bypassano il
  gate per cedere il controllo agli stati `ErrorState` /
  `OfflineFallback` esistenti.

### Notes

- Tutti i 124 test `vitest` continuano a passare dopo il refactor.
- Lo script `npm run check:tz-juventus` resta verde: nessun nuovo
  callsite di `toLocaleTimeString` / `toLocaleDateString` privo di
  `timeZone: "Europe/Rome"` introdotto nelle pagine sport o Home.
- Il footer continua a usare la `v` minuscola (`Calendar Events ·
v2.2.0`).

### Performance

- **Ottimizzazione caricamento immagini e loghi (solo compressione, mai
  sostituzione visiva).** Tutti gli asset binari in `public/` sono stati
  ricompressi mantenendo invariate dimensioni in pixel, formato e aspetto
  visivo (verifica QA: scarto medio RGB <3 su 128×128 sample, impercettibile
  a occhio). Risultati misurati:
  - `logo-header.jpg`: 1150 KB → 84 KB (-93%) — JPEG q85 progressive, 2064×512.
  - `og-image.jpg`: 1015 KB → 88 KB (-91%) — JPEG q85, 1376×768.
  - `favicon.png`: 736 KB → 47 KB (-94%) — PNG palette ottimizzata, 1024×1024.
  - `constructors-f1/audi.png`: 652 KB → 52 KB (-92%).
  - `constructors-f1/cadillac.png`: 197 KB → 31 KB (-84%).
  - `constructors-motogp/{aprilia,ducati,honda,ktm,yamaha}.png`: 519/166/144/118/95 KB
    → 20/20/14/12/9 KB (media -90%).
  - **Nessun resize, nessuna conversione di formato, nessun rinomina,
    nessun nuovo asset creato.**
- **Hint browser in `index.html`**: aggiunti `preconnect` per `flagcdn.com`,
  `i.ytimg.com`, `image.tmdb.org`, host Supabase; `dns-prefetch` per
  `upload.wikimedia.org`; `preload` del logo header con `fetchpriority=high`
  per migliorare LCP.
- **Attributi `<img>` standardizzati** (zero impatto visivo): aggiunti
  `decoding="async"`, `loading="lazy"` (tranne LCP), `width`/`height`
  espliciti per evitare CLS in:
  - `Header.tsx` (logo: `fetchpriority="high"` + `decoding="async"`).
  - `PlayerHeader.tsx` (foto Sinner: `fetchpriority="high"` + `decoding="async"`).
  - `TeamLogo.tsx` (`decoding="async"`).
  - `HighlightCard.tsx` (`decoding="async"`, `width=320` `height=180`,
    `srcSet` 1x mqdefault / 2x hqdefault).
  - `ReleaseDetailDialog.tsx` (poster + cast: `decoding="async"`,
    `width`/`height`).
  - `Formula1Page.tsx` (foto piloti + bandiere flagcdn).
  - `MotoGPPage.tsx` (bandiere flagcdn).
  - `StreamingPage.tsx` (poster grid).
- **Variante CDN più leggera (stessa immagine, dimensione corretta)**:
  - `supabase/functions/highlights-youtube`: `thumbnailUrl` passa da
    `hqdefault.jpg` (480×360, ~30 KB) a `mqdefault.jpg` (320×180, ~12 KB).
    Il client serve `hqdefault` su display retina via `srcSet` 2x.
    Risparmio ~60% sui byte della griglia highlights.
  - `supabase/functions/streaming-releases`: `normalizeItem` normalizza
    eventuali path `w500/w780/original` su `w342` (sufficiente per card
    ~150-200px e dialog ~180px, anche su retina). `TMDB_IMG` era già
    `w342`: la regex è una difesa contro regressioni future.
- Risparmio aggregato stimato per pagina: header -1.1 MB, F1 costruttori
  -730 KB, MotoGP costruttori -900 KB, highlights -210 KB su 12 card.

### Fixed

- **Dettaglio partita Juventus mostrava sempre la stessa partita
  (Juventus–Parma).** Causa: il payload di `sports-football?action=calendar`
  non includeva un campo `id` per match, quindi il link generato in
  `JuventusPage` era `/juventus/partite/undefined` per tutte le card e
  `findMatch` in `JuventusMatchPage` matchava sempre il primo elemento del
  calendario. Soluzione: aggiunto slug deterministico `id` per ogni partita
  in `extractJuventusMatches` (`supabase/functions/sports-football/index.ts`)
  derivato dall'URL Sky quando disponibile (es.
  `2025-giornata-1-juventus-parma`) o composto da
  `competizione-data-home-vs-away` come fallback. `JuventusPage` linka via
  `encodeURIComponent(m.id)` e `JuventusMatchPage` decodifica il parametro e
  ignora gli item senza `id`.

### Added

- **Sezione "Highlights"** nelle pagine Juventus, Formula 1 e MotoGP, alimentata
  dai feed RSS pubblici delle 3 playlist YouTube ufficiali (Juventus, Sky Sport
  F1, MotoGP) tramite la nuova edge function `supabase/functions/highlights-youtube`.
  Nuovo endpoint `?sport=juventus|f1|motogp&limit=12` che ritorna fino a 25
  video reali con `videoId`, `title`, `publishedAt`, `source` (canale ufficiale)
  e thumbnail YouTube deterministica. Cache HTTP `public, max-age=600` per
  contenere il carico verso YouTube e `staleTime` 10 minuti su React Query
  (`useHighlights` in `src/hooks/useSportsData.ts`). Layout responsive con
  card grafiche 16:9 (overlay play, badge "Nuovo" per video ≤ 3 giorni, data
  italiana, fonte canale, tempo relativo via nuovo helper `formatRelativeIT`
  in `src/lib/dateUtils.ts`) e CTA "Vedi playlist completa" verso la
  playlist YouTube. Nessuna API key richiesta, nessun dato hardcoded: titoli,
  date e link provengono interamente dal feed live.
- **Pagina dettaglio partita Juventus** su rotta `/juventus/partite/:matchId`
  (`src/pages/JuventusMatchPage.tsx`). Header con loghi entrambe le squadre,
  score tipografico se la partita è terminata, badge competizione, data/ora
  in `Europe/Rome` via `formatJuventusDateTime`, broadcaster e countdown.
  Cinque tab nell'ordine richiesto: **Anteprima** (dati pre-partita reali),
  **Formazione**, **Modulo**, **Risultato** (parziale/finale dal payload Sky)
  e **Cronologia eventi**. Card del calendario e card "Prossima Partita" in
  `src/pages/JuventusPage.tsx` ora wrappate in `<Link>` verso il dettaglio
  (focus ring per accessibilità preservato).
- **Componente `UnavailableExternalSource`**
  (`src/components/common/UnavailableExternalSource.tsx`): stato vuoto
  riusabile e onesto per i tab Formazione / Modulo / Cronologia eventi. Sky
  Sport, Lega Serie A, TheSportsDB free e altri provider gratuiti non
  espongono lineup, modulo tattico o cronaca eventi via API pubblica: il
  componente lo dichiara esplicitamente in italiano e rimanda all'eventuale
  `match.link` reale (pagina Sky della partita) con CTA "Apri su Sky Sport".
  Nessun dato finto né mock introdotto, nel rispetto della policy
  `no hardcoded`.

### Changed

- **Date Juventus sempre normalizzate in fuso `Europe/Rome`**.
  Nuovi helper centralizzati `toRomeDate` e `formatJuventusDateTime`
  in `src/lib/dateUtils.ts`: tutte le stringhe ISO senza offset
  (caso teorico ma non garantito da Sky/Lega) vengono trattate come
  UTC e poi convertite in ora italiana via
  `Intl.DateTimeFormat({ timeZone: "Europe/Rome" })`. I tre callsite
  hand-rolled in `src/pages/JuventusPage.tsx` (card "Prossima Partita"
  - card calendario) e `src/pages/Index.tsx` (sezione Juventus) usano
    ora l'helper unico. Comportamento esterno per gli utenti invariato
    nei casi normali; eliminato il rischio che un orologio device su
    fuso non-Europe/Rome o una stringa naive bypassino la conversione.
- **Backend `sports-football`**: la `dateKey` per il lookup
  broadcaster (sia in `fetchBroadcasterMap` sia in
  `extractJuventusMatches`) viene ora calcolata sulla **data Roma**
  della partita anziché sulla data UTC. Risolve il drift mezzanotte
  per match che iniziano dopo le 22:00 UTC (es. 01:30 Roma del
  giorno successivo): broadcaster ora trovato correttamente.

### Added

- Lint guard `npm run check:tz-juventus`
  (`scripts/check-rome-tz.mjs`): impedisce nuovi callsite di
  `toLocaleTimeString` / `toLocaleDateString` privi di
  `timeZone: "Europe/Rome"` nelle pagine Juventus / Home /
  componenti Home. Integrato negli step CI di `ci-develop.yml` e
  `ci-pr-main.yml` accanto a `check:italian`. Suggerisce gli helper
  centralizzati di `dateUtils.ts`.
- Test Vitest aggiuntivi (5 nuovi blocchi in
  `src/lib/dateUtils.test.ts`) e suite Deno
  `supabase/functions/sports-football/index.test.ts` che copre
  l'edge case mezzanotte UTC del lookup broadcaster.

- **Loghi costruttori F1 e MotoGP da fonti ufficiali stabili**.
  F1: `F1_CONSTRUCTOR_LOGOS` (`supabase/functions/sports-f1/index.ts`)
  ora punta al CDN ufficiale `media.formula1.com/.../teams/2025/{slug}-logo.png`
  per i 10 team consolidati (stessa fonte usata anche da portali tipo
  Corriere via include server-side), eliminando la dipendenza da Wikimedia
  che restituiva HTTP 429 ricorrenti. Aggiunte le chiavi `audi` e
  `cadillac f1 team` per la lineup 2026 (slug FOM non ancora pubblicati),
  servite da asset locali in `public/constructors-f1/`.
  MotoGP: `MOTOGP_CONSTRUCTOR_LOGOS` (`supabase/functions/sports-motogp/index.ts`)
  ora usa asset locali in `public/constructors-motogp/` per i 5 maker
  (Ducati, Aprilia, KTM, Yamaha, Honda), eliminando i 429 Wikimedia che
  rendevano i loghi invisibili in entrambi i temi.
- **MotoGP — logo team ufficiale Pulselive accanto a ogni pilota**.
  Nuova `fetchMotoGPTeamPictures(year)` con cache 24h che chiama
  `api.motogp.pulselive.com/motogp/v1/teams` e popola il nuovo campo
  `teamLogoUrl` per ogni pilota della classifica (`standings`). La pagina
  `MotoGPPage.tsx` mostra il logo ufficiale del team accanto al nome team
  in tabella, con fallback iniziali via `<TeamLogo>` se l'API è offline.

- **Loghi e foto — fallback iniziali robusto su tutta l'app**.
  Nuovo componente `src/components/common/TeamLogo.tsx`: quando un'immagine
  remota fallisce (Wikimedia rate-limit, hot-link block, 404) mostra un
  badge con le iniziali della squadra/pilota su `bg-muted` con tipografia
  `font-heading`, garantendo contrasto sia in tema chiaro che scuro.
  `referrerPolicy="no-referrer"` per massimizzare il successo di
  caricamento. Sostituite tutte le `<img>` "logo/avatar" che prima
  scomparivano con `display:none` su errore in `Formula1Page.tsx`
  (costruttori), `MotoGPPage.tsx` (foto piloti + loghi costruttori) e
  `JuventusPage.tsx` (loghi squadre in classifica e calendario).

### Added

- **Juventus — card "Prossima Partita"**. Nuova card premium gold/navy
  sopra i tab di `JuventusPage.tsx` con avversario, logo, data/ora,
  broadcaster e countdown live. Riusa i dati paginati del calendario,
  con micro-fetch dedicato della pagina contenente il prossimo match
  quando l'utente naviga altrove.

### Fixed

- **Juventus — riga Juventus in classifica ora chiaramente visibile**
  in entrambi i temi: gradient gold orizzontale, bordo sinistro 4px
  oro, logo ingrandito con ring oro, posizione/squadra/punti in oro
  con `font-heading`.
- **MotoGP — foto Michele Pirro**: sostituito URL Pulselive 404
  inventato con foto reale Wikipedia
  (`Michele_Pirro_at_the_2025_Malaysian_Grand_Prix.jpg`).
- **MotoGP — Gresini Racing ora mappato a Ducati**. Aggiunta keyword
  `gresini` in `getTeamConstructor` (`supabase/functions/sports-motogp/index.ts`):
  Gresini è team satellite Ducati, ora riceve correttamente
  `constructor: "ducati"` e logo Ducati.

- **MotoGP — calendario completamente live, rimosso hardcode**.
  `supabase/functions/sports-motogp/index.ts`: eliminata la costante
  `MOTOGP_CALENDAR_2026` (22 GP hardcoded). Le action `calendar` e
  `next-event` ora interrogano l'API ufficiale **motogp.com (Pulselive)**:
  `/results/seasons` per risolvere lo `seasonUuid` (con cache 24h) e
  `/results/events?seasonUuid=...` per ottenere gli eventi reali. Filtro
  `test === false` per escludere le sessioni di test, ordinamento
  cronologico, `round` rinumerato 1..N. Nomi GP italianizzati via mappa
  `MOTOGP_GP_NAME_IT` (es. `GRAND PRIX OF SPAIN` → `GP di Spagna`).
  Su errore upstream: `dataSource: 'static-fallback'`, `data: []` /
  `null`, nessun fallback hardcoded. `meta.source = "motogp.com
(Pulselive API)"`. Il calendario F1 era già live via Jolpica/Ergast,
  nessuna modifica necessaria. **Effetto utente**: la sincronizzazione
  carica i 22 GP reali della stagione corrente; il toast warning "Dati
  non live per MotoGP" sparisce.
- **Sincronizzazione — categorizzazione `dataSource` corretta**.
  Nuovo modulo `src/hooks/syncWarning.ts` con `requiresWarning(meta)` e
  `categorizeDataSource(meta)`: whitelist `live` / `wikipedia` /
  `wikipedia+curated`. `useSyncAll.ts` rimuove `isLiveSource` e usa
  `requiresWarning`. `"static"` ora considerato `degraded` (dopo la
  migrazione MotoGP nessun endpoint del progetto deve più ritornare
  `static` di proposito; se accade è un sintomo reale da segnalare).
  Test unit in `src/hooks/syncWarning.test.ts` (10 casi).
- **Stasera in TV — chip genere garantito su ogni riga**.
  `src/lib/genreUtils.ts`: `inferGenre` cambia firma a
  `(family, channel, title) => string` (era `string | undefined`) e
  applica una cascata deterministica: famiglia/canale dedicati →
  keyword italiane estese (aggiunti Affari Tuoi, Belve, Don Matteo,
  Bake Off, Casa a Prima Vista, Che Tempo Che Fa, Verissimo, ecc.,
  con nuove categorie Fiction, Cooking, Lifestyle) → pattern
  strutturali (estrazione `(Genere)` finale, stagione/episodio) →
  default deterministico per famiglia (`rai`/`mediaset` → `Tv`,
  `sky-sport` → `Sport`, `sky-cinema` → `Film`, `discovery` →
  `Lifestyle`). `src/components/home/TonightTvList.tsx`: rimossi i
  rami condizionali `g ?` su Badge desktop/mobile e `aria-hidden` su
  cella genere; il chip viene ora sempre renderizzato e la cella e'
  sempre annunciata. Risolve i casi reali (Affari Tuoi, Belve) in cui
  alcune righe restavano senza chip per assenza di match keyword.
  Nessun cambio a payload, edge function, lista canali o policy.

- **Scraping TV — fallback deterministico per placeholder `EV-*`**.
  `supabase/functions/streaming-tv/index.ts`: `enrichTitle` ora applica per
  raw `EV-SP`/`EV-CN`/`EV-FILM`/`EV-TV` un singolo passaggio di scoring che
  combina filtro hard di genere atteso, bonus +1000 per match orario esatto,
  penalita' di distanza in minuti (clamp 12h) e tiebreaker `lengthBonus`
  capped a +1.0. Risolve i casi con piu' rich title competitor (es. Canale
  5 con partita 20:40 e highlights 23:00 entrambi `(Sport)`): vince quello
  col genere giusto piu' vicino temporalmente al raw, evitando associazioni
  spurie tra eventi sequenziali sullo stesso canale. Safety net invariato:
  se nessun candidato passa il filtro genere, fallback al match per orario
  esatto generico. Comportamento per raw non-placeholder e firma/payload
  invariati.

### Fixed

- **Stasera in TV: Canale 5 mancante in Home + titolo "Ev-Sp" non
  arricchito**. Due fix paralleli, backend e frontend.
  - `supabase/functions/streaming-tv/index.ts`: `extractRichTitles` ora
    ritorna `RichTitle[] = { title, hh?, mm? }[]` catturando anche l'orario
    quando un `HH:MM` precede entro 400 char il rich title nel blocco
    "scheda". `enrichTitle(rawUpper, rich, hh?, mm?)` aggiunge due fallback
    quando il match-by-prefix fallisce: (1) match per orario esatto
    `HH:MM`; (2) match per placeholder generico (`EV-SP` → genere
    Sport/Calcio/Tennis/..., `EV-CN`/`EV-FILM` → Film, `EV-TV` → Fiction)
    selezionando l'unico rich title compatibile col genere atteso. Risolve
    il caso reale di Canale 5 con `EV-SP` 20:40 + scheda "Calcio - Coppa
    Italia - Inter Vs Como (Sport)" non collegati da timestamp prossimo.
    Zero modifiche alla lista canali (`Canale 5` e tutti gli altri
    preservati), zero cambi al payload `Program`/risposta JSON.
  - `src/components/home/TonightTvList.tsx`: `inPrimeWindow` esteso da
    `21:00 - 22:30` a `20:30 - 23:00` Europe/Rome per non escludere kickoff
    sportivi (Coppa Italia 20:40, Champions/Serie A 20:45) e prime serate
    anticipate. `MIN_DURATION` alzata da 20 a 40 minuti per filtrare
    tg/promo/filler entrati con la finestra più larga (calcio 100+, fiction
    90+, film 100+, news show 40+, tg regionali ~30 esclusi). Sottotitolo
    scheda aggiornato a "Prima serata (dalle 20:30)". Filtro home
    Mediaset (`canale-5` + `italia-1`) invariato. Versione applicativa
    invariata a `2.1.0`.

### Added

- **Accessibilità Stasera in TV**. In
  `src/components/home/TonightTvList.tsx` la griglia condivisa (CSS Grid +
  `display:contents`) ora espone semantica ARIA Table completa per
  garantire una lettura corretta da screen reader (NVDA, JAWS, VoiceOver)
  anche dove `display:contents` storicamente perdeva i ruoli impliciti
  `<ul>/<li>`. Il `<ul>` riceve `role="table"`,
  `aria-label="Programmi in prima serata stasera"`, `aria-rowcount` e
  `aria-colcount=6`. Aggiunta come prima riga del grid una `<li
role="row">` invisibile (`sr-only` sulle 6 celle) con `role="columnheader"`
  per Famiglia, Ora, Canale, Titolo, Genere, Durata. Ogni riga programma
  desktop ha `role="row"` + `aria-rowindex` calcolato dalla pagina corrente,
  ogni cella ha `role="cell"` (o `rowheader` per la cella famiglia che
  apre il gruppo) + `aria-colindex` + `aria-label` parlati ("Inizio alle
  21:30", "Canale RAI 1", "Genere Fiction", "Durata 1 ora e 55 minuti").
  Le celle vuote (genere/durata mancanti, famiglia non-prima-riga) sono
  marcate `aria-hidden="true"` per evitare annunci ripetuti. Su mobile la
  riga programma è racchiusa in un `<article aria-label>` aggregato (es.
  "RAI RAI 1, alle 21:30, Il Commissario Montalbano, genere Fiction,
  durata 1 ora e 55 minuti"), più naturale per audio lineare. Il divider
  colorato famiglia resta `aria-hidden`, la label famiglia mobile/tablet
  diventa `role="rowheader"`. Il contatore paginazione ("Pagina X / Y · N
  canali") è `aria-live="polite" aria-atomic="true"` per annunciare il
  cambio pagina senza interrompere la navigazione. Aggiunta funzione
  `formatDurationSpoken(min)` in `src/lib/dateUtils.ts` con singolare/
  plurale italiano (`1 minuto`, `45 minuti`, `1 ora`, `2 ore`, `1 ora e 5
minuti`), coperta da test in `src/lib/dateUtils.test.ts`. Nuovo file
  `src/components/home/TonightTvList.test.tsx` con suite accessibilità
  (mock di `useQueries`) che verifica ruoli, columnheader, rowindex,
  aria-label parlate e `<article>` mobile. Layout visivo invariato su
  tutti i breakpoint (375/768/1024/1920 px). Versione applicativa invariata
  `2.1.0`.

- **Sincronizza stagione-aware + indicatore `dataSource` reale**. Riscritto `src/hooks/useSyncAll.ts`: il pulsante "Sincronizza" in home ora calcola al volo le stagioni correnti via `src/lib/currentSeason.ts` (Sinner/F1/MotoGP = anno solare, Juventus = stagione Serie A con cutoff luglio), rimuove dalla cache React Query tutte le chiavi sportive con stagione diversa da quella corrente (`removeQueries` con predicate sui 4 sport) e fa prefetch esplicito delle query primarie di ciascun sport per la stagione attiva (15 query in totale, divise in 4 step granulari con messaggi tipo "Aggiorno F1 2026...", "Aggiorno Juventus 2025/26...", ecc.). Aggiunto helper `formatJuventusSeasonLabel(season)` in `currentSeason.ts` (es. `2025` → `2025/26`, `2099` → `2099/00`) coperto da test. Le 4 edge function sport (`sports-f1`, `sports-football`, `sports-motogp`, `sports-tennis`) ora restituiscono un campo `meta: { dataSource, season, source }` che il client legge durante sync per distinguere dati live da fallback statici: `live` per Jolpica F1 e standings MotoGP da Sky; `live` o `fallback-previous-season` per Sky Sport calcio in base a `seasonUsed`; `wikipedia` o `wikipedia+curated` per Sinner (warning se la lista upcoming "curated" hardcoded è stata appesa); `static` per il calendario MotoGP 2026 (dataset hardcoded in `MOTOGP_CALENDAR_2026`). Toast finale di sync: `success` se tutti gli sport sono `live`/`wikipedia`, `warning` con elenco degli sport non-live altrimenti (es. "Sincronizzazione completata. Dati non live per: MotoGP 2026. Riprova più tardi."). Validato manualmente con `curl` sulle 4 edge function: F1 2026 → 22 gare reali da Jolpica, Juventus 2025 → 50 partite reali da Sky con broadcaster Lega Serie A, MotoGP 2026 → 22 gare statiche (atteso, documentato), Sinner 2026 → tornei reali Wikipedia con risultati round-per-round. Nuovo helper `callEdgeFunctionWithMeta<T>` in `src/lib/api/sportsApi.ts` per leggere l'envelope completo (data + meta) durante sync senza alterare il flusso normale di React Query (`callEdgeFunction` continua a restituire solo `data`). Versione applicativa invariata `2.1.0`.

- **Sinner – sezione Grande Slam ridisegnata per leggibilità**. In `src/components/sinner/PlayerHeader.tsx` i chip dei risultati Slam passano da pill compatte criptiche (`AO V ·24·25`) a mini-card auto-esplicative con sigla torneo (`AO`, `RG`, `W`, `US`, `Finals`), etichetta italiana del miglior risultato (nuova mappa `RESULT_LABELS`: `V`→`Vittoria`, `F`→`Finale`, `SF`→`Semifinale`, `QF`→`Quarti`, `4T`→`Ottavi`, `3T`/`2T`/`1T`→`3°/2°/1° turno`, `RR`→`Round Robin`), nome torneo esteso e anni a 4 cifre separati da `·` (es. `2024 · 2025`). Vittorie evidenziate con icona `Trophy` di Lucide e sfondo `gold-gradient`; non vittorie con `border border-border bg-secondary/30`. Container passa da `flex flex-wrap` a `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5` per layout sempre allineato (5 chip = 1 riga su desktop largo, 3+2 su sm, 2+2+1 su mobile 375px). Header sezione: `Grande Slam · Miglior risultato` con sottotitolo in `text-muted-foreground/70`. `aria-label` esteso su ogni `<li>` (es. "Australian Open: Vittoria, anni 2024, 2025"). Tooltip `title` mantenuto come fallback desktop. Rimossa la helper `shortYears`, non più usata. Tutti i colori restano token semantici (`primary`, `primary-foreground`, `border`, `secondary`, `muted-foreground`, `foreground`): tema chiaro/scuro preservato. Allowlist guard italiano estesa con `Round`/`Robin` (terminologia ufficiale ATP Finals). Nessuna modifica al backend `sports-tennis`, nessuna nuova dipendenza (`Trophy` già in `lucide-react`). Versione applicativa invariata `2.1.0`.

### Changed

- **Stasera in TV — layout ricostruito con CSS Grid condivisa**. In
  `src/components/home/TonightTvList.tsx` la lista programmi su tablet/desktop
  passa da flexbox per-riga a una griglia `<ul>` con `grid-template-columns`
  condivise (sm: 5 colonne `3.5rem · auto · 1fr · 6.5rem · 4.5rem`; lg: 6
  colonne con famiglia `8rem` davanti). Ogni `<li>` programma usa
  `display: contents` per ereditare la griglia del padre, così tutte le celle
  ora/canale/titolo/genere/durata cadono su colonne verticali perfettamente
  allineate riga su riga, eliminando il "ballo" del chip genere e della
  durata visibile in precedenza. Aggiunto `tabular-nums` sulla cella durata
  per allineare le cifre. Cella genere sempre presente (anche vuota) per
  preservare la colonna. Mobile (`<sm`) invariato: layout 2 righe stacked.
  Label famiglia: divider colorato + label testuale ora visibili anche su
  tablet (`lg:hidden`) sopra il primo programma di ogni famiglia, su desktop
  (`lg:`) si trasformano in colonna laterale dedicata. `data-testid`
  preservati (`family-divider`, `family-label-mobile`).

- **Stasera in TV (desktop): chip genere e durata sempre allineati a destra**. In `src/components/home/TonightTvList.tsx` il blocco titolo+meta del layout desktop (`hidden sm:flex`) passa da `flex-wrap` a `flex items-center gap-3`: il titolo è ora wrappato in `<span class="flex-1 min-w-0 truncate" title={row.title}>`, così chip genere e durata restano `shrink-0` allineati in fondo a destra su ogni riga. Tooltip nativo (`title`) preserva il titolo completo quando troncato. Layout mobile invariato. Nessuna modifica a logica dati, filtri, paginazione o divider famiglia. Versione applicativa invariata `2.1.0`.

- **Stagione automatica per ogni sport**. Eliminata l'impostazione "Stagioni predefinite" dalle Preferenze e i `SeasonSelector` da tutte le pagine sportive. Sinner, F1 e MotoGP usano sempre l'anno solare corrente; Juventus usa la stagione Serie A in corso (cutoff luglio: gennaio-giugno → anno-1, luglio-dicembre → anno corrente). Logica centralizzata nel nuovo helper `src/lib/currentSeason.ts` (`getCurrentSinnerSeason`, `getCurrentJuventusSeason`, `getCurrentF1Season`, `getCurrentMotoGPSeason`) coperto da `src/lib/currentSeason.test.ts`. `src/pages/Index.tsx` ora usa `getCurrentJuventusSeason()` al posto dell'hard-coded `2025`. Il pannello Preferenze contiene ora solo la sezione "Aspetto" (toggle tema chiaro/scuro): rimosso il footer con il bottone "Ripristina" perché non c'è più nulla da ripristinare. Le preferenze stagione precedentemente salvate in `localStorage["cse-seasons"]` vengono rimosse automaticamente al primo caricamento (`src/main.tsx`). Versione applicativa invariata `2.1.0`.

- **Preferenze come pannello laterale (UX chiusura intuitiva)**. Trasformata la rotta `/preferenze` da pagina piena a pannello globale (`Sheet` di shadcn) che si apre sopra la pagina corrente. Su desktop entra da destra (larghezza max `520px`, full-height, scroll interno), su mobile entra dal basso (`88vh`, drag handle visivo, rounded top). Quattro modi nativi per chiudere: tasto `X` in alto a destra del pannello, click sull'overlay scuro, tasto `Esc` da tastiera, nuovo click sull'icona ingranaggio in header (toggle). L'header non è più un `Link` a `/preferenze` ma un `Button` con `onClick={toggle}`, `aria-expanded` e `aria-controls="preferences-panel"`; stato attivo (oro pieno) quando il pannello è aperto. Nuovo `src/contexts/PreferencesPanelContext.tsx` (provider + hook `usePreferencesPanel`) montato in `Layout.tsx` insieme al nuovo `src/components/preferences/PreferencesPanel.tsx`. Pannello: header con titolo `Preferenze` + sottotitolo, sezione `Aspetto` (segmented control tema chiaro/scuro), sezione `Stagioni predefinite` (lista verticale compatta — icona + nome sport + anno corrente in oro + `SeasonSelector` inline + badge `Salvato`), footer sticky con pulsante `Ripristina`. La rotta `/preferenze` resta valida per bookmark / link diretti: `src/pages/PreferencesPage.tsx` è ora un componente che apre il pannello al mount e redirige a `/` (`navigate("/", { replace: true })`), così l'URL non resta incollata su `/preferenze`. Funzionalità invariate: `useTheme`, `useSeasonPreferences`, persistenza `localStorage`, sync `CustomEvent`, toast Sonner. Nessuna nuova dipendenza (`Sheet`, `Palette`, `CalendarDays` già disponibili). Versione applicativa invariata `2.1.0`.

- **Header — voce `PREFERENZE` rimossa dalla nav-pill principale**. In `src/components/layout/Header.tsx` rimossa la 7ª voce `PREF`/`PREFERENZE` da `navItems`, sostituita da un bottone icona `Settings` (rotondo, stile coerente con gli altri controlli a destra) che funge da `Link` a `/preferenze`. Stato attivo evidenziato in oro pieno (`border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/15`) quando `location.pathname === "/preferenze"`. Toggle tema chiaro/scuro (`Sun`/`Moon`) **rimosso dall'header** e spostato dentro la pagina `/preferenze` in una nuova card "Aspetto" con segmented control `Chiaro` / `Scuro` (stile gold quando attivo, ghost quando inattivo, `role="radiogroup"`). `useTheme` ora consumato direttamente da `PreferencesPage`; `Layout` non passa più props a `Header`. Toast di conferma `Tema aggiornato` su switch. Nav-pill desktop ora simmetrica con 6 voci sportive (Home, Streaming, Sinner, Juventus, F1, MotoGP). Hamburger mobile mostra solo le 6 voci sportive; icona ingranaggio Preferenze resta sempre visibile fuori dall'hamburger. Nessuna nuova dipendenza (`Settings`, `Sun`, `Moon`, `Palette` già in `lucide-react`). Hook `useTheme` invariato. Versione applicativa invariata `2.1.0`.

### Removed

- **Hook `useSeasonPreferences`, componente `SeasonSelector`, sezione preferenze stagioni**. Eliminati `src/hooks/useSeasonPreferences.ts` e `src/components/common/SeasonSelector.tsx` (non più usati da nessuna pagina). Rimossa la sezione "Stagioni predefinite" e il footer "Ripristina" dal `PreferencesPanel`. Vedi voce `Changed` precedente per il razionale (stagione automatica per sport). Versione applicativa invariata `2.1.0`.

- **Chip "Orari in ora italiana" rimosso ovunque**. Eliminato il render di `<TimezoneBadge />` da `src/pages/Index.tsx`, `src/pages/SinnerPage.tsx`, `src/pages/JuventusPage.tsx`, `src/pages/Formula1Page.tsx`, `src/pages/MotoGPPage.tsx` e `src/pages/StreamingPage.tsx`, con cleanup degli import non più usati. Cancellato il componente `src/components/common/TimezoneBadge.tsx`. Nessun cambio funzionale: tutti gli orari restano formattati nel fuso `Europe/Rome` via `dateUtils` e `Intl.DateTimeFormat`. Versione applicativa invariata `2.1.0`.

- **Estensione guard CI titoli pagina/modali**. `scripts/check-italian-ui.mjs` ora cattura anche `document.title` assegnato via template literal (parte statica prima di `${...}`), il contenuto testuale di `<DialogTitle>`/`<AlertDialogTitle>`/`<SheetTitle>`/`<DrawerTitle>`/`<SidebarTitle>` (kind `dialog-title:<Tag>`) e la prop `title="..."` su qualunque componente il cui nome contiene `Dialog`/`Modal`/`Sheet`/`Drawer` (kind `dialog-title-prop:<Tag>`). I report di errore usano prefissi espliciti `TITOLO PAGINA (document.title)` e `TITOLO MODALE (<Tag>)` / `TITOLO MODALE (prop title su <Tag>)` per facilitare il triage. Validato con 4 test negativi (`document.title = "Settings"`, `document.title = \`Settings · ${app}\``, `<DialogTitle>Close window</DialogTitle>`, `<ConfirmDialog title="Delete item">`): tutti falliscono come previsto, baseline corrente resta a 0 violazioni. Documentazione aggiornata in `README.md`. Nessuna modifica UI, nessuna nuova dipendenza, allowlist e `FORBIDDEN_WORDS`invariati. Versione applicativa invariata`2.1.0`.

- **Audit lingua UI completo + rafforzamento `check-italian-ui`**. Eseguito sweep manuale e automatico su tutte le superfici testuali utente (`index.html`, `public/manifest.webmanifest`, JSX, attributi ARIA, `placeholder`, `title`, `alt`, `sr-only`, toast Sonner, `document.title`): **0 stringhe inglesi residue**, baseline confermata pulita. Esteso `scripts/check-italian-ui.mjs` con nuove superfici di analisi: attributi `aria-describedby`, `aria-roledescription`, `aria-valuetext`, prop di componenti `subtitle` e `description`, primo argomento dei `toast(...)`/`toast.success(...)`/`toast.error(...)`/`toast.info(...)`/`toast.warning(...)`/`toast.loading(...)` (kind `toast-message`) e assegnazioni `document.title = "..."` (kind `document-title`). Aggiunto commento esplicativo su `Home`, `Sport`, `Open` nell'allowlist (uso italiano corrente o nomi propri di tornei). Documentati in `README.md` i marker `// @lingua-ignore` (riga) e `@lingua-ignore-file` (file) come escape valves. Nessuna modifica UI, nessuna nuova dipendenza, allowlist invariata. Versione applicativa invariata `2.1.0`.

- **Guard CI lingua italiana**. Nuovo script `scripts/check-italian-ui.mjs` (Node ESM, zero dipendenze) che scansiona `src/**/*.{ts,tsx}` (escluse `src/components/ui/*`, file `*.test.*`/`*.spec.*` e `*.d.ts`), estrae testo JSX e attributi UI (`aria-label`, `aria-description`, `placeholder`, `title`, `alt`) e fallisce con exit 1 se compaiono parole inglesi proibite (`Best`, `Live`, `Loading`, `Close`, `Next`, `Previous`, `Page`, `Found`, `Toggle`, `Sidebar`, `Cancel`, ecc.) fuori allowlist (brand, sigle tecniche, nomi propri, eccezioni `STREAMING`/`CALENDAR EVENTS`). Nuovo script npm `check:italian` e nuovo step `Italian UI guard` aggiunto ai workflow `.github/workflows/ci-pr-main.yml` e `.github/workflows/ci-develop.yml` (job `quality`, dopo `Lint`, prima di `Unit tests`). Marker per skip mirato: `// @lingua-ignore` (riga) e `@lingua-ignore-file` (intero file). Documentato in `README.md`, `AGENTS.md` e `.github/instructions/frontend.instructions.md`. Versione applicativa invariata `2.1.0`.

- **Sinner – restyling premium del player header**. Riprogettato `src/components/sinner/PlayerHeader.tsx`: foto profilo portrait 4:5 (`w-28 h-36` mobile / `w-32 h-40` desktop) con `object-cover object-top` per non tagliare la testa nel ritaglio US Open 2025, alone gold (`gold-gradient` blur) decorativo e ring oro doppio con offset su `--card`. Statistiche chiave riorganizzate in 3 KPI card (Ranking ATP, Stagione 2026, Miglior ranking) con label gold uppercase e ranking in `text-gold-gradient`. Bio (Altezza/Peso/Mano/Nato a/Coach) ora in chip arrotondati con icone Lucide (`Ruler`, `Weight`, `Hand`, `MapPin`, `UserRound`), wrap responsive. Sezione Grande Slam: chip vincitori con sfondo `gold-gradient` premium, non vincitori su `bg-secondary/30`, separati da divider. Footer fonte spostato sotto divider con icona `Info` e size leggibile. Token semantici (`--card`, `--muted`, `--primary`, `--border`, `--secondary`) verificati in light + dark. API prop invariate, nessuna regressione su `SinnerPage.tsx`. Versione applicativa invariata `2.1.0`.

- **Italianizzazione totale UI + policy memorizzata**. Tradotti i residui inglesi nei componenti shadcn (`pagination.tsx`: `Previous`/`Next`/aria → `Precedente`/`Successiva`; `dialog.tsx` e `sheet.tsx`: sr-only `Close` → `Chiudi`; `sidebar.tsx`: `Toggle Sidebar` → `Apri/chiudi barra laterale`; `carousel.tsx`: `Previous slide`/`Next slide` → `Slide precedente`/`Slide successiva`; `breadcrumb.tsx`: aria `breadcrumb` → `percorso`, sr-only `More` → `Altro`), `src/pages/NotFound.tsx` (`Page not found` → `Pagina non trovata`, `Return to Home` → `Torna alla Home`), `src/components/sinner/PlayerHeader.tsx` (`Best ranking` → `Miglior ranking`) e `src/components/common/EventCard.tsx` (badge `LIVE` → `IN DIRETTA`). Memorizzata la policy "Italian-only UI" in `AGENTS.md` (sezione "Regole di modifica") e in `.github/instructions/frontend.instructions.md`: tutta l'UI deve essere in italiano, uniche eccezioni `STREAMING` e `CALENDAR EVENTS`; nomi propri e sigle tecniche restano invariati. Versione applicativa invariata `2.1.0`.

- **Sinner – profilo da Wikipedia Italia (foto US Open 2025, peso, palmarès Slam)**. La action `player-info` di `supabase/functions/sports-tennis/index.ts` ora legge `https://it.wikipedia.org/wiki/Jannik_Sinner` invece della voce inglese: nuovo parser per il template `infobox sinottico` (etichette IT: `Altezza`, `Peso`, `Vittorie/sconfitte`, `Titoli vinti`, `Miglior ranking`, `Ranking attuale`), nuovo parser palmarès Grande Slam (Australian Open, Roland Garros, Wimbledon, US Open + Tour Finals) ed estrazione della data "Statistiche aggiornate al ...". Aggiunti i campi `weight`, `slamResults`, `statsUpdatedAt` al payload e al componente `src/components/sinner/PlayerHeader.tsx` (nuova riga `Peso` nel `<dl>`, sezione "Grande Slam" con chip per torneo, footer "Fonte: Wikipedia Italia · Statistiche aggiornate al ..."). Foto profilo aggiornata alla versione `Jannik_Sinner_US_Open_2025_(cropped).jpg` (immagine principale dell'infobox IT). Stagione 2026 (calendario, match, risultati round-per-round) **resta su Wikipedia EN** perché la voce stagione IT non esiste in modo stabile: doppia fonte dichiarata in `README.md`. Cache server-side 30 minuti invariata. Versione applicativa invariata `2.1.0`.

- **Sinner – dati live da Wikipedia + ranking #1 + foto profilo**. Riscritta `supabase/functions/sports-tennis/index.ts` per leggere ranking corrente, infobox carriera, calendario 2026 e match round-per-round (opponent + ranking opponent + score + esito V/S) scrapando tre pagine pubbliche di Wikipedia (`Jannik_Sinner`, `2026_Jannik_Sinner_tennis_season`) con cache server-side 30 minuti per fair use. Sostituisce i dataset statici 2026 che falsamente dichiaravano fonte "ATP Tour". Nuovo componente `src/components/sinner/PlayerHeader.tsx` con foto Wikimedia Commons in alto a sinistra (96×96, ring gold, fallback iniziali "JS"), ranking ATP Singolare in grande con data aggiornamento ("aggiornato al 13 aprile 2026"), record stagione 2026 (24-2 92.31%, 3 titoli), best ranking, altezza, mano, città di nascita, coach. Card match in `SinnerPage.tsx` ora mostra round (1R/QF/SF/F), ranking avversario e chip esito V/S con token `--success` / `--destructive`. Card tornei mostra tier, location, surface, date range e risultato. Hook `useSinnerInfo` allineato a stale time 30 minuti. Home page invariata, ma `useSinnerNextEvent` riceve automaticamente il prossimo torneo reale (Madrid Open 22 aprile). **Verifica esplicita fatta**: ATPTour.com è SPA, non scrapabile da Edge Function senza browser headless. Wikipedia è scelta consapevole con limiti dichiarati (latenza 24-48h, fragilità parser regex, solo stagione 2026). Versione invariata `2.1.0`.

- **Indicatore stato offline/online + schermata di fallback**. Nuovo hook `src/hooks/useOnlineStatus.ts` basato su `navigator.onLine` + listener `online`/`offline`, espone anche `justReconnected` (true per ~3s al ritorno online). Nuovo componente `OfflineIndicator` (`src/components/common/OfflineIndicator.tsx`): banner sticky in cima al `<main>` con token `--destructive`, animato con Framer Motion (180ms slide-down), `role="status"` + `aria-live="polite"`. Nuovo componente `OfflineFallback` (`src/components/common/OfflineFallback.tsx`): schermata grande con icona `WifiOff`, mostrata nelle pagine eventi (Home, Formula 1, MotoGP, Juventus, Sinner) quando tutte le query falliscono **e** non c'e cache **e** il browser e offline; pulsante "Riprova" disabilitato finche non torna la connessione. Toast Sonner "Connessione ripristinata" gestito in `Layout.tsx` su `justReconnected`. **Niente service worker, niente `vite-plugin-pwa`, nessun manifest aggiornato**: l'app resta una SPA standard, la cache React Query e in memoria (un hard reload offline mostra il fallback). Versione invariata `2.1.0`.

- Pagina **Preferenze** (`/preferenze`) per visualizzare e modificare in un unico posto le stagioni salvate di Sinner, Juventus, Formula 1 e MotoGP. Ogni card mostra la stagione corrente in grande con `text-gold-gradient`, un `SeasonSelector` riutilizzato, conferma visiva immediata tramite chip "Salvato" (token semantico `--success` aggiunto a `index.css` + `tailwind.config.ts`, leggibile in light e dark) e toast Sonner. Pulsante "Ripristina valori predefiniti" che resetta tutte le stagioni a `max(currentYear, 2026)`. Sync cross-componente live tramite `CustomEvent("cse-seasons-changed")` ascoltato da `useSeasonPreferences`, così le pagine sportive già montate riflettono il cambio senza reload. Voce di navigazione **Preferenze** aggiunta in `Header.tsx` con icona `Settings` di `lucide-react`. Chiave `localStorage` invariata (`cse-seasons`), versione invariata `2.1.0`.

- Badge "Orari in ora italiana · CET/CEST" nelle pagine eventi (Home, Formula 1, MotoGP, Juventus, Sinner, Streaming). La sigla DST è calcolata runtime via `Intl.DateTimeFormat` con `timeZone: "Europe/Rome"`, quindi resta sempre coerente al passaggio CET ↔ CEST. Tooltip esplicativo accessibile via mouse e tastiera.
- **Performance – transizioni globali tema scoped al toggle**: rimossa la
  regola permanente `*, *::before, *::after { transition: ... }` da
  `src/index.css`. La transizione 280ms ease su `background-color`,
  `border-color`, `color`, `fill`, `stroke`, `box-shadow` ora si attiva
  solo quando `<html>` ha la classe `theme-transitioning`, applicata da
  `useTheme.ts` per 320ms al cambio sole/luna (skip al primo mount).
  Effetto visivo del toggle invariato; eliminato il costo di style
  recalc/paint su hover, focus e mount in pagine con molti nodi
  (`/streaming`, `/formula1`, `/motogp`, `/juventus`). Rispetto di
  `prefers-reduced-motion` mantenuto. Rimossa la classe orfana
  `.theme-no-transition`. Nessun cambio funzionale, versione invariata
  `2.1.0`.

- **Badge broadcaster: copertura estesa** oltre DAZN/Sky con helper unico
  `src/lib/broadcasterStyle.ts`. Aggiunti token `--brand-now`, `--brand-amazon`,
  `--brand-mediaset`, `--brand-rai`, `--brand-tv8`, `--brand-discovery`,
  `--brand-eurosport` in `:root` e `.dark` (tinte schiarite per dark).
  `Index.tsx` e `JuventusPage.tsx` ora usano `getBroadcasterStyle()` invece
  del condizionale inline `if DAZN else Sky`. Broadcaster sconosciuti hanno
  fallback neutro (`bg-muted text-foreground border-border`) sempre leggibile
  in entrambi i temi. DAZN e Sky restano visivamente identici. Nessun cambio
  funzionale, versione invariata `2.1.0`.

- **Theme-color dinamico per browser chrome / PWA**: il `<meta name="theme-color">`
  neutro (senza `media`) viene ora scritto inline in `index.html` in base al tema
  salvato in `localStorage` (`cse-theme`) prima del primo paint, e aggiornato
  runtime da `useTheme.ts` ad ogni toggle sole/luna. La barra di stato del
  browser e la chrome PWA seguono il tema scelto dall'utente
  (`#0B1A33` dark, `#F5F7FA` light) indipendentemente da `prefers-color-scheme`.
  I due `<meta theme-color media="...">` esistenti restano come fallback.
  `manifest.webmanifest` invariato (splash PWA resta navy). Nessun cambio
  funzionale, versione invariata `2.1.0`.

- **Refactor – colori hardcoded estratti in CSS variables semantici**:
  introdotti nuovi token `--brand-dazn`, `--brand-dazn-contrast`,
  `--brand-sky`, `--brand-ducati`, `--brand-aprilia`, `--brand-ktm`,
  `--brand-yamaha`, `--brand-honda` in `:root` e `.dark` con tweak di
  leggibilità per il tema scuro. `MOTOGP_CONSTRUCTOR_COLORS`,
  badge DAZN/Sky in `Index.tsx` e `JuventusPage.tsx` ora referenziano
  i nuovi token (`hsl(var(--brand-*))`) invece di literal HEX/rgba.
  `COMPETITION_COLORS` Juve rimappato sulla palette oro/blu (Serie A
  oro, Champions accent, Coppa Italia secondary navy) per seguire
  automaticamente il cambio tema. Identità visiva invariata, brand
  colors centralizzati in un unico punto. Nessun cambio funzionale,
  versione invariata `2.1.0`.

- **Tema chiaro/scuro – transizioni fluide e palette oro/blu rifinita**:
  aggiunto script inline anti-FOUC in `index.html` che applica la classe
  tema da `localStorage` prima del render React (no flash al boot).
  Aggiornata palette light in `src/index.css` con tinta blu più
  percepibile (background `220 30% 96%`, card `220 25% 99%`, secondary
  navy `220 60% 25%`, border `220 25% 84%`) per rafforzare l'identità
  oro/blu anche in light. Aggiunte transizioni globali fluide ~280ms su
  proprietà di colore (`background-color`, `border-color`, `color`,
  `fill`, `stroke`, `box-shadow`) con rispetto di
  `prefers-reduced-motion`. Sincronizzato `color-scheme` su
  `documentElement` per chrome nativo (scrollbar, input). Badge
  broadcaster DAZN/Sky in Home ora con varianti light/dark dedicate.
  Nessun cambio funzionale, versione invariata `2.1.0`.

- **MotoGP – colori brand costruttori nella classifica costruttori**: il
  logo di ogni team nella tab "Classifica Costruttori" su `/motogp` è ora
  racchiuso in una cornice con bordo colorato e sfondo soft basato
  sull'identità visiva del costruttore (Ducati rosso, Aprilia nero, KTM
  arancione, Yamaha blu, Honda rosso). Backend `sports-motogp` espone un
  nuovo campo `constructor: string | null` nel payload
  `constructor-standings` (riusa `getTeamConstructor`); colori statici
  vivono solo nel frontend (`MOTOGP_CONSTRUCTOR_COLORS` in
  `src/pages/MotoGPPage.tsx`). Team senza constructor mappato mostrano
  cornice neutra. Backward-compatible.
- **MotoGP/F1 – bandiera nazionalità nella classifica piloti**: aggiunta
  mini bandiera SVG (~20x14px) accanto al nome pilota nella tab
  "Classifica Piloti" sia su `/motogp` sia su `/formula1`. Caricata da
  `https://flagcdn.com/{cc}.svg` (CDN pubblico). Per F1 usa il campo
  `nationality` già esposto da Jolpica, mappato a ISO-2 lato frontend
  (`src/lib/f1Utils.ts`). Per MotoGP aggiunto campo
  `nationality: string | null` (ISO-2 lowercase) nel payload `standings`
  con mappa statica `MOTOGP_RIDER_NATIONALITY_BY_SURNAME` allineata 1:1
  alla mappa numeri di gara. Backward-compatible. Piloti/driver senza
  nazionalità mappata (wildcard MotoGP, eventuale nazionalità F1 non in
  mappa) non mostrano la bandiera — nessun fallback inventato, nessun
  broken image grazie a `onError`. Richiede deploy edge function
  `sports-motogp`. Versione applicativa invariata `2.1.0`.
- **MotoGP – numero di gara nella classifica piloti**: aggiunto badge tondo
  con il numero di gara accanto alla foto del pilota nella tab "Classifica
  Piloti" di `/motogp`. Mappa statica per la griglia 2026 in
  `supabase/functions/sports-motogp` (campo `number: number | null` nel
  payload `standings`, backward-compatible). I piloti senza numero mappato
  (es. wildcard) non mostrano il badge — nessun fallback inventato.
  Richiede deploy edge function `sports-motogp`. Versione applicativa
  invariata `2.1.0`.
- **Sinner – allineamento header e messaggi**: rimosso sottotitolo
  "Dati da ATP Tour" dall'header della pagina `/sinner` e normalizzati i
  messaggi di loading/empty rimuovendo i riferimenti a "ATP Tour" e allo
  scraping. Allineamento UX con le altre pagine sportive (Formula 1,
  MotoGP, Juventus) che non espongono la fonte dati nel sottotitolo.
  Nessun cambio a edge function `sports-tennis`, hook o shape payload.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – calendario 2026 allineato a motogp.com**: corretto nome del
  round 4 (Jerez, 24–26 aprile) da `GP d'Andalusia` a `GP di Spagna`,
  allineandolo al calendario ufficiale 2026 pubblicato su `motogp.com`.
  Nessun altro cambio: 21 round su 22 erano già corretti per date,
  località, circuiti e country code. Dataset resta hardcoded in
  `supabase/functions/sports-motogp` come previsto da `AGENTS.md`.
  Richiede deploy edge function `sports-motogp`. Nessun impatto su
  frontend, hook o shape payload. Versione applicativa invariata `2.1.0`.
- **Streaming – deep link al titolo sulla piattaforma**: il bottone
  "Vai a {provider}" nel dialog dettaglio uscita ora porta direttamente
  alla pagina del singolo titolo (deep link JustWatch/TMDB via campo
  `results.IT.link` di `/watch/providers`), con fallback automatico alla
  homepage del provider se il link non è disponibile. Edge function
  `streaming-releases`: `tmdbItemAvailableIT` rinominata in
  `tmdbItemProviderInfoIT` e ora ritorna `{ available, deepLink }`;
  `normalizeItem` propaga `deepLink` nel payload di ogni item.
- **Juventus – paginazione calendario (backend + frontend)**: l'action
  `calendar` di `supabase/functions/sports-football` ora accetta `page` e
  `pageSize` opzionali e, quando presenti, restituisce
  `{ items, total, page, pageSize, totalPages, nextUpcomingIndex }` invece
  dell'array piatto (retrocompatibilità preservata: senza parametri il
  payload resta un array). Frontend in `JuventusPage.tsx` mostra 12 partite
  per pagina con componente `Pagination` (shadcn) e atterra automaticamente
  sulla pagina che contiene la "Prossima" partita al primo caricamento;
  reset a pagina 1 al cambio stagione. `useJuventusCalendar` aggiornato per
  includere `page`/`pageSize` nella `queryKey` con `placeholderData` per UX
  fluida tra cambi pagina. Richiede deploy edge function `sports-football`.
  Versione applicativa invariata `2.1.0`.
- **Streaming – filtro "Solo in arrivo"**: aggiunto toggle nel tab Nuove
  uscite per nascondere le release con `releaseDate` già passata (utile
  quando il fallback "widened" allarga la finestra). Stato persistito in URL
  via `upcoming=1`. Versione applicativa invariata `2.1.0`.
- **Formula 1 – foto piloti completa**: risolto il caso "sagoma grigia
  vuota" per i rookie/piloti 2026 senza foto ufficiale sul CDN F1
  (`media.formula1.com` con direttiva Cloudinary `d_driver_fallback_image.png`
  che restituisce HTTP 200 + immagine placeholder, impedendo l'attivazione
  dell'`onError`). Modifiche in `supabase/functions/sports-f1/index.ts`:
  aggiunto helper `normalizeKey` (lowercase + rimozione accenti) per matchare
  correttamente nomi tipo "Pérez" / "Hülkenberg"; estesa mappa
  `F1_DRIVER_PHOTOS` con URL Wikimedia Commons verificati per `lindblad`,
  `perez`, `bottas`; invertita priorità: mappa statica vince su OpenF1
  quando definita. Aggiunto fallback `onError` sull'`<img>` foto pilota in
  `Formula1Page.tsx` come safety net. Richiede deploy edge function
  `sports-f1`. Versione applicativa invariata `2.1.0`.
- **Formula 1 – fix loghi costruttori**: sostituiti i 10 URL nella mappa
  `F1_CONSTRUCTOR_LOGOS` (`supabase/functions/sports-f1/index.ts`) con
  asset stabili da Wikimedia Commons / Wikipedia EN — gli URL precedenti
  su `media.formula1.com/.../teams/2025/<team>-logo.png.transform/2col/...`
  restituivano 404 per diverse scuderie (RB, Kick Sauber, Alpine, ecc.),
  causando spazi vuoti nella tab "Costruttori". Aggiunto fallback `onError`
  sull'`<img>` del logo in `Formula1Page.tsx` per nascondere immagini rotte
  (stessa strategia già adottata per MotoGP). Tutti i 10 URL verificati
  200 OK prima del commit. Richiede deploy edge function `sports-f1`.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – fix loghi costruttori**: corretti gli URL nella mappa
  `MOTOGP_CONSTRUCTOR_LOGOS` (Ducati, Aprilia, KTM, Yamaha, Honda) — gli URL
  precedenti su `resources.motogp.pulselive.com` erano placeholder non
  esistenti (404). Ora puntano a Wikipedia Commons. Aggiunto fallback
  `onError` su `<img>` in `MotoGPPage.tsx` per nascondere immagini rotte.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – nomi piloti completi e foto wildcard/sostituti**: la classifica
  piloti `/motogp` ora espande i nomi brevi di Sky Sport (es. "Pirro M.")
  in formato "Nome Cognome" (es. "Michele Pirro") tramite mappa
  `MOTOGP_RIDER_FULL_NAMES` con fallback al nome originale. Aggiunte foto
  per wildcard/sostituti (Pirro, Savadori, Pedrosa, Crutchlow, Bradl).
  F1: formato nome già corretto (`givenName + familyName` da Jolpica),
  nessuna modifica. Versione applicativa invariata `2.1.0`.
- **Formula 1 – rimossa nota "Dati reali da Jolpica/Ergast API"** dal
  sottotitolo della pagina `/formula1`: il `subtitle` del `SectionHeader`
  non viene più mostrato. Fonte dati invariata lato edge function
  `sports-f1` (Jolpica + OpenF1 + fallback statici). Versione applicativa
  invariata `2.1.0`.
- **MotoGP – rimossa nota "Dati da Sky Sport"** dal sottotitolo della pagina
  `/motogp`: il `subtitle` del `SectionHeader` non viene più mostrato. Fonte
  dati invariata lato edge function `sports-motogp` (Sky Sport + calendario
  statico 2026 + mapping). Versione applicativa invariata `2.1.0`.
- **Juventus – rimossa nota "Dati reali da Sky Sport Italia"** dal sottotitolo
  della pagina `/juventus`: il `subtitle` del `SectionHeader` non viene più
  mostrato. Fonte dati invariata lato edge function `sports-football`
  (Sky Sport Italia + Lega Serie A). Versione applicativa invariata `2.1.0`.
- **Streaming – rimossa nota informativa fonte palinsesto TV** nel tab
  `/streaming?tab=tv`: il paragrafo che indicava
  `staseraintv.com` come fonte di scraping non viene più mostrato in UI.
  Logica di scraping invariata lato edge function `streaming-tv`
  (resta `staseraintv.com` con fallback `superguidatv.it`).
  Versione applicativa invariata `2.1.0`.
- **Streaming – rimosso messaggio informativo "finestra estesa"** nel tab
  `/streaming?tab=releases`: l'avviso che compariva quando l'edge function
  `streaming-releases` attivava il fallback `widenedWindow` non viene più
  mostrato in UI. La logica backend resta invariata (il fallback widened
  rimane attivo per evitare griglie vuote, ma silenziosamente). Versione
  applicativa invariata `2.1.0`.
- **Streaming – badge "giorni mancanti" su ciascuna nuova uscita**
  (`src/components/streaming/ReleaseCountdownBadge.tsx`): accanto al titolo
  di ogni card del tab `/streaming?tab=releases` viene mostrato un badge
  compatto che indica la distanza in giorni di calendario tra `releaseDate`
  e oggi (fuso `Europe/Rome`). Stati: "Oggi" / "Domani" (accento gold),
  "Tra N giorni" (outline neutro), "Già uscito" (muted, utile quando scatta
  il fallback `widenedWindow`). Calcolo affidato alla nuova utility
  `daysUntilRome` in `src/lib/dateUtils.ts` che confronta le date come
  `YYYY-MM-DD` in timezone italiano via `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })`,
  evitando drift DST. Layout card invariato (badge in `flex-wrap` accanto al
  titolo). Versione applicativa invariata `2.1.0`.
- **Countdown live** al prossimo evento sportivo dentro ogni `EventCard`:
  nuovo componente `src/components/common/EventCountdown.tsx` (tick `1s` via
  `setInterval`) che mostra giorni / ore / minuti / secondi residui rispetto
  a `startDate` (ISO). Per eventi entro una finestra di ±3 ore dall'inizio
  mostra un badge "Inizio imminente" con pallino rosso pulsante. Integrato in
  `EventCard` tramite la nuova prop `startDate?: string` e applicato a tutte
  le pagine: Home (`Index.tsx`), Sinner, Juventus (card custom partite, con
  `EventCountdown` impostato direttamente nella colonna risultato), F1 e
  MotoGP. Quando lo `status` e' `completato` il countdown non viene
  renderizzato.
- **Highlight "Prossimo" assoluto in Home**: la prima card di "Prossimi
  Eventi" (lista gia' ordinata cronologicamente in `Index.tsx`) riceve
  `highlight={true}`, che attiva bordo gold pieno + ring + badge gradient
  "Prossimo" sopra la card. Le altre card mantengono il bordo gold tenue.
- **Restyling premium delle card eventi** (`EventCard.tsx`): bordo
  `border-[hsl(var(--gold))]/20` con hover `/55`, top accent line gold a
  gradiente, glow radiale gold soft on-hover, hover lift `y: -4` con shadow
  `-18px hsl(var(--gold)/0.45)`, badge "Prossimo" con gradiente
  `gold-dark -> gold -> gold-light`. Stesso trattamento applicato alle card
  custom partite di `JuventusPage.tsx` per coerenza visiva (hover lift `y:
-3`, shadow gold, top line, glow radiale, badge gradient).
- **Glow pulsante gold** sull'icona della voce di navigazione attiva
  (`Header.tsx`), sincronizzato con il loop di scintille (`SparkleLoop`).
- **Icona PWA dedicata** (`public/favicon.png`, 1024x1024 PNG): nuova
  icona quadrata coerente con il brand "Calendar Events" (calendario
  gold su sfondo navy `#0B1A33`, monogramma "CE"), usata sia come
  favicon (`<link rel="icon">` e `apple-touch-icon` in `index.html`) sia
  come icona PWA installabile (`public/manifest.webmanifest`, entries
  `purpose: any` e `purpose: maskable`). Sostituisce il riferimento
  precedente a un `favicon.png` non presente nel repository, eliminando
  l'icona generica del browser su Add-to-Home-Screen iOS/Android.

### Fixed

- **Streaming – Nuove uscite validate per l'Italia**: la edge function
  `streaming-releases` ora applica due livelli di filtro per garantire che
  ogni titolo mostrato sia effettivamente disponibile in abbonamento sul
  provider richiesto in regione IT. (1) TMDB Discover viene chiamato con
  `with_watch_monetization_types=flatrate`, escludendo titoli disponibili
  solo a noleggio/acquisto/ads sullo stesso provider (es. titoli del Prime
  Video Store che apparivano come "novita' Prime"). (2) Per ogni candidato
  viene chiamato `/{type}/{id}/watch/providers` (regione IT) e tenuto solo
  se `results.IT.flatrate` contiene il `provider_id` richiesto, garantendo
  disponibilita' corrente e non solo storica. Stesso filtro applicato anche
  al fallback con finestra estesa. UI: nuova nota informativa sotto il
  selettore range nel tab "Nuove uscite". Versione applicativa invariata
  `2.1.0` (bugfix di correttezza dati). Nessun nuovo segreto, nessuna
  nuova dipendenza.
- **Streaming – default famiglia TV su RAI**: atterrando su `/streaming`
  senza query string, il tab "TV stasera" ora seleziona di default la
  famiglia **RAI** invece di Sky Sport (fonte palinsesto piu' coperta in
  prima serata). Il fallback `initialFamily` in `src/pages/StreamingPage.tsx`
  passa da `"sky-sport"` a `"rai"`. La logica di sync URL state e l'ordine
  delle famiglie restano invariati: `?family=sky-sport` (o altra famiglia
  valida) continua a prevalere.
- **"Nuove uscite" sempre vuote**: la sezione `/streaming?tab=releases`
  mostrava `EmptyState` anche per provider attivi (Netflix, Prime, HBO Max)
  perche' i range UI di default ("Oggi", "Prossimi 3 giorni", "Prossimi 7
  giorni") erano troppo stretti rispetto al modo in cui TMDB indicizza i
  cataloghi streaming. TMDB Discover filtra per `primary_release_date` (film)
  / `first_air_date` (serie), non per data di ingresso sulla piattaforma in
  Italia, quindi finestre da 1-7 giorni restituiscono spesso 0 risultati anche
  con `TMDB_API_KEY` configurata e provider corretto. Tre interventi
  conservativi:
  1. **`src/pages/StreamingPage.tsx`**: sostituiti i tre range con finestre
     piu' realistiche — `7d` (Prossimi 7 giorni), `30d` (Prossimi 30 giorni,
     **nuovo default**), `90d` (Finestra estesa: -30 / +60 giorni).
  2. **`supabase/functions/streaming-releases/index.ts`**: aggiunto fallback
     trasparente lato backend. Quando la finestra richiesta restituisce 0
     items, l'edge function ritenta automaticamente con
     `dateFrom -= 14 giorni` e `dateTo += 30 giorni`, mantenendo provider e
     `watch_region=IT` invariati. Il payload espone `widenedWindow: boolean`
     e i campi `effectiveFrom` / `effectiveTo` per tracciabilita'. Cache
     invariata (1h, chiave per `provider:dateFrom:dateTo`).
  3. **EmptyState informativo**: messaggio aggiornato che spiega la natura
     del filtro TMDB + bottone "Allarga finestra" che imposta `range = "90d"`
     quando la finestra corrente e' vuota; quando il fallback widened scatta,
     un hint italic informa che si sta mostrando una finestra estesa.
     Verifica: curl edge function con Netflix range 7d → ritorna ≥10 items
     (widenedWindow=true), HBO Max range 30d → ritorna 3 items
     (widenedWindow=true). Versione applicativa invariata `2.1.0` (bugfix).
     Nessun cambio di provider TMDB, secret, scraping o dipendenze.

- **Leggibilita' "Stasera in TV" su mobile**
  (`src/components/home/TonightTvList.tsx`): le righe della tabella
  collassavano ora, badge canale, titolo lungo, badge genere e durata
  sulla stessa riga, rendendo i titoli (es. "Roberta Valente Notaio in
  Sorrento - Stagione 1 Episodio 3 - Cuba Libre") difficili da leggere
  su viewport stretti (≤640px). Introdotto layout responsive a 2 righe
  esclusivo del breakpoint mobile (`sm:hidden`): riga 1 con ora + badge
  canale + durata (allineata a destra via `ml-auto`), riga 2 con titolo
  full-width + badge genere. Layout desktop (`hidden sm:flex`)
  invariato. Nessuna modifica alla logica di filtraggio, ordinamento
  prima serata, paginazione o ai dati sottostanti.
- **Regressione di leggibilita' nelle card** (`EventCard.tsx`): rimosso
  `overflow-hidden` dal container (clippava badge "Prossimo" sporgente,
  countdown e contenuto wrappato) e aggiunto `relative z-[1]` ai contenitori
  figli (header, titolo, sottotitolo, riga date/time, children) in modo che
  il testo resti sempre sopra il glow radiale di hover. La riga date/time ha
  `flex-wrap` + `whitespace-nowrap` sui singoli token per evitare break
  innaturali. Verificato su Home, Sinner, F1, MotoGP, desktop 1366x768 e
  mobile 375x812.
- **Regressione di leggibilita' nelle card partite Juventus**
  (`JuventusPage.tsx`): rimosso `overflow-hidden` dalla card custom, aggiunto
  `relative z-[1]` ai blocchi competizione/data/broadcaster e al blocco
  risultato/countdown, glow radiale spostato a `inset-0`. Layout broadcaster
  passato a `flex-wrap` per evitare clipping di "DAZN | SKY".

### Verified

- Verifica anti-regressione manuale via browser tool su tutte le pagine
  sport (Home, Sinner, Juventus, F1, MotoGP) sia in viewport desktop
  (`1366x768`) sia mobile (`375x812`): countdown vivi, badge "Prossimo"
  visibile sulla prima card della Home e sulla prima card eligible delle
  pagine sport, nessun overflow o testo coperto da effetti di sfondo, card
  finite (Juventus `FullTime`, Sinner `completato`) non mostrano countdown
  come da logica.

## [2.1.0] - 2026-04-19 (rebrand "Calendar Events")

> **Nota**: release minor che marca il cambio identita' di prodotto da
> **"Calendar Sports"** a **"Calendar Events"** sopra la baseline
> `2.0.2`. Le voci storiche `2.0.0`, `2.0.1`, `2.0.2` restano archiviate
> piu' sotto come riferimento storico e non vengono riscritte.
> piu' sotto come riferimento storico e non vengono riscritte.

### Added

- **Rebrand applicazione**: nome prodotto cambiato da "Calendar Sports"
  a **"Calendar Events"**. Header con icona `CalendarDays` (Lucide) al
  posto di `Trophy`, logo testuale "Calendar Events" con accento gold
  sulla prima parola, footer semplificato a `CALENDAR EVENTS · v2.1.0`.
- Nuovo file `src/lib/version.ts` come unica fonte di verita' per
  `APP_VERSION` e `APP_NAME`, importato dal footer in
  `src/components/layout/Layout.tsx`.
- Sezione **Streaming** completa (`/streaming`) come prima voce di
  navigazione dopo Home, con due tab:
  - **TV stasera**: selettore famiglia canali (Sky Sport, Sky Cinema,
    RAI, Mediaset, Discovery), accordion per canale, paginazione (6
    canali per pagina), filtro server-side prime time 19:00-24:00
    Europe/Rome, stato sincronizzato in URL
    (`?tab=tv&family=rai&page=2`).
  - **Nuove uscite**: selettore provider (Netflix, Prime Video, Disney+,
    HBO Max), griglia poster TMDB con paginazione (8 per pagina), filtro
    pill **Tutti / Film / Serie**, selettore data **Oggi / 3 giorni / 7
    giorni**, dialog di dettaglio con overview, voto, cast top 6, link
    al provider e a TMDB.
- Edge function `streaming-tv` con scraping reale di
  `www.staseraintv.com` esteso a tutte le famiglie supportate dalla
  fonte: **RAI** (12 canali), **Mediaset** (13 canali), **Sky Cinema**
  (5 canali), **Discovery** (Real Time, DMax, Nove, Discovery
  Channel/Turbo, Food Network, HGTV, Giallo, K2, Frisbee). Cache
  in-memory 1h per `(slug, date)`, concorrenza limitata a 5 fetch
  paralleli.
- Edge function `streaming-releases` su TMDB `/discover` con range
  `dateFrom`/`dateTo` (default oggi..oggi+7), action `credits`
  (`type`+`id`) per cast top 10, cache in-memory 1h (24h per credits).
- Componente dedicato `src/components/home/TonightTvList.tsx` estratto
  da `Index.tsx` per ridurre complessita' e isolare la scheda
  "Stasera in TV".
- Quadro reale **Stasera in TV** in Home con aggregazione
  multi-famiglia (5 query parallele) e filtri rapidi user-friendly
  (chip selezionabili `Tutti / RAI / Mediaset / Sky Sport / Sky Cinema
/ Discovery`), un programma per canale nella fascia di prima serata
  (21:00 - 22:30), paginazione interna (8 canali per pagina), label
  famiglia e separatori oro tra gruppi su mobile, con icone Lucide
  (`Radio`, `Tv`, `Trophy`, `Film`, `Compass`).
- Badge **genere** + **durata** programma (`45 min` / `1h 25 min`) in
  ogni riga di "Stasera in TV", con utility `formatDuration` in
  `src/lib/dateUtils.ts` e test unitari Vitest sui casi limite (0,
  NaN, 1h esatta).
- **Sportitalia** aggiunto alla famiglia "Sport" in modo che il filtro
  mostri sempre almeno un palinsesto reale; whitelist generi estesa
  (`Telefilm`, `Serie`, `Soap Opera`, `Soap`, `Magazine`,
  `Approfondimento`, `Inchiesta`, `Meteo`, `Game Show`, `Religione`,
  `Educativo`, `Cultura`, `Viaggi`, `Ciclismo`).
- Test E2E Playwright per la presenza dei separatori oro e delle
  etichette famiglia mobile nella scheda "Stasera in TV", con mock
  `streaming-tv` in `e2e/support/mockSportsApi.ts`.
- Suite GitHub **Copilot repo-local** (instructions + prompts +
  `.vscode/extensions.json`) e configurazione **Dependabot** per `npm`
  e `github-actions` con PR verso `develop`, assegnazione a
  `@matteobern9244`, grouping conservativo e cooldown 30 giorni sui
  major.
- Workflow guardrail per disabilitare `auto-merge` sulle PR Dependabot
  quando GitHub Copilot lascia una review non `APPROVED`.

### Changed

- Footer applicazione: ora mostra solo `CALENDAR EVENTS · v{APP_VERSION}`
  centrato, in `font-heading tracking-wider uppercase`.
- `package.json`: `"version"` aggiornato a `"2.1.0"` come release di
  rebrand sopra la baseline `2.0.2`.
- `index.html`: aggiornati `<title>`, `<meta name="description">`,
  `<meta name="author">`, `og:title`, `twitter:title`, `og:description`,
  `twitter:description` con la nuova identita' "Calendar Events".
- README e AGENTS.md aggiornati con nuovo nome prodotto e nuova baseline.
- Configurazione GitHub di `main` riallineata al modello finale: una sola
  Ruleset moderna repository-level, bypass riservato a `lovable-dev`,
  nessuna Branch protection classica in parallelo. Workflow GitHub
  Actions riallineati al flusso `feature -> develop -> main` con CI su
  push solo per `develop` e CI su PR per `develop` e `main`.
- Aggiornate le action GitHub a major stabili
  (`actions/checkout@v6`, `actions/setup-node@v6`,
  `actions/upload-artifact@v7`).

### Fixed

- **Copertura palinsesti famiglia "Sport"**: prima la famiglia Sky Sport
  ritornava esclusivamente canali con `programs=[]`. Audit completo
  2026-04-19 di TUTTI i 41 slug attivi: ognuno ritorna >=12 righe
  `HH:MM` reali da `staseraintv.com`. Sportitalia aggiunto come canale
  Sport coperto (~21 righe/giorno). I canali Sky Sport branded restano
  dichiaratamente non coperti (verificato: tutti gli slug
  `sky_sport_*` su `staseraintv.com` ritornano 404; fonti alternative
  `guidatv.sky.it` e `programmi.sky.it` sono client-side rendered;
  `tvzap.kataweb.it` e' protetto da Cloudflare). Nessun dato inventato:
  la UI continua a dichiarare onestamente "Palinsesto non disponibile".
- Edge function `streaming-tv`: estrazione genere resa piu' robusta con
  fallback diretto sulla riga grezza `HH:MM - TITOLO (GENERE)` quando
  il rich block descrittivo non contiene parentesi finale.
- (Riportato dalla 2.0.2) Bundle di produzione: env injection
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` non sempre
  iniettata. Mitigato dal wrapper `src/lib/supabaseClient.ts` con
  fallback hardcoded sui valori pubblici.

### Note operative

- Il rebrand e' puramente cosmetico lato UI/metadati/docs: nessun
  impatto su routing, fonti dati, edge functions, secrets, branch
  policy o sync Lovable <-> GitHub.
- Bump versione `2.0.2 -> 2.1.0` come release minor di rebrand. Le
  release storiche restano archiviate sotto.
- `npm run lint`, `npm run test` e `npm run build` da eseguire come
  verifica finale. Il drift preesistente tra `package.json` e
  `package-lock.json` puo' ancora far fallire `npm ci` finche' il
  lockfile non viene rigenerato (fuori scope di questa change set).

## [2.0.2] - 2026-04-19

### Fixed

- **Bundle di produzione: dati non caricati su dominio pubblicato.** In alcune
  build di produzione `import.meta.env.VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_KEY` non venivano iniettate nel bundle. Le
  richieste partivano verso `https://<host>/undefined/functions/v1/...`,
  Lovable rispondeva con il fallback HTML SPA (200 OK ma non JSON), React
  Query restava in loading infinito. Diagnosi tramite ispezione network del
  sito live (`https://calendarsports.lovable.app`).

### Added

- `src/lib/supabaseClient.ts`: wrapper sicuro del client Supabase JS SDK con
  fallback hardcoded sui valori pubblici (project URL + anon key) usati
  quando le env var Vite non sono iniettate nel bundle. Esporta anche
  `SUPABASE_PROJECT_URL` e `SUPABASE_ANON_KEY` per chiamate `fetch` manuali
  alle edge functions.
- `src/components/common/ErrorBoundary.tsx`: ErrorBoundary globale wrappato
  attorno all'app in `src/App.tsx`. Mostra titolo, messaggio leggibile,
  dettagli tecnici collassabili e pulsante "Ricarica pagina" invece di una
  pagina bianca o di uno spinner infinito su errori di render.
- Regola ESLint `no-restricted-imports` in `eslint.config.js` che blocca
  import diretti da `@/integrations/supabase/client` e suggerisce
  `@/lib/supabaseClient`. Eccezioni configurate per il wrapper stesso e per
  il file auto-generato.
- Hook **pre-commit** locale via `husky` + `lint-staged` (`.husky/pre-commit`,
  blocco `lint-staged` in `package.json`): esegue `eslint --max-warnings=0`
  sui file `.ts`/`.tsx` in stage. Si attiva automaticamente al primo
  `npm install` grazie allo script `prepare`.

### Changed

- `src/lib/api/sportsApi.ts`: ora importa `SUPABASE_PROJECT_URL` e
  `SUPABASE_ANON_KEY` dal wrapper sicuro invece di leggere direttamente
  `import.meta.env`. Comportamento invariato in preview, fix in produzione.
- `AGENTS.md`: aggiunta sezione "Import del client Supabase" con regola,
  motivazione e esempio OK/da evitare. Aggiunta voce per
  `src/lib/supabaseClient.ts` nella mappa funzionale.
- `README.md`: aggiunta sottosezione "Import del client Supabase nel
  frontend" dentro "Supabase e funzioni edge".

### Note operative

- I valori hardcoded nel wrapper sono **pubblici** (project URL + anon key,
  gli stessi gia' esposti nel client auto-generato e nel bundle): non
  introducono rischi di sicurezza.
- La regola ESLint e' `error`, quindi una violazione fa fallire `npm run
lint` sia in locale sia in CI (`.github/workflows/ci-pr-main.yml` esegue
  gia' `npm run lint` su ogni PR verso `main`).
- Il file auto-generato `src/integrations/supabase/client.ts` resta
  intatto e read-only.
- Nessuna modifica a workflow Git, branch policy, secrets, edge functions
  o `supabase/config.toml`.

## [2.0.1] - 2026-04-19

### Added

- Aggiunta una suite GitHub Copilot repository-local composta da:
  - `.github/copilot-instructions.md`
  - file path-specific in `.github/instructions/`
  - prompt riusabili in `.github/prompts/`
  - configurazione minima workspace in `.vscode/`

### Changed

- Aggiornato `README.md` con una sezione dedicata all'uso di GitHub Copilot nel
  repository e alla gerarchia tra `AGENTS.md`, istruzioni Copilot e prompt
  riusabili.
- Aggiornata la versione applicativa del repository a `2.0.1`.

### Note operative

- La suite Copilot deriva da `AGENTS.md` e non sostituisce le policy operative
  del repository.
- I prompt files restano un supporto operativo per IDE compatibili e non una
  garanzia di enforcement.

## [2.0.0] - 2026-04-19

### Added

- Aggiunti workflow GitHub Actions per:
  - validazione su `develop`
  - validazione delle pull request verso `main`
  - blocco delle PR verso `main` se il branch sorgente non e' `develop`
- Aggiunto `.github/CODEOWNERS` per formalizzare la ownership del repository.
- Aggiunti test end-to-end Playwright con fixture e mocking delle Edge Functions
  Supabase, in modo da verificare router, rendering e stati UI senza dipendere
  dai provider esterni live.
- Aggiunto un test Vitest per la pagina Sinner sui casi di loading ed errore.
- Aggiunto supporto npm esplicito per `test:e2e` e `test:e2e:headed`.

### Changed

- Rafforzata la documentazione del repository in `README.md`, con descrizione
  reale di stack, fonti dati, workflow GitHub <-> Lovable, branch sensibile
  `main` e limiti del progetto.
- Formalizzata la baseline documentale della release repository `2.0.0`.
- Aggiornata la configurazione Playwright per eseguire i test E2E contro una
  preview locale con variabili ambiente controllate e retry disabilitati nelle
  query solo per il contesto E2E.
- Allineati `package-lock.json` e script di progetto per permettere esecuzioni
  ripetibili di `npm ci`, `lint`, `test`, `build` ed E2E.
- Aggiornata la configurazione ESLint per ridurre falsi blocchi sul codice
  esistente e portare la baseline locale a uno stato compatibile con CI.
- Aggiornata la versione applicativa del repository a `2.0.0`.

### Fixed

- Corretti piccoli problemi tecnici necessari a stabilizzare i controlli locali
  e CI:
  - costanza `prefer-const` nella funzione edge F1
  - tipi vuoti in componenti UI
  - gestione piu' esplicita del fallback su `localStorage`
  - import Tailwind compatibile con le regole TypeScript/ESLint
- Configurato `QueryClient` con retry disattivabile via env nel contesto di
  test, per rendere i check UI deterministici senza alterare il comportamento
  ordinario di produzione.

### Security

- Hardening del repository GitHub sul branch `main`, coerente con il fatto che
  `main` va trattato come branch sensibile rispetto al workflow GitHub <->
  Lovable:
  - merge previsto solo via pull request
  - flusso previsto `develop` -> `main`
  - required checks per quality, E2E e guard del source branch
  - linear history e blocco di force-push/deletion
- Abilitati strumenti GitHub di sicurezza a livello repository:
  - secret scanning
  - push protection
  - Dependabot security updates

### Note operative

- Le modifiche E2E non qualificano le fonti dati runtime come stabili: il
  mocking e' stato introdotto proprio per evitare falsi positivi dovuti a
  scraping, fallback statici e provider terzi.
- Le modifiche di hardening GitHub sono pensate per ridurre il rischio operativo
  su `main`, ma non implicano deploy automatici o sincronizzazioni Lovable
  verificate.

## 2026-04-17 - Fixed CORS and rate limiting

### Fixed 2026-04-17

- Introdotto un helper condiviso di sicurezza per le Edge Functions Supabase.
- Corrette le intestazioni CORS e la gestione del rate limiting nelle funzioni
  sportive.

### Security 2026-04-17

- Centralizzata la logica di protezione in
  `supabase/functions/_shared/security.ts`.
- La modifica impatta piu' funzioni edge e riguarda il perimetro backend leggero
  distribuito, non il deploy o il workflow GitHub/Lovable.

## 2026-04-16 - Aggiunta UCL, Coppa Italia, foto

### Added 2026-04-16 UCL Coppa Italia foto

- Estesa la sezione Juventus con dati aggiuntivi per Champions League e Coppa
  Italia.
- Aggiunti asset/mapping per foto e contenuti visivi nelle sezioni sportive
  coinvolte.

### Changed 2026-04-16 UCL Coppa Italia foto

- Aggiornate pagine frontend e funzioni edge di Formula 1, Juventus e MotoGP per
  supportare dati e presentazione piu' ricchi.

### Note operative 2026-04-16 UCL Coppa Italia foto

- Questa voce tocca fonti dati fragili: nella sezione calcio il repository usa
  scraping Sky Sport e integrazione Lega Serie A; in altre sezioni esistono
  mapping statici e fallback visivi.
- La voce descrive solo il perimetro verificabile dal commit e dal `git show`,
  senza inferire comportamento live oltre il codice modificato.

## 2026-04-16 - Added broadcaster to Home

### Added 2026-04-16 broadcaster Home

- Esposizione del broadcaster nella Home aggregata per gli eventi Juventus.

### Changed 2026-04-16 broadcaster Home

- Aggiornato il flusso dati tra funzione edge calcio e Home per visualizzare
  l'informazione del broadcaster.

### Note operative 2026-04-16 broadcaster Home

- L'informazione broadcaster dipende dalla sezione calcio, che nel repository
  usa dati ibridi tra scraping e API Lega Serie A.

## Storico precedente non normalizzato

Parte della cronologia Git precedente contiene commit con messaggi come
`Changes` o `Work in progress`, non sufficientemente descrittivi per una
conversione affidabile in changelog.

Per coerenza con `AGENTS.md`, queste revisioni non vengono trasformate qui in
voci specifiche senza supporto diretto da diff o contesto verificabile.
