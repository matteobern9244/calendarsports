# Prompt — quello che resta da fare su `calendarsports`

> Questo file **è un prompt**, non un diario. Incollalo come primo messaggio in
> una sessione nuova, oppure aprilo e digli da quale punto partire. Descrive
> tutto ciò che al **5 settembre 2026** non è ancora fatto, in ordine di
> importanza, e contiene le trappole già pagate: leggerle costa cinque minuti,
> riscoprirle è costato ore.
>
> Il refactoring dei componenti giganti, che occupava il vecchio `WIP.md`, è
> **chiuso**: `JuventusPage`, il guscio comune delle quattro pagine sportive,
> `CalendarPage` e la selezione di prima serata di `TonightTvList`. Il racconto
> sta nei commit su `develop`, dal `424db47` in poi. Non riaprirlo.

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
test, build). `bun run test:e2e` è il gate della navigazione, ma **si chiede
prima di lanciarlo**.

---

## 1. Rotazione di `DISPATCH_SECRET` — bloccante, e non è codice

È l'unico problema di sicurezza del progetto con impatto reale.
`DISPATCH_SECRET` è scritto in chiaro nella migration
`supabase/migrations/20260523084606_*.sql`, che è nella storia di Git e su
GitHub. È l'**unica** autenticazione di `push-dispatcher`: chi legge il
repository può mandare notifiche a tutti gli iscritti, ripetutamente, e far
generare a ogni invocazione una trentina di sotto-richieste verso
`sports-football`.

Riscrivere la storia di `main` non è praticabile con la sincronizzazione
Lovable attiva: **è la rotazione a neutralizzare il valore esposto**, non la
cancellazione.

Il prerequisito è già applicato (migration `20260831193100`, il segreto è nel
Vault e il job lo rilegge a ogni giro). Resta la rotazione vera, che **richiede
la dashboard Supabase** perché il secret della edge function non è raggiungibile
da SQL. La procedura in quattro passi è in fondo a quella migration:

1. generare un valore nuovo;
2. `vault.update_secret(...)` — il job lo prende al giro successivo, non va
   ricreato;
3. incollare lo stesso valore in Project Settings → Edge Functions → Secrets e
   ridistribuire `push-dispatcher`;
4. verificare i tre giri successivi in `cron.job_run_details`.

**Fra il passo 2 e il passo 3 il dispatcher risponde 401 e nessuna notifica
parte**: è il verso giusto in cui fallire, ma vuol dire che la finestra va
scelta, non subita.

**Cosa può fare un agente**: preparare i comandi, verificare l'esito, aggiornare
`docs/SECURITY.md` e il changelog. **Cosa non può fare**: i passi in dashboard.
Se non hai accesso, dillo e fermati qui invece di simulare progresso.

## 2. Il dispatcher: verificare il timeout, poi ridurre il lavoro

Misurato il 31 agosto 2026 su `net._http_response`: **65 giri su 72 finivano in
timeout**, e solo 7 leggevano una risposta. Il difetto era silenzioso perché
`cron.job_run_details` segnava `succeeded`: l'SQL era andato, era la richiesta
HTTP a essere stata mollata.

Il job è stato ricreato con `timeout_milliseconds := 120000`. **Restano due
cose, e la prima è solo misura**:

- **Verificare che il dispatcher rientri davvero nella finestra.** Si guarda
  `net._http_response` e `cron.job_run_details` sullo stesso intervallo, non
  solo il secondo: è stato il secondo, da solo, a nascondere il difetto per
  mesi.
- **Ridurre il lavoro.** `supabase/functions/push-dispatcher/index.ts:150`
  impagina il calendario Juventus fino a `Math.min(total, 30)` pagine, a ogni
  giro, ogni cinque minuti, per una funzione che poi non manda quasi mai
  niente. Le strade: chiedere solo le pagine che contengono partite entro la
  finestra di anticipo, o tenere in cache il calendario fra un giro e l'altro.
  Prima di scegliere, misura quanto costa oggi: senza il numero è
  un'ottimizzazione a sentimento.

**Costo**: basso per la misura, medio per la riduzione.

## 3. Sorveglianza di `pg_net` — non si corregge, si guarda

La revoca **non è applicabile** e sappiamo perché: le funzioni appartengono a
`supabase_admin`, le migration girano come `postgres`, e un `REVOKE` da chi non
è owner emette un warning e prosegue — applicato, sembra riuscito. La revoca
corretta, da `PUBLIC`, spegnerebbe le notifiche.

Oggi il privilegio c'è e **non ha una porta**: `net` non è esposto da PostgREST
e `public` non contiene funzioni da cui rimbalzare. Le due condizioni che lo
tengono innocuo sono verificabili da qui e vanno ricontrollate quando si tocca
il database:

- `public` non deve acquistare funzioni `SECURITY DEFINER`;
- gli schemi esposti devono restare `public` e `graphql_public`.

Il ragionamento completo è dentro
`supabase/migrations/20260831193000_revoke_pg_net_from_client_roles.sql`, che è
stata **svuotata e lasciata come nota** proprio perché nessuno riscriva la
stessa migration fra sei mesi. Non riscriverla.

## 4. Il confine streaming è dichiarato, ma non verificato

Da quando `callEdgeFunction` valida con gli schemi di
[`src/lib/api/schemas.ts`](src/lib/api/schemas.ts), le cinque azioni sportive
controllano davvero cosa ricevono. Le azioni di `streaming-tv` e
`streaming-releases` no: passano da `declaredOnly`, che tipizza e basta — dieci
occorrenze, ed è il debito residuo che un `grep declaredOnly` misura.

Serve: schemi ricavati da quello che le due edge function **producono davvero**
(TMDB per le uscite, palinsesti per la TV), non dalle interfacce scritte a mano,
che potrebbero già essere in ritardo sul codice. Il modo di scoprirlo è leggere
le funzioni in `supabase/functions/streaming-*`, non le `interface` del
frontend.

**Costo**: medio. **Perché conta**: `StreamingPage` è la pagina dove un campo
rinominato a monte non fa rumore.

## 5. I font si perdono, offline

`src/index.css:1` importa Oswald e Inter da `fonts.googleapis.com`. Il service
worker copre documento, `/assets/` e le risorse di root, ma non il cross-origin:
offline l'app si apre e ripiega sui font di sistema.

Serve: ospitare i font nel progetto. È anche privacy e una richiesta di rete in
meno all'avvio. **Attenzione al rischio visivo**: cambiando la fonte dei font si
tocca ogni schermata, quindi qui gli screenshot in tema chiaro e scuro servono
davvero — è uno dei pochi lavori dove il confronto delle classi CSS non prova
niente.

**Costo**: basso.

## 6. Il bottone «+N altri» del calendario non fa quello che dice

Vista mese, giorno con più di quattro eventi: compare «+N altri», il testo
promette di mostrare gli altri, il codice apre il dettaglio del quinto e basta.

Serve: aprire l'elenco del giorno, o passare alla vista agenda filtrata su quel
giorno.

**Il comportamento sbagliato è fissato da un test** in
`src/components/calendar/MonthGrid.test.tsx`, apposta perché non cambi di
nascosto. Chi corregge il difetto **deve aggiornare quel test**: è il segno che
la correzione è avvenuta, non un ostacolo da aggirare.

**Costo**: basso.

## 7. `StreamingPage`, l'ultimo dei componenti giganti

588 righe, dodici `useState` e quattro tabelle di rendering. La serializzazione
dei filtri è già fuori (`src/lib/streamingFilters.ts`, con la proprietà di
andata e ritorno) e la rete c'è: una e2e sul deep-link, che copre la parte
capace di rompersi in silenzio — la UI continuerebbe a funzionare ignorando
l'URL, e un link condiviso riporterebbe a uno stato diverso da quello copiato.

**Il criterio con cui è stato fatto tutto il resto dice di fermarsi**: quello
che resta dentro è JSX leggibile, e tagliarlo non farebbe guadagnare
verificabilità. Se lo tocchi, che sia per un motivo migliore del conteggio
righe — per esempio perché il punto 4 ha appena introdotto schemi veri e i
componenti vanno riallineati.

## 8. `push_sent_log` cresce senza limite

Nessuna retention, nessun `DELETE` da nessuna parte. L'indice su `sent_at`
esiste e non è usato da niente. Con pochi iscritti non è un problema oggi.

Serve: una migration correttiva che cancelli le righe più vecchie di N giorni,
eseguibile anche su un database vuoto. **Non riscrivere le migration già
applicate.**

**Costo**: basso.

---

## Trappole già pagate — leggile, non riscoprirle

- **`cron.job_run_details` mente per omissione.** Dice `succeeded` quando l'SQL
  è andato, anche se la richiesta HTTP è stata mollata. Per il dispatcher la
  verità è in `net._http_response`.
- **Una migration può essere applicata e non aver fatto niente.** Un `REVOKE` da
  chi non è owner emette un warning e prosegue. È il modo peggiore in cui una
  migration sbaglia. Rileggi lo stato dopo averla applicata, sempre.
- **Il linter vede solo il codice che riesce a leggere.** `MotoGPPage` chiamava
  `Date.now()` in render da mesi con `verify` verde: `react-hooks/purity` non
  entrava nell'IIFE finché stava in fondo a una catena `dati && dati.length > 0
&& (...)`. Semplificata la condizione, la regola ha visto il codice ed è
  diventata rossa. **Aspettati che succeda di nuovo**: il refactor non
  introduce quei difetti, li rende raggiungibili. Si correggono, non si
  zittiscono.
- **Il guardiano del fuso guarda solo le cartelle che gli sono state dette.**
  `TARGET_DIRS` in `scripts/check-rome-tz.mjs` è una lista a mano, e una
  cartella nuova nasce scoperta: `src/components/sinner` è rimasta fuori per
  mesi con un `new Date(stringa)` dentro. Il meta-test in
  `src/test/tooling/tz-guard-coverage.test.ts` sorveglia la lista, ma la sua
  euristica cerca solo `new Date(` e `toLocale(Time|Date)String`: un file che
  sbaglia il fuso in un altro modo non lo fa scattare.
- **`new Date(stringa)` è vietato**, `new Date(Date.UTC(...))` no. Un ISO senza
  `Z` vale UTC: usa `toRomeDate` da `@/lib/dateUtils`.
- **Costruire un `Intl.DateTimeFormat` costa circa settanta volte la sua
  `format`**, quindi va a livello di modulo. Il difetto è già ricomparso tre
  volte dopo essere stato corretto: controlla ogni formatter che sposti.
- **I `children` di un componente si valutano anche quando non vengono resi.**
  Passare JSX a un componente che poi lo scarta esegue comunque le `map` e gli
  IIFE dentro. Se estrai qualcosa di costoso, la soluzione è una render prop.
- **Su macOS il filesystem è case-insensitive.** Due moduli che differiscono
  solo per maiuscole collidono in locale e sono distinti su Linux in CI.
- **Dopo una sostituzione massiva rilancia subito `tsc`.** Il codemod di
  Tailwind rinominò il _valore_ della prop `variant="outline"` in
  `"outline-solid"`: non lo videro né il lint né la build.
- **Le e2e non coprono il rischio visivo.** Se tocchi lo stile va guardato a
  schermo, in tema chiaro e scuro. Se **non** lo tocchi, dimostralo invece di
  affermarlo: confronta l'insieme dei `className` prima e dopo. Attenzione al
  punto cieco — quel confronto non vede ordine e annidamento, e non vede le
  classi che diventano una costante o una prop invece di restare un
  `className=` letterale (succede estraendo un componente: vanno incluse nel
  grep, o la differenza è finta).
- **Le fixture e2e vivono nel maggio 2099.** Una pagina che si apre sulla data
  corrente sarebbe vuota, e un test scritto senza accorgersene verificherebbe
  solo che non esplode. La soluzione è `page.clock.setFixedTime(new
Date("2099-05-05T10:00:00Z"))`, non aggiungere eventi con date relative a
  oggi: quelli cambierebbero anche ciò che vedono gli altri test, a partire da
  «Prossimi Eventi» in home.
- **La griglia di un mese mostra anche i giorni del mese accanto.** Un test che
  verifica «l'evento del 3 maggio non si vede in aprile» fallisce, e ha torto
  lui. Per la navigazione fra mesi usa un evento di fine mese.
- **Le due viste del calendario compongono il nome accessibile in modo
  diverso**: «Juventus: @ Inter» nella griglia, «Juventus @ Inter» in agenda.

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
`src/components/common/DataSection.tsx`, `src/components/common/SportTabs.tsx`
(dove ogni prop opzionale esiste perché una pagina reale ne aveva bisogno, e ha
un test che lo dimostra).

---

## Stato di partenza, misurato il 5 settembre 2026

```text
bun run verify   → exit 0
bun run test     → 339 test su 37 file
bun run test:e2e → 7 test   (non lanciarlo senza autorizzazione)
```

| File                                    | Righe |
| --------------------------------------- | ----- |
| `src/components/home/TonightTvList.tsx` | 596   |
| `src/pages/StreamingPage.tsx`           | 588   |
| `src/pages/JuventusMatchPage.tsx`       | 426   |
| `src/pages/MotoGPPage.tsx`              | 396   |
| `src/pages/Formula1Page.tsx`            | 393   |
| `src/pages/CalendarPage.tsx`            | 371   |
| `src/pages/SinnerPage.tsx`              | 367   |

`JuventusMatchPage` non è mai stata nella lista dei componenti giganti e nessuno
l'ha guardata con quell'occhio: se un giorno serve, comincia chiedendoti cosa
lì dentro si romperebbe senza fare rumore, non quante righe ha.

Le sette e2e di `e2e/app.spec.ts`: navigazione fra tutte le sezioni, stato di
caricamento F1, separatore di Stasera in TV, dettaglio partita Juventus, PWA
offline, deep-link streaming, calendario in vista mese e agenda.

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
