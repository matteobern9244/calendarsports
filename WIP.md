# WIP — audit completo, punto di ripresa

Lavoro in corso sul branch `develop`, interrotto la sera del **26 agosto 2026**.
Questo file esiste per poter riprendere a freddo: dice cosa è stato fatto, cosa
resta, e dove ricominciare esattamente.

Il piano completo da cui nasce il lavoro è in
`~/.claude/plans/fai-un-audit-completo-splendid-rainbow.md`.

## Stato verificato al momento dell'interruzione

Misurato, non ricordato:

```text
bun audit      → No vulnerabilities found
bun outdated   → solo typescript 5.9.3 (fermo di proposito, vedi sotto)
bun run lint   → 0 errori, 0 avvisi (--max-warnings=0)
bun run typecheck → pulito, con strict attivo
bun run test   → 136 test su 12 file, tutti verdi
bun run test:e2e → 4 test verdi
CI Develop     → verde (run 33013634644)
```

Il tree è pulito. Diciassette commit sopra `22d2d33`, che era l'ultimo stato
noto prima dell'audit.

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

**Fase 4 — struttura agentica e documentazione.** `.claude/` versionata,
AGENTS.md ridotto da 302 a 115 righe in forma di router, CLAUDE.md sottile,
cinque playbook in `docs/agent-playbook/`, i documenti tecnici
(ARCHITECTURE, DATA_SOURCES, SECURITY, CONTRIBUTING, ROADMAP), Renovate al posto
di Dependabot per npm.

## Da fare — riprendere da qui

### 1. Fase 6, i quattro task rimasti

Sono le voci a **priorità media e bassa** di [`docs/ROADMAP.md`](docs/ROADMAP.md),
dove ognuna ha già costo e motivazione scritti.

- **Tipizzazione dei payload API.** Oggi `callEdgeFunction` restituisce `any` e
  le pagine hanno circa venticinque punti non tipizzati sui dati che arrivano
  dalle edge function. Il piano prevede schemi zod al confine, derivati dai
  payload già tipizzati in `e2e/support/mockSportsApi.ts`. **Nota**: `zod` è
  stato rimosso dalle dipendenze perché non lo importava nessuno, quindi il
  primo passo è `bun add zod`.
- **Memoizzazioni.** `useCalendarEvents` ricalcola espansione, filtro e
  ordinamento di circa 350 eventi a ogni render, e `CalendarPage` fa scattare un
  tick ogni 60 secondi che li invalida tutti. `TonightTvList` ha una `useMemo`
  che dipende dall'array restituito da `useQueries`, che è nuovo a ogni render:
  quella memo non ha mai memoizzato niente. Va usata l'opzione `combine`.
- **Componenti giganti.** `StreamingPage` (828 righe), `TonightTvList` (760),
  `JuventusPage` (631), `CalendarPage` (601). Da estrarre per gradi: prima gli
  hook di derivazione, poi i presentazionali, poi un `SportPageShell` che
  unifichi il guardiano offline e la struttura a tab ripetuta in quattro pagine.
- **PWA e accessibilità.** Icona 192×192 e maskable con zona di sicurezza reale
  nel manifest; precache minimale dell'app shell in `public/sw.js`, che oggi
  gestisce solo le notifiche e lascia la PWA senza niente a freddo; e tre
  correzioni puntuali di a11y elencate nel piano (riga TV focusabile ma non
  interattiva, `aria-disabled` mancante su `PagerNav`, nomi accessibili sui
  bottoni evento del calendario).

### 2. Fase 3, i due pezzi mancanti

- **Prettier** come errore di lint, con `eslint-config-prettier` ed
  `eslint-plugin-prettier` come ultimo elemento della flat config, più
  `.prettierrc` e `.prettierignore`. La prima formattazione globale va in un
  commit separato, altrimenti sporca ogni diff successivo.
- **I test Deno delle edge function non vengono eseguiti da nessuno.**
  `supabase/functions/sports-football/index.test.ts`,
  `sports-motogp/index.test.ts` e `push-dispatcher/timezone.test.ts` esistono ma
  `vitest.config.ts` raccoglie solo `src/**` e nessuno step di CI lancia
  `deno test`. Vanno o eseguiti davvero, o portati sotto vitest: oggi sono
  write-only.

### 3. Fase 5 — richiede te

Non l'ho eseguita di proposito: tocca il database di produzione, e AGENTS.md —
che stiamo applicando — dice di non modificare Supabase senza richiesta
esplicita. Tutto è documentato in [`docs/SECURITY.md`](docs/SECURITY.md) e in
cima a [`docs/ROADMAP.md`](docs/ROADMAP.md).

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

### 4. Fase 7 — chiusura

Changelog e nota di rilascio. La versione attuale è `2.7.0` in `package.json` e
`src/lib/version.ts`; l'audit merita una `2.8.0` con la sua sezione in
`changelog.md` e la nota in `docs/releases/2.8.0-*.md`. Da recuperare anche la
serie `2.6.x`, che manca dal changelog pur avendo già una nota in
`docs/releases/`.

## Cose scoperte durante il lavoro che vale la pena ricordare

- Il codemod di Tailwind ha rinominato anche il **valore della prop**
  `variant="outline"` in `"outline-solid"` su quattro bottoni, trattandolo come
  una classe CSS. Non l'ha visto né il lint né la build: l'ha trovato `tsc`
  quando ho attivato `strict`. Se in futuro si lancia un altro codemod, il
  typecheck va rilanciato subito dopo.
- Su macOS il filesystem è case-insensitive: due moduli che differiscono solo
  per maiuscole collidono in locale e sono distinti su Linux in CI. È già
  successo con `PreferencesPanelContext.tsx` e `preferencesPanelContext.ts`.
- La lockfile rimasta indietro inchiodava i pacchetti transitivi a versioni
  vecchie: `bun audit` riportava 29 vulnerabilità che sono sparite tutte con un
  `bun install` da zero.
- Il wrapper del Toaster leggeva il tema da `next-themes`, che questa app non
  monta: i toast uscivano chiari sopra l'interfaccia scura. Le e2e sono basate
  sul testo e non lo vedevano; l'ho trovato guardando uno screenshot.
- **Le e2e non coprono il rischio visivo.** Per Tailwind 4 ho verificato a
  schermo Home, Juventus, Streaming, Calendario, F1 e Sinner in tema chiaro e
  scuro. Qualunque intervento sullo stile va verificato allo stesso modo.
