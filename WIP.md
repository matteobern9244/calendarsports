# Prompt — finire il refactoring dei componenti giganti

> Questo file **è un prompt**, non un diario. Incollalo come primo messaggio in
> una sessione nuova. Descrive un lavoro che si può portare a termine in una
> sessione sola, e contiene le trappole già pagate una volta: leggerle costa
> due minuti, riscoprirle è costato ore.
>
> Lo stato del progetto al 31 agosto 2026 — audit chiuso, versione 2.8.0 — è in
> [`changelog.md`](changelog.md). Quello che resta aperto e **non** riguarda
> questo lavoro (in primis la rotazione di `DISPATCH_SECRET`, che è bloccante e
> di sicurezza) vive in [`docs/ROADMAP.md`](docs/ROADMAP.md) e
> [`docs/SECURITY.md`](docs/SECURITY.md). Non serve rileggerli per fare questo.

---

## Il compito

Chiudi il refactoring dei componenti giganti di `calendarsports`, sul branch
`develop`. Tre cose, in quest'ordine:

1. **`JuventusPage.tsx`** (712 righe, il file più grande del progetto).
2. **Il guscio ripetuto** delle quattro pagine sportive (~50 righe su quattro
   file).
3. **Il secondo giro** su `StreamingPage`, `TonightTvList` e `CalendarPage`,
   già accorciate ma non finite.

Non è un lavoro di conteggio righe. L'obiettivo è che **la logica che si può
sbagliare in silenzio stia in moduli puri con dei test**, e che il JSX resti
JSX. Dove tagliare non fa guadagnare verificabilità, non tagliare.

---

## Prima di toccare qualsiasi cosa

Leggi [`AGENTS.md`](AGENTS.md): è il contratto, e la sua tabella «Come scegliere
la guida» dice quale playbook è obbligatorio per l'area toccata. Per questo
lavoro serve
[`docs/agent-playbook/architecture-and-boundaries.md`](docs/agent-playbook/architecture-and-boundaries.md).

Quattro regole che questo lavoro tocca da vicino:

- **TDD.** Il test si scrive prima e si guarda fallire. Qui non è cerimonia:
  serve a dimostrare che l'estrazione non ha cambiato comportamento.
- **Non fare commit, push, merge o PR se non ti viene chiesto.** Se te lo
  chiedono: solo l'identità Git già configurata, nessun `--author`, nessun
  trailer, nessuna firma dell'agente.
- **Mai lavorare su `main`**, che è sincronizzato con Lovable.
- **Zero avvisi.** Se il lavoro ne produce, sistemarli fa parte del lavoro: non
  è un follow-up.

Il gate è `bun run verify`, più `bun run test:e2e` per la navigazione. Verdi a
ogni commit, non solo alla fine.

---

## Il metodo, che qui non è negoziabile: prima la rete, poi il taglio

La regola è nata sul campo. `StreamingPage` non era visitata da **nessuna**
e2e, e la parte che poteva rompersi era la serializzazione dei filtri
nell'indirizzo: la UI avrebbe continuato a funzionare ignorando l'URL, e un
link condiviso avrebbe riportato a uno stato diverso da quello che chi l'ha
copiato stava guardando. Nessun test l'avrebbe visto. La e2e sul deep-link è
venuta **prima** dell'estrazione.

Quindi, per ogni file: chiediti **cosa si romperebbe senza fare rumore** e
copri quello per primo. Non «aggiungi test», ma: individua l'unica cosa che
fallirebbe in silenzio e mettila sotto osservazione.

---

## 1. `JuventusPage.tsx` — 712 righe

**La rete c'è già, ed è buona.** Le e2e la attraversano in profondità:
`e2e/app.spec.ts` la visita nel test di navigazione (calendario, badge
emittente, scheda Classifica) e ha un test dedicato al dettaglio partita,
raggiunto sia dal calendario sia per id diretto sia con un id inesistente. È il
motivo per cui viene per prima: si può tagliare subito.

Cosa c'è dentro, in ordine di valore:

- **`buildPageList(current, total)`** (riga ~56). Aritmetica di paginazione con
  gli ellissi, **zero test**. È il candidato migliore di tutto il lavoro:
  la classica funzione che sbaglia di uno ai bordi — pagina 1, ultima pagina,
  meno di 7 pagine, esattamente 7, 8 — senza che nessuno se ne accorga.
  Portala in `src/lib/` con i suoi test **prima** di toccare il JSX.
- **La card «Prossima Partita»** (riga ~232, `{nextMatch && ...}`): un centinaio
  di righe di JSX dentro un IIFE. Diventa un componente in
  `src/components/juventus/`.
- **La tabella classifica** (dentro `TabsContent value="classifica"`, riga ~332)
  e **il blocco calendario con la sua paginazione** (riga ~450): due componenti.
- `COMPETITION_COLORS` e `PAGE_SIZE`: costanti, seguono chi le usa.

**Un dettaglio da non appiattire**: nel tab calendario `DataSection` riceve
`isEmpty={!calendar?.items.length}` ma `isLoading={calLoading && !calendar}`.
Non è una svista — serve a tenere i dati in pagina mentre arriva la successiva.
Se sposti quel blocco, portati dietro le condizioni così come sono.

## 2. Il guscio ripetuto delle quattro pagine sportive

`Formula1Page`, `MotoGPPage`, `SinnerPage` e `JuventusPage` ripetono due pezzi.

- **Il guardiano offline**: lo stesso `if` — «nessuna sezione ha dati _e_ tutte
  sono in errore _e_ siamo offline» → `OfflineFallback` dentro
  `div.container.py-8.sm:py-12`. Sta a `Formula1Page.tsx:78`,
  `MotoGPPage.tsx:83`, `SinnerPage.tsx:96`, `JuventusPage.tsx:194`.
  **Le quattro condizioni non sono identiche**: ognuna elenca le proprie
  sezioni, e Sinner include anche `!playerInfo`. Un componente che accetta una
  lista di `{ data, error }` più un `onRetry` le copre tutte senza appiattirle.
- **L'intestazione con le tab**: `SectionHeader` dentro `div.mb-2`, poi `Tabs`
  con `TabsList` e i trigger con la stessa classe. **`SinnerPage` usa una
  `TabsList` più semplice delle altre tre** (niente `flex-wrap h-auto gap-1
p-1`): o la parametrizzi o la lasci fuori, ma non uniformarla in silenzio —
  sarebbe un cambiamento visivo che nessuno ha chiesto.

Resa attesa: una cinquantina di righe. È poco, ed è il motivo per cui viene
**dopo** `JuventusPage`. Se il tempo stringe, è questo il pezzo da sacrificare.

## 3. Secondo giro sui tre file già accorciati

Solo se i primi due sono chiusi e verdi.

- **`TonightTvList.tsx`** (661): la scelta del programma principale per canale
  — quella con `overlapsPrimeWindow`, `primeWindowOverlapMinutes`, la soglia
  `MIN_DURATION = 40` e i tie-break — è ancora dentro una `useMemo` nel
  componente. È logica di selezione con criteri impliciti e merita di stare in
  `src/lib/tonightTv.ts`, dove i suoi vicini hanno già nove test.
  **Ma lì la rete è più debole che altrove**: una sola e2e, sul separatore fra
  famiglie. I test unitari sono trenta, ma passano tutti da un
  `vi.mock("@tanstack/react-query")` (in `TonightTvList.test.tsx` e in
  `TonightTvList.overlap.test.tsx`). Quei mock **oggi implementano `combine`** e
  dichiarano di rispettare il contratto reale — furono corretti quando il
  componente iniziò a usarla, e venti test diventarono rossi in quel momento.
  Il punto resta: un mock descrive il contratto **per quanto ne sappiamo**, e
  se l'estrazione tocca un'altra opzione di `useQueries` sarà di nuovo muto.
  Verifica cosa il mock implementa davvero prima di appoggiartici.
- **`CalendarPage.tsx`** (620): vista mese e vista agenda sono due componenti
  dentro una funzione sola. **Nessuna e2e la visita**, e le fixture e2e usano
  date nel **2099**: aperta sul mese corrente la pagina è vuota, quindi una e2e
  utile richiede fixture con date relative a oggi ed è un lavoro a sé.
- **`StreamingPage.tsx`** (588): restano dieci stati locali e quattro tabelle
  di rendering. La rete c'è (e2e sul deep-link). Valore basso: è già leggibile.

---

## Trappole già pagate — leggile, non riscoprirle

- **Il linter vede solo il codice che riesce a leggere.** `MotoGPPage` chiamava
  `Date.now()` in render da mesi con `verify` verde: `react-hooks/purity` non
  entrava nell'IIFE finché stava in fondo a una catena
  `dati && dati.length > 0 && (...)`. Semplificata la condizione, la regola ha
  visto il codice ed è diventata rossa. **Aspettati che succeda di nuovo**: il
  refactor non introduce quei difetti, li rende raggiungibili. Sono difetti
  veri: si correggono, non si zittiscono.
- **I `children` di un componente si valutano anche quando non vengono resi.**
  Passare JSX a un componente che poi lo scarta esegue comunque le `map` e gli
  IIFE dentro. Oggi è irrilevante (array vuoti), ma se estrai qualcosa di
  costoso la soluzione è una render prop, non spostare la condizione fuori.
- **Il guardiano del fuso ha una lista di file.** Copre `src/pages/*` (elenco a
  mano in `scripts/check-rome-tz.mjs`), `src/lib` e tre cartelle di componenti.
  **Se crei una cartella nuova sotto `src/components/` che manipola date, il
  guardiano non la guarda e resta verde**: aggiungila a `TARGET_DIRS`. Due test
  in `src/test/tooling/tz-guard-coverage.test.ts` sorvegliano la lista e le
  esenzioni.
- **`new Date(stringa)` è vietato**, `new Date(Date.UTC(...))` no. Un ISO senza
  `Z` vale UTC: usa `toRomeDate` da `@/lib/dateUtils`.
- **Costruire un `Intl.DateTimeFormat` costa circa settanta volte la sua
  `format`**, quindi va a livello di modulo. Il difetto è già ricomparso due
  volte dopo essere stato corretto una: controlla ogni formatter che sposti.
- **Su macOS il filesystem è case-insensitive.** Due moduli che differiscono
  solo per maiuscole collidono in locale e sono distinti su Linux in CI. È già
  successo.
- **Dopo una sostituzione massiva rilancia subito `tsc`.** Il codemod di
  Tailwind rinominò il _valore_ della prop `variant="outline"` in
  `"outline-solid"` su quattro bottoni: non lo videro né il lint né la build.
- **Le e2e non coprono il rischio visivo.** Se tocchi lo stile va guardato a
  schermo, in tema chiaro e scuro. Se **non** lo tocchi, dimostralo invece di
  affermarlo: confronta l'insieme dei `className` prima e dopo. Sulle quattro
  pagine sportive furono 195 occorrenze e zero differenze — per quel rischio è
  una prova più forte di uno screenshot.

---

## Dove va cosa

Dalla struttura di `src/`, che il playbook rende vincolante:

- `src/lib/` — logica pura, senza React. È il posto per tutto ciò che vuoi
  testare senza montare un componente. **È qui che sta il valore.**
- `src/components/common/` — componenti trasversali riusabili.
- `src/components/<dominio>/` — componenti di un'area (`streaming/`, `home/`,
  `sinner/`, `highlights/`; per il punto 1 servirà `juventus/`).
- `src/components/ui/` — **generati dalla CLI shadcn, non si scrivono a mano.**
- Una pagina non importa da un'altra pagina. Se due pagine vogliono la stessa
  cosa, quella cosa scende in `common/` o in `lib/`.

Precedenti da imitare, tutti nati da questo stesso lavoro:
`src/lib/streamingFilters.ts` (168 righe, 11 test, con la proprietà di andata e
ritorno fra `readFilters` e `writeFilters`), `src/lib/calendarGrid.ts` (118, 12
test), `src/lib/tonightTv.ts` (182, 9 test),
`src/components/common/DataSection.tsx` (103, 8 test).

---

## Stato di partenza, misurato il 31 agosto 2026

```text
bun run verify   → exit 0
bun run test     → 262 test su 26 file
bun run test:e2e → 6 test
```

| File                                    | Righe |
| --------------------------------------- | ----- |
| `src/pages/JuventusPage.tsx`            | 712   |
| `src/components/home/TonightTvList.tsx` | 661   |
| `src/pages/CalendarPage.tsx`            | 620   |
| `src/pages/StreamingPage.tsx`           | 588   |
| `src/pages/JuventusMatchPage.tsx`       | 426   |
| `src/pages/Formula1Page.tsx`            | 409   |
| `src/pages/MotoGPPage.tsx`              | 408   |
| `src/pages/SinnerPage.tsx`              | 363   |

Le sei e2e di `e2e/app.spec.ts`: navigazione fra tutte le sezioni, stato di
caricamento F1, separatore di Stasera in TV, dettaglio partita Juventus, PWA
offline, deep-link streaming.

---

## Quando hai finito

- `bun run verify` **e** `bun run test:e2e` verdi.
- `changelog.md` aggiornato sotto `[Unreleased]` per ogni cambiamento
  percepibile. Un refactor puro non lo è: se non cambia niente per chi usa
  l'app, dillo e non inventare una voce.
- `docs/ROADMAP.md`: la voce «Quello che resta dei componenti giganti» va
  ristretta o cancellata. La regola del ROADMAP è che una voce realizzata si
  sposta nel changelog e sparisce da lì.
- **Riscrivi questo file.** Se il lavoro è chiuso, `WIP.md` va cancellato dal
  repository, non lasciato a raccontare un compito che non esiste più. Se resta
  qualcosa, riscrivilo come prompt per la sessione dopo, con lo stesso taglio:
  cosa fare, cosa è già stato pagato, dove sono le trappole.

Nel resoconto finale indica i file modificati, le verifiche eseguite e il loro
esito, **i limiti della verifica**, i rischi residui e i follow-up. Distingui
azione tentata, azione riuscita e risultato verificato: non dichiarare «fatto»
senza aver guardato l'esito.
