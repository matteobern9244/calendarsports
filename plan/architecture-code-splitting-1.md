---
goal: Ridurre il bundle iniziale della SPA tramite code-splitting mirato e sicuro
version: 1.0
date_created: 2026-04-19
last_updated: 2026-04-19
owner: matteobern9244
status: Completed
tags: [architecture, refactor, performance, frontend, vite]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Questo piano definisce un intervento dedicato di code-splitting per la SPA
React/Vite del repository, con l'obiettivo di ridurre il JavaScript iniziale
caricato in ingresso senza cambiare stack, routing, contratti dati o workflow
GitHub <-> Lovable. Il piano segue i vincoli di [AGENTS.md](/Users/matteobernardini/code/calendarsports/AGENTS.md): cambi minimi, TDD quando il comportamento cambia, validazione reale e dichiarazione esplicita dei rischi residui.

## 1. Requirements & Constraints

- **REQ-001**: Preservare la natura SPA React/Vite del progetto e mantenere `BrowserRouter` come router applicativo in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx).
- **REQ-002**: Ridurre il JavaScript eagerly importato al bootstrap, oggi concentrato nel bundle principale costruito dall'entrypoint [src/main.tsx](/Users/matteobernardini/code/calendarsports/src/main.tsx) e dall'albero importato in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx).
- **REQ-003**: Mantenere invariati route path, comportamento utente, payload dati e integrazione React Query.
- **REQ-004**: Il piano deve distinguere tra route splitting e vendor chunking; non basta aumentare soglie di warning di build.
- **REQ-005**: Ogni intervento deve considerare impatto su Home aggregata, hook in [src/hooks/useSportsData.ts](/Users/matteobernardini/code/calendarsports/src/hooks/useSportsData.ts) e adapter edge in [src/lib/api/sportsApi.ts](/Users/matteobernardini/code/calendarsports/src/lib/api/sportsApi.ts).
- **REQ-006**: Le modifiche devono rimanere coerenti con il data flow reale e con le aree fragili del repository: scraping, fallback statici, dataset hardcoded e mapping visivi.
- **CON-001**: Non migrare stack, router, React Query o integrazione Supabase.
- **CON-002**: Non introdurre nuove dipendenze salvo necessità tecnica dimostrata; la soluzione preferita usa solo React e Vite già presenti.
- **CON-003**: Non cambiare il comportamento di prefetch o invalidazione query senza test mirati.
- **CON-004**: Non toccare Edge Functions Supabase in questo intervento, salvo necessità emersa da test o da un delta reale nei contratti runtime.
- **GUD-001**: Seguire `RED -> GREEN -> REFACTOR` per eventuali cambiamenti comportamentali percepibili, come fallback di loading o rendering differito delle route.
- **GUD-002**: Dichiarare esplicitamente i limiti di verifica, in particolare se non viene eseguito `npm run test:e2e`.
- **PAT-001**: Usare `React.lazy` + `Suspense` per separare le route non iniziali e `build.rollupOptions.output.manualChunks` solo dopo avere misurato il nuovo profilo del bundle.
- **PAT-002**: Lasciare la Home in eager load come route di ingresso primaria, salvo evidenza contraria da misurazioni reali.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Stabilire la baseline reale del bundle e individuare cosa oggi entra nel chunk iniziale.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Eseguire una build con source map o report analogo per ottenere la composizione del bundle iniziale e identificare il peso di route pages, librerie UI, `framer-motion`, `lucide-react`, `recharts` e altri vendor. File di riferimento: [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts), [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx). | ✅ | 2026-04-19 |
| TASK-002 | Documentare in modo verificabile quali route sono importate eager in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx) e quali feature costose sono presenti in ciascuna pagina principale. | ✅ | 2026-04-19 |
| TASK-003 | Decidere la baseline numerica obiettivo per il chunk iniziale, ad esempio riduzione del file JS principale rispetto all'attuale build, evitando target arbitrari non misurati. | ✅ | 2026-04-19 |

### Implementation Phase 2

- **GOAL-002**: Applicare route-level code-splitting sicuro senza cambiare il comportamento applicativo.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Convertire in lazy import le route secondarie in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx): [src/pages/SinnerPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/SinnerPage.tsx), [src/pages/JuventusPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/JuventusPage.tsx), [src/pages/Formula1Page.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Formula1Page.tsx), [src/pages/MotoGPPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/MotoGPPage.tsx), [src/pages/NotFound.tsx](/Users/matteobernardini/code/calendarsports/src/pages/NotFound.tsx). | ✅ | 2026-04-19 |
| TASK-005 | Valutare se mantenere [src/pages/Index.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Index.tsx) in eager load per ottimizzare il first render della route `/`, salvo misurazioni che suggeriscano un fallback iniziale più conveniente. | ✅ | 2026-04-19 |
| TASK-006 | Introdurre un boundary `Suspense` coerente con la UX esistente, riusando componenti già presenti come [src/components/common/LoadingState.tsx](/Users/matteobernardini/code/calendarsports/src/components/common/LoadingState.tsx) o un fallback equivalente minimale. | ✅ | 2026-04-19 |
| TASK-007 | Aggiungere o aggiornare test che verifichino che il routing continui a rendere le stesse route e che il fallback di loading non rompa il comportamento attuale. | ✅ | 2026-04-19 |

### Implementation Phase 3

- **GOAL-003**: Rifinire il profilo dei chunk solo dove la route-level split non basta.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Valutare manual chunking in [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts) solo dopo la route split, partendo da separazione di librerie con costo noto come `recharts`, `framer-motion` o gruppi Radix pesanti, evitando chunking speculativo. | ✅ | 2026-04-19 |
| TASK-009 | Verificare se componenti o pagine che usano grafici, animazioni o tabelle costose possano essere ulteriormente isolate in lazy child components senza cambiare il flusso dati. | ✅ | 2026-04-19 |
| TASK-010 | Rimuovere o ridimensionare il workaround attuale `chunkSizeWarningLimit` in [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts) in base al nuovo profilo reale del bundle. | ✅ | 2026-04-19 |

### Implementation Phase 4

- **GOAL-004**: Validare il refactor e consolidare la documentazione minima.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Eseguire `npm run lint`, `npm run test`, `npm run build` e registrare il nuovo profilo bundle con confronto rispetto alla baseline di fase 1. | ✅ | 2026-04-19 |
| TASK-012 | Eseguire `npm run test:e2e` se il cambiamento tocca rendering cross-route o fallback percepibili; se non eseguito, dichiarare il limite e il rischio residuo. | ✅ | 2026-04-19 |
| TASK-013 | Aggiornare documentazione minima solo se il profilo di build o le regole operative cambiano davvero, mantenendo allineamento con [AGENTS.md](/Users/matteobernardini/code/calendarsports/AGENTS.md) e [README.md](/Users/matteobernardini/code/calendarsports/README.md). | ✅ | 2026-04-19 |

## 3. Alternatives

- **ALT-001**: Lasciare tutto invariato e mantenere solo `chunkSizeWarningLimit` alto. Non scelto perché riduce il rumore ma non migliora il bundle iniziale reale.
- **ALT-002**: Introdurre plugin o dipendenze dedicate di bundle analysis e code-splitting avanzato subito. Non scelto come prima mossa perché il repository non richiede nuove dipendenze per applicare route splitting sicuro con strumenti già disponibili.
- **ALT-003**: Rendere lazy anche la Home. Non scelto come default perché la route `/` è l'ingresso principale e un lazy iniziale può peggiorare la UX se non supportato da dati di misurazione reali.
- **ALT-004**: Spezzare manualmente tutti i vendor in `manualChunks` prima del route splitting. Non scelto perché può produrre caching e waterfall peggiori se fatto senza una baseline chiara.

## 4. Dependencies

- **DEP-001**: React 19 e `React.lazy`/`Suspense`, già disponibili tramite [package.json](/Users/matteobernardini/code/calendarsports/package.json).
- **DEP-002**: Vite build pipeline e configurazione in [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts).
- **DEP-003**: React Router route tree definito in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx).
- **DEP-004**: Componenti di fallback/loading già presenti nel repository.
- **DEP-005**: Suite test attuale con Vitest e Playwright definita in [package.json](/Users/matteobernardini/code/calendarsports/package.json).

## 5. Files

- **FILE-001**: [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx) — punto principale per route-level lazy loading e `Suspense`.
- **FILE-002**: [src/main.tsx](/Users/matteobernardini/code/calendarsports/src/main.tsx) — entrypoint da mantenere minimale.
- **FILE-003**: [src/pages/Index.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Index.tsx) — route primaria, probabile eager baseline.
- **FILE-004**: [src/pages/SinnerPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/SinnerPage.tsx) — candidato a chunk separato.
- **FILE-005**: [src/pages/JuventusPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/JuventusPage.tsx) — candidato a chunk separato.
- **FILE-006**: [src/pages/Formula1Page.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Formula1Page.tsx) — candidato a chunk separato.
- **FILE-007**: [src/pages/MotoGPPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/MotoGPPage.tsx) — candidato a chunk separato.
- **FILE-008**: [src/pages/NotFound.tsx](/Users/matteobernardini/code/calendarsports/src/pages/NotFound.tsx) — candidato a chunk separato.
- **FILE-009**: [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts) — profiling build e `manualChunks`/warning threshold.
- **FILE-010**: [src/components/common/LoadingState.tsx](/Users/matteobernardini/code/calendarsports/src/components/common/LoadingState.tsx) — fallback potenziale per `Suspense`.
- **FILE-011**: [src/hooks/useSportsData.ts](/Users/matteobernardini/code/calendarsports/src/hooks/useSportsData.ts) — verifiche di impatto indiretto sul data flow.
- **FILE-012**: [README.md](/Users/matteobernardini/code/calendarsports/README.md) — aggiornamento solo se necessario per note operative di build.

## 6. Testing

- **TEST-001**: Verificare con Vitest che il router continui a rendere le route principali e che il fallback di loading non introduca errori o regressioni.
- **TEST-002**: Verificare che la Home e almeno una route lazy continuino a montare correttamente con React Query provider attivo.
- **TEST-003**: Verificare con `npm run build` che il bundle principale sia ridotto rispetto alla baseline iniziale o che il profilo chunk sia migliorato in modo misurabile.
- **TEST-004**: Eseguire `npm run test:e2e` se il fallback `Suspense` modifica il rendering percepito cross-page.

## 7. Risks & Assumptions

- **RISK-001**: Un lazy boundary mal posizionato puo' peggiorare la UX iniziale o mostrare loading state inattesi.
- **RISK-002**: `manualChunks` aggressivo puo' aumentare il numero di richieste e peggiorare caching o waterfall.
- **RISK-003**: Route split senza misurazione reale puo' spostare peso tra chunk senza ridurre il costo percepito.
- **RISK-004**: Componenti condivisi ad alto costo potrebbero restare nel chunk iniziale anche dopo il lazy loading delle pagine.
- **ASSUMPTION-001**: Le pagine secondarie sono il primo candidato naturale al code-splitting perché oggi sono importate eager in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx).
- **ASSUMPTION-002**: La route `/` deve restare la migliore candidata a eager load finché le misurazioni non dimostrano il contrario.
- **ASSUMPTION-003**: Il repository non richiede nuove dipendenze per completare una prima fase efficace di code-splitting.

Esito verificato dell'intervento completato il `2026-04-19`:

- Il bundle principale e' passato da `702.94 kB` minified / `211.18 kB` gzip a
	`244.90 kB` minified senza warning Vite sulla soglia standard `500 kB`.
- Le route secondarie sono ora caricate lazy tramite `React.lazy` e `Suspense`
	in [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx).
- La build genera chunk separati per `framework`, `motion`, `ui-vendor` e per
	le pagine secondarie.
- Validazioni eseguite con esito positivo: `npm run lint`, `npm run test`,
	`npm run build`, `npm run test:e2e`.

## 8. Related Specifications / Further Reading

- [AGENTS.md](/Users/matteobernardini/code/calendarsports/AGENTS.md)
- [README.md](/Users/matteobernardini/code/calendarsports/README.md)
- [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx)
- [vite.config.ts](/Users/matteobernardini/code/calendarsports/vite.config.ts)
- https://vite.dev/guide/build.html
- https://rollupjs.org/configuration-options/#output-manualchunks
- https://react.dev/reference/react/lazy