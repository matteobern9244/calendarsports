# Prompt — quello che resta da fare su `calendarsports`

> Questo file **è un prompt**, non un diario. Incollalo come primo messaggio in
> una sessione nuova, oppure aprilo e digli da quale punto partire. Descrive
> tutto ciò che al **5 settembre 2026, sera** non è ancora fatto, in ordine di
> importanza, e contiene le trappole già pagate: leggerle costa cinque minuti,
> riscoprirle è costato ore.
>
> **Quasi tutto ciò che si poteva fare da qui è stato fatto.** Il confine
> streaming, i font ospitati nel progetto, il bottone «+N altri» del calendario
> e la retention di `push_sent_log` sono chiusi e stanno nei commit su
> `develop`, da `9b677d0` a `864f0d4`. Quello che resta ha una caratteristica
> in comune, ed è la ragione per cui è rimasto: **richiede accesso al progetto
> Supabase**, dashboard o database. Se non ce l'hai, il punto 5 è l'unico che
> puoi davvero muovere, e non è codice.

---

## Prima di toccare qualsiasi cosa

Leggi [`AGENTS.md`](AGENTS.md): è il contratto, e la sua tabella «Come scegliere
la guida» dice quale playbook è obbligatorio per l'area toccata. Per il lavoro
su database, edge function e segreti servono
[`docs/agent-playbook/data-sources-and-time.md`](docs/agent-playbook/data-sources-and-time.md)
e [`docs/SECURITY.md`](docs/SECURITY.md).

Regole che questo lavoro tocca da vicino:

- **TDD.** Il test si scrive prima e si guarda fallire.
- **Non fare commit, push, merge o PR se non ti viene chiesto.** Se te lo
  chiedono: solo l'identità Git già configurata, nessun `--author`, nessun
  trailer, nessuna firma dell'agente. Il formato è in
  `.claude/commands/commit.md`.
- **Mai lavorare su `main`**, che è sincronizzato con Lovable.
- **Non avviare Playwright senza autorizzazione esplicita.** Né
  `bun run test:e2e`, né `bunx playwright test`, né i tool MCP del browser. Se
  la verifica e2e serve, chiedila; se non è stata eseguita, dillo nel resoconto
  invece di lasciarlo intendere. Le sessioni appese si chiudono con
  `pkill -f "ms-playwright-mcp"`, `pkill -f "playwright-mcp"` e
  `pkill -f "@playwright/test/cli.js test-server"`.
- **Zero avvisi.** Se il lavoro ne produce, sistemarli fa parte del lavoro.

Il gate è `bun run verify` (typecheck, lint a zero warning, italiano, fuso,
test, build), più `bun run test:e2e` per la navigazione se te l'hanno
autorizzato.

**Prima di cominciare, dichiara che accesso hai.** I punti da 1 a 4 non si
possono né fare né verificare senza il progetto Supabase, e non c'è modo di
scoprirlo strada facendo: `supabase` CLI, `psql`, `postgres` e `docker` non
sono installati su questa macchina. Se non hai accesso, dillo e passa al punto
5, invece di produrre migration che nessuno può applicare.

---

## 1. Applicare la migration di retention di `push_sent_log`

`supabase/migrations/20260905184700_push_sent_log_retention.sql` **è scritta e
non è mai stata eseguita.** È il lavoro più piccolo di questa lista e l'unico
già pronto: serve solo qualcuno che possa applicarla e rileggere lo stato dopo.

Cosa fa: una cancellazione immediata oltre i trenta giorni, più un job
`pg_cron` giornaliero alle 03:17 UTC che la ripete. Non crea funzioni — il
`DELETE` sta nel corpo del job, e il perché è al punto 4.

Le query di controllo sono in fondo al file. La più importante è la seconda:
subito dopo l'applicazione, `da_cancellare` deve essere `0`. Se non lo è, il
`DELETE` non ha fatto quello che dice.

**Costo**: minuti, se hai accesso. Impossibile, se non ce l'hai.

---

## 2. Rotazione di `DISPATCH_SECRET` — bloccante, e non è codice

`DISPATCH_SECRET` è scritto in chiaro nella migration
`supabase/migrations/20260523084606_*.sql`, quindi è nella storia di Git e su
GitHub. È l'**unica** autenticazione di `push-dispatcher`: chi legge il
repository può far partire notifiche a tutti gli iscritti.

Riscrivere la storia di `main` non è praticabile con la sincronizzazione
Lovable attiva. **È la rotazione a neutralizzare il valore esposto, non la
cancellazione.**

Il prerequisito è già applicato (`20260831193100`): il segreto è nel Vault e il
job lo rilegge a ogni giro, quindi ruotarlo non richiede più di ricreare il
job. La procedura in quattro passi è in fondo a quella migration:

1. generare un valore nuovo;
2. `vault.update_secret(...)`;
3. incollare lo stesso valore in Project Settings → Edge Functions → Secrets e
   ridistribuire `push-dispatcher`;
4. verificare i tre giri successivi in `cron.job_run_details`.

**Fra il passo 2 e il passo 3 il dispatcher risponde 401 e non parte nessuna
notifica.** È il verso giusto in cui fallire, ma va fatto quando qualcuno sta
guardando.

Un agente può preparare i comandi, verificare l'esito, aggiornare
`docs/SECURITY.md` e il changelog. **Non** può fare i passi in dashboard. Se
non hai accesso, dillo e fermati qui invece di simulare progresso.

---

## 3. Il dispatcher: verificare il timeout, poi ridurre il lavoro

Misurato il 31 agosto 2026 su `net._http_response`: **65 giri su 72 finivano in
timeout**, e `cron.job_run_details` segnava `succeeded` perché l'SQL era andato
— era la richiesta HTTP a essere stata mollata. Il job è stato ricreato con
`timeout_milliseconds := 120000`.

Restano due cose, in quest'ordine.

**Verificare** che il dispatcher rientri davvero nella finestra. Si guarda
`net._http_response` **e** `cron.job_run_details` sullo stesso intervallo: la
prima dice se la risposta è arrivata, il secondo dice solo se l'SQL è partito.

**Ridurre il lavoro.** `supabase/functions/push-dispatcher/index.ts:150`
impagina il calendario Juventus fino a `Math.min(total, 30)` pagine a ogni
giro, ogni cinque minuti, per una funzione che poi non manda quasi mai niente.
Misura prima di scegliere: senza il numero, qualunque riduzione è un'ipotesi.

**Costo**: basso per la misura, medio per la riduzione. Entrambi richiedono
accesso al database.

---

## 4. Sorveglianza di `pg_net` — non si corregge, si guarda

La revoca **non è applicabile** e ora si sa perché: le funzioni appartengono a
`supabase_admin`, le migration girano come `postgres`, e in PostgreSQL un
`REVOKE` da chi non è owner emette un warning e prosegue. La revoca corretta —
da `PUBLIC` — fermerebbe le notifiche, perché nella stessa ACL non compare
`postgres`, che è il ruolo del job cron.

`supabase/migrations/20260831193000_revoke_pg_net_from_client_roles.sql` è
stata svuotata e lasciata come nota. **Non riscriverla.**

Restano due condizioni da ricontrollare ogni volta che si tocca il database:

- **`public` non deve acquisire funzioni `SECURITY DEFINER`.** Sarebbe il
  trampolino che oggi manca per arrivare a `pg_net`. È anche il motivo per cui
  la migration di retention non crea funzioni.
- **Gli schemi esposti devono restare `public` e `graphql_public`.**

La metà verificabile senza database è già stata fatta il 5 settembre 2026:
`grep -rniE "security definer" supabase/migrations/` trova solo il commento
esplicativo dentro la migration svuotata. Nessuna migration crea funzioni
`SECURITY DEFINER` in `public`. **La verifica sullo stato reale del database
resta da fare.**

---

## 5. `StreamingPage`, l'ultimo dei componenti giganti — e il criterio dice di fermarsi

588 righe, dieci stati locali, quattro tabelle di rendering. La
serializzazione dei filtri è già fuori (`src/lib/streamingFilters.ts`, con i
test di andata e ritorno) e la rete c'è: una e2e sul deep-link, che è la parte
capace di rompersi in silenzio.

Quello che resta dentro è **JSX leggibile**. Tagliarlo non farebbe guadagnare
niente in verificabilità, ed è il criterio con cui è stato fatto tutto il resto
di questo lavoro. **Non toccarla per il numero di righe.** Se un giorno serve,
serve per una ragione migliore di quella.

---

## Trappole già pagate — leggile, non riscoprirle

### Verifica e strumenti

- **`comando | tail` nasconde il codice di uscita.** In una pipeline lo stato
  è quello dell'ultimo comando. `bun run test:e2e 2>&1 | tail -30` ha
  restituito `exit 0` mentre un test falliva, e la riga «1 failed» era appena
  sopra la finestra di `tail`. **Leggi il conteggio finale, non fidarti del
  codice di uscita di una pipeline.**
- **`cron.job_run_details` mente per omissione.** Dice `succeeded` quando l'SQL
  è andato, anche se la richiesta HTTP è stata mollata. Per il dispatcher la
  verità è in `net._http_response`.
- **Una migration può essere applicata e non aver fatto niente.** Un `REVOKE` da
  chi non è owner emette un warning e prosegue. È il modo peggiore in cui una
  migration sbaglia. Rileggi lo stato dopo averla applicata, sempre.
- **Il tool MCP del browser può essere bloccato dal classificatore anche quando
  l'utente ti ha autorizzato.** Playwright chiamato direttamente da uno script
  funziona: importa `chromium` da `@playwright/test`, ma **il file dev'essere
  dentro il progetto**, altrimenti Node non risolve il pacchetto. Scrivilo,
  eseguilo, cancellalo.

### Il rischio visivo

- **Le e2e non coprono il rischio visivo.** Se tocchi lo stile va guardato a
  schermo, in tema chiaro e scuro (`localStorage['cse-theme']`, valori `dark` e
  `light`; il default è `dark`). Se **non** lo tocchi, dimostralo invece di
  affermarlo: confronta l'insieme dei `className` prima e dopo. Attenzione al
  punto cieco — quel confronto non vede ordine e annidamento, e non vede le
  classi che diventano una costante o una prop invece di restare un
  `className=` letterale.
- **Uno screenshot di un dialogo Radix appena aperto sembra semitrasparente.**
  È l'animazione di entrata (`fade-in-0 zoom-in-95`), non un difetto di stile.
  Aspetta un secondo, o leggi `getComputedStyle` invece di fidarti dell'occhio.

### Tempo, fuso, formatter

- **`new Date(stringa)` è vietato**, `new Date(Date.UTC(...))` no. Un ISO senza
  `Z` vale UTC: usa `toRomeDate` da `@/lib/dateUtils`.
- **Costruire un `Intl.DateTimeFormat` costa circa settanta volte la sua
  `format`**, quindi va a livello di modulo. Il difetto è già ricomparso tre
  volte dopo essere stato corretto: controlla ogni formatter che sposti.
- **Il guardiano del fuso guarda solo le cartelle che gli sono state dette.**
  `TARGET_DIRS` in `scripts/check-rome-tz.mjs` è una lista a mano, e una
  cartella nuova nasce scoperta. Il meta-test in
  `src/test/tooling/tz-guard-coverage.test.ts` sorveglia la lista, ma la sua
  euristica cerca solo `new Date(` e `toLocale(Time|Date)String`.

### Il linter, i tipi, il refactor

- **Il linter vede solo il codice che riesce a leggere.** `MotoGPPage` chiamava
  `Date.now()` in render da mesi con `verify` verde: `react-hooks/purity` non
  entrava nell'IIFE finché stava in fondo a una catena `dati && dati.length > 0
&& (...)`. **Aspettati che succeda di nuovo**: il refactor non introduce quei
  difetti, li rende raggiungibili. Si correggono, non si zittiscono.
- **Uno schema al confine rende raggiungibili difetti che il compilatore non
  vedeva.** Sostituendo i cinque `declaredOnly` con zod reali sono usciti dieci
  errori di tipo: `!== null` che non escludeva `undefined`, `details!.directors`
  appoggiato a un tipo che prometteva più del payload. Sono correzioni di tipo
  senza effetto a runtime, ma vanno guardate una per una.
- **Deriva gli schemi dal codice delle edge function, non dalle interfacce del
  frontend.** Le interfacce scritte a mano erano già in ritardo su due punti, e
  uno schema ricavato da `ReleaseDetailsPayload` avrebbe **rifiutato una
  risposta legittima**: senza chiave TMDB, `details` risponde
  `{ type, id, configured: false }` e nient'altro.
- **Dopo una sostituzione massiva rilancia subito `tsc`.** Il codemod di
  Tailwind rinominò il _valore_ della prop `variant="outline"` in
  `"outline-solid"`: non lo videro né il lint né la build.
- **Su macOS il filesystem è case-insensitive.** Due moduli che differiscono
  solo per maiuscole collidono in locale e sono distinti su Linux in CI.
- **I `children` di un componente si valutano anche quando non vengono resi.**
  Se estrai qualcosa di costoso, la soluzione è una render prop.

### PWA, cache, asset

- **Il service worker precarica ciò che il _documento_ nomina.** `assetUrlsIn`
  legge `<script src>`, `<link href>` e ora anche `url(...)` dentro i fogli di
  stile già messi in cache. Se aggiungi un asset referenziato **solo** da un
  file annidato — un'immagine di sfondo in un CSS, un font — controlla che
  quella catena lo raggiunga, o offline sparisce dopo una sola visita.
- **La e2e PWA è la sentinella che se ne accorge.** Sorveglia i fallimenti
  sotto `/assets/` e chiede che i font siano _usabili_ offline, non solo
  arrivati (`document.fonts.load` poi `check`). Se la tocchi, non allentarla:
  ha già trovato un difetto vero.
- **Google Fonts serviva font variabili.** Le sessanta dichiarazioni
  `@font-face` del suo CSS puntavano a **dodici file soli**, uno per subset,
  riusato dai cinque pesi. Ospitarli non ha cambiato un byte del rendering. I
  quattro che restano (`latin` e `latin-ext` di Oswald e Inter) sono in
  `src/assets/fonts/`, dichiarati in `src/fonts.css`. `latin-ext` non è un di
  più: Vlahović, Kostić e Beşiktaş stanno lì.
- **`CACHE_VERSION` in `public/sw.js` va incrementata quando cambia una
  strategia**, altrimenti le cache vecchie sopravvivono all'`activate`.

### Test e calendario

- **Le fixture e2e vivono nel maggio 2099.** Una pagina che si apre sulla data
  corrente sarebbe vuota. La soluzione è
  `page.clock.setFixedTime(new Date("2099-05-05T10:00:00Z"))`, non aggiungere
  eventi con date relative a oggi: quelli cambierebbero anche ciò che vedono
  gli altri test.
- **La griglia di un mese mostra anche i giorni del mese accanto.** Un test che
  verifica «l'evento del 3 maggio non si vede in aprile» fallisce, e ha torto
  lui. Per la navigazione fra mesi usa un evento di fine mese.
- **Le due viste del calendario compongono il nome accessibile in modo
  diverso**: «Juventus: @ Inter» nella griglia, «Juventus @ Inter» in agenda.
- **Un dialogo Radix si monta in jsdom senza polyfill.** `src/test/setup.ts`
  contiene solo `matchMedia`, e basta: vedi
  `src/components/calendar/DayEventsDialog.test.tsx`.

---

## Dove va cosa

- `src/lib/` — logica pura, senza React. È il posto per tutto ciò che vuoi
  testare senza montare un componente. **È qui che sta il valore.**
- `src/components/common/` — componenti trasversali riusabili.
- `src/components/<dominio>/` — `streaming/`, `home/`, `sinner/`, `juventus/`,
  `calendar/`, `highlights/`.
- `src/components/ui/` — **generati dalla CLI shadcn, non si scrivono a mano.**
- Una pagina non importa da un'altra pagina. Se due pagine vogliono la stessa
  cosa, quella cosa scende in `common/` o in `lib/`.

Precedenti da imitare: `src/lib/streamingFilters.ts` (11 test, con la proprietà
di andata e ritorno), `src/lib/tonightTv.ts`, `src/lib/calendarGrid.ts`,
`src/lib/api/schemas.ts` (dove ogni confine ha il suo schema e non esiste più
un passa-tutto), `src/components/common/DataSection.tsx`.

---

## Stato di partenza, misurato il 5 settembre 2026 (sera)

```text
bun run verify   → exit 0
bun run test     → 355 test su 38 file
bun run test:e2e → 7 test, tutti verdi  (non lanciarlo senza autorizzazione)
```

| File                                    | Righe |
| --------------------------------------- | ----- |
| `src/components/home/TonightTvList.tsx` | 596   |
| `src/pages/StreamingPage.tsx`           | 588   |
| `src/pages/JuventusMatchPage.tsx`       | 426   |
| `src/pages/MotoGPPage.tsx`              | 396   |
| `src/pages/Formula1Page.tsx`            | 393   |
| `src/pages/CalendarPage.tsx`            | 388   |
| `src/pages/SinnerPage.tsx`              | 367   |

`JuventusMatchPage` non è mai stata nella lista dei componenti giganti e nessuno
l'ha guardata con quell'occhio: se un giorno serve, comincia chiedendoti cosa
lì dentro si romperebbe senza fare rumore, non quante righe ha.

Le sette e2e di `e2e/app.spec.ts`: navigazione fra tutte le sezioni, stato di
caricamento F1, separatore di Stasera in TV, dettaglio partita Juventus, PWA
offline (documento, asset **e font**), deep-link streaming, calendario in vista
mese e agenda.

---

## Quando hai finito

- `bun run verify` verde. Le e2e verdi **se ti è stato autorizzato lanciarle**;
  altrimenti scrivi che non sono state eseguite.
- `changelog.md` aggiornato sotto `[Unreleased]` per ogni cambiamento
  percepibile. Un refactor puro non lo è: se non cambia niente per chi usa
  l'app, dillo e non inventare una voce.
- `docs/ROADMAP.md`: la voce realizzata si sposta nel changelog e sparisce da
  lì. Prima di aggiungerne una, verifica sul codice che non sia già fatta.
- `docs/SECURITY.md` se hai toccato segreti, database o edge function.
- **Riscrivi questo file.** Se resta qualcosa, riscrivilo come prompt per la
  sessione dopo, con lo stesso taglio: cosa fare, cosa è già stato pagato, dove
  sono le trappole. Se non resta niente, cancellalo dal repository.

Nel resoconto finale indica i file modificati, le verifiche eseguite e il loro
esito, **i limiti della verifica**, i rischi residui e i follow-up. Distingui
azione tentata, azione riuscita e risultato verificato: non dichiarare «fatto»
senza aver guardato l'esito.
