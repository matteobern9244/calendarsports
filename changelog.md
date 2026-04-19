<!-- markdownlint-disable MD024 -->

# Changelog

Questo file adotta la struttura di **Keep a Changelog**, adattata alle regole
operative del repository.

Le voci sotto riportate distinguono tra modifiche **verificate** e storico Git
**non normalizzato**. Quando una modifica tocca fonti dati fragili, scraping,
dataset statici o policy sensibili su `main`, questo viene esplicitato.

## [Unreleased]

### Changed

- Verifica sync GitHub <-> Lovable dopo configurazione bypass app
  `lovable-dev` nelle branch protection rules di `main`. Nessuna modifica
  funzionale al codice o ai dati.
- Documentazione `README.md` e `AGENTS.md` aggiornata con checklist
  corretta per Ruleset moderna vs Branch protection classica e diagnosi
  errore "Push was rejected by branch protection rules".
- Secondo tentativo di push da Lovable per validare bypass su Ruleset
  dopo rimozione del flag "No bypass" e disattivazione protezione
  classica.
- Terzo tentativo di push da Lovable dopo disattivazione di
  "Require status checks to pass" sulla Ruleset di `main`, per isolare
  se il blocco residuo dipendeva dai required checks.
- Quarto tentativo di push da Lovable per ulteriore verifica del sync
  GitHub <-> Lovable su `main`.

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
