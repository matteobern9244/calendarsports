# Contribuire a Calendar Events

Linee guida sintetiche per chi lavora al codice di **Calendar Events**.

## Comandi

```bash
bun install                 # bun è il package manager, non npm
bun run dev                 # server di sviluppo su :8080
bun run verify              # il gate: typecheck, lint, guardiani, test, build
bun run test                # solo test unitari
bun run test:watch          # test in watch
bun run test:e2e            # Playwright su Chromium
bun run test:e2e:headed     # end-to-end con browser visibile
bun run typecheck           # tsc -b, strict
bun run lint                # eslint, zero avvisi ammessi
bun run check:italian       # nessun testo inglese nella UI
bun run check:tz-juventus   # fuso Europe/Rome nei formati e nei confronti
bun run build               # build di produzione
```

`bun run verify` è quello che gira in CI nel job `quality`. Se lo passi in
locale, la CI non ha sorprese da darti.

## Convenzioni di prodotto

**Lingua.** Interfaccia in italiano. Eccezioni ammesse: `STREAMING` e
`CALENDAR EVENTS`. Nomi propri e acronimi tecnici restano come sono.

**Orari.** Sempre `Europe/Rome`, sia quando si mostrano sia quando si
confrontano. Gli helper stanno in `src/lib/dateUtils.ts`.

**Mobile-first.** L'app è pensata prima per il telefono ed è installabile. Più
viste hanno due alberi di render, uno mobile e uno desktop, entrambi presenti nel
DOM: quando scrivi un test, assicurati di puntare a quello visibile.

**Tema.** Oro e blu notte, titoli in Oswald, testo in Inter, tema scuro di
default. I colori si usano **solo** tramite i token semantici definiti in
`src/index.css`: niente colori scritti a mano nei componenti.

## Convenzioni di codice

**Pagine**: una per route in `src/pages/`, export default. Non importano da altre
pagine.

**Componenti**: quelli riusabili in `src/components/common/`, quelli di dominio
nella cartella della loro area. `src/components/ui/` è generato dalla CLI shadcn
e non si edita.

**Hook**: uno per concetto in `src/hooks/`. Gli hook di dati sono involucri
sottili su React Query e vivono in `useSportsData.ts` / `useStreamingData.ts`.

**Logica pura**: in `src/lib/`, senza React, così è testabile senza montare
niente.

**Stile**: Tailwind 4. La configurazione del tema è nel blocco `@theme` di
`src/index.css` — non esiste un `tailwind.config.ts`.

## Regole obbligatorie

1. Il client Supabase si importa **solo** da `@/lib/supabaseClient`. Lo impone
   `no-restricted-imports` in `eslint.config.js`.
2. Date e orari passano dagli helper di `dateUtils`, mai da `new Date(stringa)`
   diretto. Lo impone `bun run check:tz-juventus`.
3. I testi della UI sono in italiano. Lo impone `bun run check:italian`.
4. Il retry HTTP sta in un livello solo, dentro `sportsApi.ts`.
5. Lo stato non si azzera in un `useEffect`: si confronta col render precedente.
   Lo impone `react-hooks/set-state-in-effect`.
6. Niente `Math.random()` o `Date.now()` durante il render. Lo impone
   `react-hooks/purity`.

Ogni esenzione (`eslint-disable-next-line`, `// @tz-ignore`, `// @lingua-ignore`)
va scritta con la motivazione accanto.

## Test

Vitest su jsdom per l'unità, Playwright su Chromium per la navigazione. I test
unitari stanno accanto al codice che coprono (`src/**/*.test.ts(x)`), quelli
end-to-end in `e2e/`.

Le fixture end-to-end in `e2e/support/mockSportsApi.ts` devono replicare il
contratto reale delle edge function, paginazione compresa: una fixture più
semplice del contratto vero nasconde i bug invece di trovarli.

Stato attuale: **127 test unitari su 10 file** e 4 end-to-end, tutti verdi. Il
numero invecchia in fretta: la fonte è l'output di `bun run test`, non questa
riga. La copertura resta parziale — vedi [`ROADMAP.md`](ROADMAP.md).

## Checklist prima di aprire una PR

- [ ] `bun run verify` verde
- [ ] `bun run test:e2e` verde
- [ ] `changelog.md` aggiornato se il cambiamento è percepibile
- [ ] `git status --short` non mostra niente di inatteso
- [ ] la PR parte da `develop` (mai da `main`) ed è assegnata a `@matteobern9244`
- [ ] il resoconto dice cosa hai verificato **e cosa no**
