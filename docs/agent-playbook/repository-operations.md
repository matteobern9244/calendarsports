# Operatività del repository

## Scopo

Questa guida vale per Git, la sincronizzazione con Lovable, l'ambiente locale, le
dipendenze, la CI e le release. Si applicano sempre anche le regole root in
[`AGENTS.md`](../../AGENTS.md).

## Regole

### `main` non è un branch di lavoro

`main` è il branch di default ed è legato alla sincronizzazione bidirezionale con
Lovable: l'editor Lovable committa lì a ogni modifica ed è **l'unico scrittore
diretto autorizzato**.

Chi lavora dal repository parte da `develop`, o da un branch di feature che nasce
da `develop`, e arriva a `main` solo con una pull request separata. Il deploy in
produzione resta **manuale** dentro Lovable (Publish → Update): niente in questo
repository lo automatizza, e nessun documento deve suggerire il contrario.

Non fare commit, push, merge o PR se non ti è stato chiesto.

La protezione di `main` ha **una sola** fonte: il Ruleset moderno del repository
su `refs/heads/main`, con bypass per l'app `lovable-dev`. La branch protection
classica resta disattivata. Non proporre di ripristinarla e non aggiungere al
Ruleset gate di tipo `pull_request` o `required_status_checks`: renderebbero
impossibile la sincronizzazione diretta di Lovable, che è il motivo per cui il
Ruleset è minimale.

Il guardiano è `.github/workflows/guard-main-source.yml` (oggi sospeso: la cartella dei workflow è stata rimossa),
che fa fallire ogni PR verso `main` che non parta da `develop`.

### Bun è il package manager, e ce n'è uno solo

`bun.lock` testuale è l'unico lockfile. Non lanciare `npm install`: produrrebbe
un `package-lock.json` concorrente e un albero di dipendenze diverso da quello
che gira in CI. Il repository ne ha avuti tre contemporaneamente, per due package
manager, senza niente che dicesse quale vincesse.

`packageManager` ed `engines` in `package.json` fissano bun 1.3.13 e Node ≥ 24.
Node serve comunque: gli script guardiano in `scripts/` sono `.mjs` eseguiti da
`node`.

Rigenerare il lockfile non è un'operazione neutra: quando era rimasto indietro
inchiodava i pacchetti transitivi a versioni vecchie, e `bun audit` riportava 29
vulnerabilità che sparivano tutte con un `bun install` da zero.

### Le dipendenze si aggiungono solo se servono davvero

Prima di aggiungerne una, guarda se lo stack presente basta. Il progetto ha già
React Query per i dati, Tailwind per lo stile, framer-motion per le animazioni,
`Intl` per date e numeri.

Al contrario, una dipendenza che nessuno importa va tolta, non aggiornata: il
template Lovable ne aveva installate ventisei per componenti shadcn che l'app non
usava.

**TypeScript resta sulla linea 5.9.** La 7 esiste, ma `typescript-eslint` dichiara
`typescript <6.1.0`: adottarla spegnerebbe il linting type-aware. È l'unica voce
che `bun outdated` mostra ferma, ed è ferma di proposito.

### La CI è un gate, non un rapporto

Un workflow solo, `CI` (`.github/workflows/ci.yml`), su push a `develop` e su
PR verso `develop` e `main`, con due job:

- `quality`: un unico passo, `bun run verify`;
- `e2e`: Playwright su Chromium, con report caricato come artifact solo in caso
  di fallimento.

Il job `quality` lancia `bun run verify` e basta, di proposito: elencare i
singoli anelli nel workflow li farebbe divergere dal gate locale senza che
nessuno se ne accorga. Se aggiungi un controllo, lo aggiungi a `verify` e la
CI lo prende da sola.

`Enable PR Auto Merge` si aggancia a questo workflow **per nome**, con
`workflow_run`. Se rinomini `CI`, rinominalo anche li': un nome sbagliato non
produce un errore, produce un trigger che non scatta mai.

Lo script `lint` porta `--max-warnings=0`. Un avviso deve fallire come un errore:
altrimenti se ne accumulano a centinaia, la CI li stampa e passa lo stesso.

## Contratti: rilascio

La versione vive in `package.json` e in `src/lib/version.ts`, e il footer
dell'app la mostra leggendola da lì. Devono dire la stessa cosa.

Ogni versione porta:

1. una sezione in [`changelog.md`](../../changelog.md), in formato Keep a
   Changelog;
2. una nota in `docs/releases/<versione>.md`, scritta a mano.

### Una versione che tocca `supabase/functions/` va distribuita a parte

**Pubblicare il frontend da Lovable non distribuisce le edge function.** Il
Publish → Update aggiorna quello che gira nel browser; le funzioni restano alla
versione distribuita l'ultima volta, e il frontend nuovo finisce a parlare con
la funzione vecchia. Non c'è nessun errore: c'è un parametro ignorato, o
un'azione che risponde «non valida».

È già successo due volte, alla 2.9.0 e alla 3.0.0, e la seconda perché la nota
di rilascio della prima non era stata riletta.

Perciò, quando il diff di una versione contiene `supabase/functions/`:

1. si allinea `main` e si pubblica il frontend;
2. **si distribuiscono le funzioni cambiate**, con la CLI Supabase o chiedendo
   all'agente Lovable un deploy **senza modificare nessun file** — l'agente,
   lasciato libero, rigenera `src/integrations/supabase/client.ts` e
   `src/lib/previewAuthStorage.ts` e fa fallire la CI;
3. **si verifica dalla produzione con una chiamata propria.** Che il deploy
   dichiari di essere riuscito non è una verifica: la verifica è la risposta
   della funzione.
4. **si controlla che il repository sia intatto** (`git fetch` e confronto con
   il commit atteso), perché il passo 2 gira su `main`.

Il passo 3 va scritto nella nota di rilascio con il suo esito, non con la sua
intenzione.

Le note di rilascio non si generano dai commit: lo storico Git di questo
repository è pieno di messaggi automatici di Lovable intitolati "Changes", e
generare da lì produrrebbe un racconto che non aiuta nessuno.

## Verifiche

```bash
bun install --frozen-lockfile   # come in CI
bun run verify                  # gli stessi anelli del job quality
bun run test:e2e                # come il job e2e
bun audit                       # deve dire "No vulnerabilities found"
bun outdated                    # atteso: solo typescript, per la ragione sopra
```

## Riferimenti

- Test, guardiani e checklist di consegna: [`verification-and-change-management.md`](verification-and-change-management.md).
- Convenzioni di codice e di prodotto: [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md).
