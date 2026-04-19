# AGENTS

## Scopo

Questo documento e' un playbook operativo per agenti AI che lavorano su questo
repository. Vale in modo generale per qualunque agente, con attenzione pratica
particolare a **Codex** e **GitHub Copilot**.

L'obiettivo non e' spiegare il prodotto in astratto, ma ridurre il rischio di
modifiche errate, regressioni funzionali e regressioni nel workflow **GitHub <->
Lovable**.

## Contesto del progetto

- Applicazione web di eventi sportivi e streaming sviluppata come SPA React.
- Progetto nato inizialmente su **Lovable** e poi evoluto in GitHub e
  localmente.
- Stack reale: React, Vite, TypeScript, Tailwind, shadcn/ui, Radix, React Query,
  React Router, Supabase Edge Functions.
- Routing lato client con `BrowserRouter`.
- Backend applicativo distribuito in `supabase/functions/*`.
- Dati ottenuti tramite mix di API pubbliche, scraping di provider esterni,
  fallback statici e dataset stagionali codificati manualmente.

## Regole di sicurezza operativa

- Non assumere che i dati esterni siano stabili o affidabili.
- Non cambiare workflow Git, branch policy, integrazione GitHub o relazione con
  Lovable senza istruzioni esplicite.
- Non trattare `main` come branch di lavoro ordinario.
- Non introdurre modifiche che possano causare sync indesiderati verso Lovable.
- Non cambiare segreti, file env, chiavi, progetto Supabase o modalita' di
  deploy senza richiesta esplicita.
- Non dichiarare come "fonte reale" cio' che nel codice e' in realta' statico o
  hardcoded.
- Quando una feature dipende da scraping, esplicitarlo sempre.
- Non dichiarare mai "fatto", "scritto", "risolto" o equivalenti senza verifica
  reale del risultato.
- Nessun falso positivo: distinguere sempre tra azione tentata, azione riuscita
  e risultato verificato.

## Workflow Git richiesto

Assunzione operativa del repository:

- `main` e' il branch di default collegato al sync bidirezionale GitHub <->
  Lovable.
- Lovable scrive automaticamente su `main` ad ogni modifica fatta dall'editor
  Lovable. Questo e' il canale ufficiale di scrittura su `main`.
- Gli sviluppatori umani **non** pushano direttamente su `main`. Lavorano su
  `develop` (o su feature branch derivati da `develop`) e arrivano su `main`
  solo via pull request.
- Il deploy in produzione resta manuale su Lovable (Publish -> Update).

Regole per agenti AI che operano fuori da Lovable (es. Codex, Copilot in IDE):

- Non pushare mai direttamente su `main`.
- Lavorare su `develop` o su feature branch derivati da `develop` e proporre
  PR verso `develop`.
- L'arrivo su `main` deve avvenire solo con una PR separata `develop` ->
  `main`.
- Quando apri una PR, assegna sempre la PR a `@matteobern9244` e applica
  sempre le label gia' esistenti piu' adatte al change set reale.
- Se devi proporre merge, dichiara sempre l'impatto potenziale sul sync
  Lovable e sulla versione live.
- Non cambiare il branch di default o la struttura dei remote senza richiesta
  esplicita.

Regole per Lovable (questo agente, in-editor):

- E' l'unico canale autorizzato a scrivere direttamente su `main`.
- Ogni modifica fatta in chat Lovable produce un commit automatico su `main`
  via sync GitHub <-> Lovable.
- Le branch protection rules su GitHub devono consentire push solo all'app
  GitHub di Lovable (`lovable-dev[bot]` o equivalente) e bloccare push diretti
  da utenti umani.

Configurazione GitHub finale richiesta.

**IMPORTANTE**: usa **una sola** fonte di protezione per `main`.

- Tenere attiva solo la Ruleset moderna repository-level che matcha
  esattamente `refs/heads/main`.
- Tenere assente o disattivata la Branch protection rule classica su `main`.
- Consentire bypass solo all'app GitHub di Lovable (`lovable-dev`) con
  `bypass_mode = always`.
- Attivare nella Ruleset solo queste branch rules:
  - `deletion`
  - `non_fast_forward`
- Non attivare `required_linear_history`, `required_signatures`,
  `required_deployments`, `code_scanning` o flag equivalenti a
  `Do not allow bypassing` / `Enforce for admins`.

Con questa configurazione:

- Lovable continua a poter pushare direttamente su `main` per il sync.
- Gli umani lavorano su feature branch -> `develop`.
- L'arrivo umano su `main` avviene solo con PR `develop` -> `main`.
- Le PR verso `develop` e `main` devono avere `auto-merge` attivo con metodo
  `squash` dopo esito positivo dei workflow PR richiesti dal flusso umano.
- Il vincolo umano su `main` resta di processo e di workflow, non di branch
  rule incompatibile con il sync automatico di Lovable.
- Il workflow `guard-main-source.yml` blocca le PR verso `main` che non
  provengono da `develop`, ma non interferisce con i push automatici di
  Lovable su `main`.

### Sintomo tipico di mis-configurazione

Lovable mostra: `Push was rejected by branch protection rules. Please
disable required status checks or allow the GitHub app to bypass branch
protections.` In questo caso:

1. Branch protection classica ancora attiva oltre alla Ruleset su `main`.
2. Nella Ruleset di `main` sono rimasti `pull_request` o
  `required_status_checks`, incompatibili con il push diretto di Lovable.
3. Flag `Do not allow bypassing` / `Enforce for admins` attivo.

## Mappa minima del codice da leggere prima di intervenire

Leggere sempre prima questi file o directory:

- `src/App.tsx`
- `src/pages/*`
- `src/hooks/useSportsData.ts`
- `src/lib/api/sportsApi.ts`
- `supabase/functions/*`

Leggere inoltre, se l'intervento tocca documentazione o setup:

- `README.md`
- `.env.example`
- `.gitignore`
- `package.json`

## Mappa funzionale rapida

- `src/pages/Index.tsx`: home con aggregazione prossimi eventi.
- `src/pages/SinnerPage.tsx`: profilo, risultati e tornei di Sinner.
- `src/pages/JuventusPage.tsx`: calendario Juventus e classifica Serie A.
- `src/pages/Formula1Page.tsx`: calendario F1, piloti, costruttori.
- `src/pages/MotoGPPage.tsx`: calendario MotoGP, piloti, costruttori.
- `src/lib/api/sportsApi.ts`: adapter client verso le Edge Functions.
- `src/lib/supabaseClient.ts`: client Supabase sicuro con fallback hardcoded
  per URL e anon key (entrambi pubblici), usato in produzione quando le
  variabili Vite non vengono iniettate nel bundle.
- `src/hooks/useSportsData.ts`: query React Query usate dalle pagine.
- `supabase/functions/sports-f1`: Jolpica/OpenF1 + fallback statici.
- `supabase/functions/sports-football`: Sky Sport + Lega Serie A.
- `supabase/functions/sports-tennis`: dataset statico Sinner 2026.
- `supabase/functions/sports-motogp`: Sky Sport + calendario statico 2026 +
  mapping statici.

## Import del client Supabase

**Regola**: per qualunque uso del client Supabase JS SDK (auth, realtime,
`functions.invoke`, storage, query DB) importa sempre da
`@/lib/supabaseClient`, **non** da `@/integrations/supabase/client`.

Motivo: il file `src/integrations/supabase/client.ts` e' auto-generato e
read-only, e legge `import.meta.env.VITE_SUPABASE_URL` /
`VITE_SUPABASE_PUBLISHABLE_KEY` direttamente. In alcuni build di produzione
queste variabili non vengono iniettate nel bundle e il client viene creato
con `URL = undefined`, causando richieste rotte verso
`https://<host>/undefined/functions/v1/...` (fallback HTML 200, mai JSON,
React Query in loading infinito).

`src/lib/supabaseClient.ts` ricrea il client usando le stesse env var con
fallback hardcoded sui valori pubblici (project URL + anon key), garantendo
che il client funzioni in qualunque build. Esporta anche
`SUPABASE_PROJECT_URL` e `SUPABASE_ANON_KEY` per chiamate `fetch` manuali
verso le edge functions.

Esempio:

```ts
// OK
import { supabase } from "@/lib/supabaseClient";

// Da evitare nei nuovi import
import { supabase } from "@/integrations/supabase/client";
```

## Regole di modifica

- Preservare UI, nomenclatura e struttura delle route salvo richiesta contraria.
- Non migrare lo stack verso framework diversi.
- Non sostituire `BrowserRouter`, React Query o integrazione Supabase senza
  motivo forte e spiegato.
- Trattare scraping, parsing HTML e mapping statici come aree ad alta
  fragilita'.
- Qualunque nuova dipendenza deve essere motivata e documentata.
- Qualunque nuova fonte dati deve essere documentata in `README.md`.
- Ogni file Markdown creato o modificato deve rispettare sempre i vincoli di
  `markdownlint`.
- Se tocchi una sezione sportiva, considera sempre l'impatto sulla Home.
- Se tocchi shape dei payload backend, verifica frontend e hook correlati.

## Checklist pre-edit

- Capire quale sezione sportiva o area cross-cutting viene toccata.
- Identificare la fonte dati reale: API, scraping, fallback o hardcoded.
- Verificare se la modifica impatta Home aggregata, hook React Query, Edge
  Function corrispondente, variabili ambiente o branch policy.
- Distinguere fatti verificati da inferenze.
- Se la modifica puo' avere effetti su `main` o Lovable, dichiararlo prima.

## Checklist post-edit

- Eseguire i controlli pertinenti: `npm run lint`, `npm run build`,
  `npm run test`.
- Se vengono creati o modificati file Markdown, eseguire un controllo
  `markdownlint` sui file `.md` del progetto.
- Se il cambiamento e' UI o data-shape, verificare almeno le pagine principali
  coinvolte.
- Controllare che la documentazione sia aggiornata se cambiano architettura,
  env, fonti dati o workflow Git e Lovable.
- Verificare che nessuna istruzione finale incentivi push accidentali su `main`.
- Dichiarare eventuali limiti di verifica se test o build non coprono davvero la
  modifica.

## Convenzioni di risposta per agenti

- Separare chiaramente fatti verificati nel repository, ipotesi e
  raccomandazioni.
- Se una sezione usa dati fragili, dirlo esplicitamente.
- Se una modifica e' sicura o rischiosa rispetto a Lovable, esplicitarlo.
- Non presentare come "risolto" cio' che non e' stato verificato con build o
  test adeguati.
- In caso di dubbio su branch, sync o deploy, essere conservativi.
- Se un file viene creato, modificato o rimosso, confermarlo solo dopo verifica
  diretta con filesystem, output di comando o stato Git.
- Se un tentativo fallisce, dirlo esplicitamente invece di riportarlo come
  completato.

## Limiti noti del progetto

- Copertura test minima.
- Presenza storica di `.env` reale nel repo.
- Dipendenze da scraping di provider terzi.
- Contenuti stagionali statici o hardcoded.
- Possibile divergenza tra repository GitHub, progetto Supabase collegato e
  versione live gestita in Lovable.

## Linee guida specifiche per Codex e GitHub Copilot

Queste note non rendono il documento vendor-specific, ma coprono i due strumenti
piu' probabili.

### Per Codex

- Prima di modificare file, leggere effettivamente i punti d'ingresso e la
  funzione edge coinvolta.
- Se si interviene su documentazione o setup, verificare lo stato reale del repo
  prima di scrivere istruzioni.
- Non proporre workflow di commit o push su `main` come default.

### Per GitHub Copilot

- Non accettare suggerimenti che cambiano stack, rimuovono fallback senza capire
  il provider o sostituiscono parsing e mapping statici senza verificare il
  formato reale dei dati.
- Rivedere sempre manualmente il codice generato su parsing HTML,
  normalizzazione nomi e mapping loghi o foto.

## Criterio di sicurezza finale

Una modifica e' accettabile solo se:

- non rompe il funzionamento corrente atteso della sezione coinvolta;
- non introduce comportamento ambiguo verso Lovable;
- non maschera la natura reale delle fonti dati;
- non spinge implicitamente il team a usare `main` come branch di
  sperimentazione.
