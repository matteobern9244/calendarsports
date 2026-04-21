# Calendar Events

Applicazione web di eventi sportivi e streaming multi-sezione per
consultare eventi imminenti, calendari e classifiche di Jannik Sinner,
Juventus, Formula 1 e MotoGP, oltre a palinsesti TV serali e nuove uscite
sui principali provider streaming.

Versione repository corrente: `2.1.0` (release di rebrand da "Calendar
Sports" a "Calendar Events"). Il footer dell'app mostra la versione
corrente leggendola da `src/lib/version.ts`.

## Origine del progetto

Questo repository nasce da un progetto creato inizialmente con **Lovable** e poi
evoluto localmente in GitHub e IDE.

Punti operativi da tenere presenti:

- il codice e' tuo e puo' essere modificato liberamente;
- il progetto mantiene pero' un contesto operativo legato a Lovable e a
  Supabase;
- il branch `main` va trattato come **branch sensibile** perche', in base alla
  documentazione Lovable, il sync GitHub <-> Lovable avviene sul branch di
  default;
- il deploy in produzione **non** e' automatizzato da questo repository e resta
  una scelta manuale da eseguire in Lovable.

Per questo motivo la documentazione di questo repo evita istruzioni che
incoraggino push automatici o superficiali su `main`.

## Release baseline

La baseline documentata del repository e' la release `2.1.0` (release di
rebrand). Le release storiche `2.0.0`, `2.0.1`, `2.0.2` restano archiviate
nel `changelog.md`.

Questa release rappresenta il punto in cui sono stati allineati:

- cleanup del versionamento dei file ambiente;
- workflow GitHub Actions per `develop` e per le PR verso `main`;
- test locali e CI piu' ripetibili;
- documentazione operativa coerente con il rischio GitHub <-> Lovable;
- fix del caricamento dati nel bundle di produzione (wrapper Supabase con
  fallback hardcoded sui valori pubblici);
- ErrorBoundary globale e regola ESLint che blocca import diretti dal client
  Supabase auto-generato;
- hook pre-commit `husky` + `lint-staged` per bloccare violazioni in locale.

La release `2.1.0` (rebrand) descrive lo stato del repository e delle
sue policy operative. Non implica, da sola, che una corrispondente
versione live sia gia' stata pubblicata su Lovable.

## Cosa fa l'app

L'app espone sei viste principali:

- `Home`: aggrega i prossimi eventi rilevanti da tutte le sezioni e include
  il banner **Stasera in TV** con aggregazione multi-famiglia ordinata
  RAI -> Mediaset -> Sky Sport -> Sky Cinema -> Discovery, filtri rapidi
  per famiglia (`ToggleGroup` responsive), un programma per canale nella
  fascia di **prima serata (dalle 21:00 in poi)** e paginazione interna
  alla scheda (8 canali per pagina).
- `Streaming` (`/streaming`): tab TV stasera (palinsesto reale per famiglia)
  + tab Nuove uscite (TMDB con range date e filtro Film/Serie). Le "Nuove
  uscite" si basano su TMDB Discover filtrato per `primary_release_date`
  (film) / `first_air_date` (serie) e `with_watch_providers` regione `IT`:
  e' la **data di prima pubblicazione mondiale**, non la data di ingresso
  sulla piattaforma in Italia (TMDB non espone quel campo su Discover). I
  range UI sono "Prossimi 7 giorni", "Prossimi 30 giorni" (default) e
  "Finestra estesa" (-30 / +60 giorni). Quando la finestra richiesta e'
  vuota, l'edge function `streaming-releases` allarga automaticamente il
  range (`-14` / `+30` giorni) ed espone `widenedWindow: true` nel payload,
  cosi' l'UI puo' segnalarlo all'utente.
- `Jannik Sinner`: profilo sintetico, risultati e calendario tornei.
- `Juventus`: calendario partite e classifica Serie A.
- `Formula 1`: calendario GP, classifica piloti e costruttori.
- `MotoGP`: calendario weekend, classifica piloti e costruttori.

Funzionalita' trasversali:

- tema light/dark;
- sincronizzazione client-side tramite invalidazione delle query;
- selezione stagione per ogni sezione;
- UI costruita con componenti shadcn/ui e Radix;
- responsive completo (mobile/tablet/desktop) sui banner Home;
- **card eventi premium** con bordo gold sottile, hover lift, top accent
  line e glow radiale gold soft (vedi `src/components/common/EventCard.tsx`),
  riutilizzate in Home, Sinner, F1 e MotoGP; le card custom partite di
  Juventus replicano lo stesso trattamento per coerenza visiva;
- **countdown live al prossimo evento** dentro ogni card sportiva
  (`src/components/common/EventCountdown.tsx`), aggiornato ogni secondo,
  con badge "Inizio imminente" entro una finestra di ±3 ore dall'inizio;
  non viene renderizzato sugli eventi gia' completati;
- **highlight del prossimo evento in assoluto** nella Home: la prima card
  di "Prossimi Eventi" (lista ordinata cronologicamente) riceve bordo gold
  pieno + ring + badge "Prossimo" sopra la card. Le pagine sport
  evidenziano analogamente la prima card upcoming via la utility
  `prioritizeNextUpcoming` in `src/lib/dateUtils.ts`;
- **glow pulsante gold** sull'icona della voce di navigazione attiva
  (`Header.tsx`), sincronizzato con il loop di scintille (`SparkleLoop`);
- **layout responsive a 2 righe** della scheda "Stasera in TV" su
  mobile (`src/components/home/TonightTvList.tsx`): in viewport ≤640px
  ogni riga di programma e' divisa su due livelli (riga 1: ora + canale
  + durata; riga 2: titolo + genere) per garantire la leggibilita' dei
  titoli lunghi; layout desktop a singola riga invariato;
- **icona PWA dedicata** (`public/favicon.png`, 1024x1024) usata sia
  come favicon che come icona installabile dal manifest
  (`public/manifest.webmanifest`, `purpose: any` + `maskable`):
  calendario gold su sfondo navy coerente col brand, sostituisce
  l'icona generica del browser quando l'app viene aggiunta alla home
  su iOS/Android.

### Streaming: fonte dati TV

Il palinsesto reale viene scraperato da `www.staseraintv.com` (pubblico).
**Fragile per definizione**: se la fonte cambia struttura HTML, il parser
si rompe e i programmi diventano vuoti (mai dati inventati).

Nella scheda "Stasera in TV" della Home ogni riga mostra:

- orario di inizio e badge canale,
- titolo del programma,
- piccolo badge **genere** (Fiction, Film, Sport, Show, ecc.) **solo quando
  la fonte lo espone** in chiaro (parentesi finale del titolo nei blocchi
  scheda di staseraintv.com),
- **durata** del programma calcolata da `start`/`end` nel formato
  `45 min` o `1h 25 min` (mostrata sempre quando la durata e' valida).

#### Copertura palinsesti per canale (audit verificato 2026-04-19)

Tutti gli slug attivi sono stati validati con `curl` contro
`staseraintv.com` e ritornano almeno 12 righe `HH:MM` per giorno:

| Famiglia | Coperti | Non coperti |
| --- | --- | --- |
| **RAI** | Rai 1, 2, 3, 4, 5, Movie, Premium, Gulp, YoYo, Storia, Scuola, Sport +HD | — |
| **Mediaset** | Canale 5, Italia 1, Italia 2, Rete 4, Iris, 20, La5, Cine34, Boing, Cartoonito, Top Crime, Focus, Mediaset Extra | — |
| **Sky Cinema** | Uno, Collection, Family, Action, Romance | Due, Suspense, Drama, Comedy |
| **Discovery** | Real Time, DMax, Nove, Discovery Channel, Discovery Turbo, Food Network, HGTV, Giallo, K2, Frisbee | — |
| **Sport** | **Sportitalia** (canale 60 DTT, palinsesto sport reale) | Tutti i canali Sky Sport branded (Uno, Calcio, Tennis, F1, MotoGP, Arena, Football, Action, Golf, Max, 24) |

I canali Sky Sport branded restano elencati nella whitelist con
`programs=[]`: la UI dichiara onestamente "Palinsesto non disponibile". E'
stato verificato che nessuna fonte pubblica HTML statica li espone in
modo parsabile lato server (`staseraintv.com` ritorna 404 su tutti gli
slug `sky_sport_*`; `guidatv.sky.it`/`programmi.sky.it` usano rendering
client-side; `tvzap.kataweb.it` e' protetto da Cloudflare).

## Stack tecnico reale

- `React 18`
- `Vite`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Radix UI`
- `@tanstack/react-query`
- `react-router-dom` con `BrowserRouter`
- `Supabase Edge Functions`
- `Vitest` e `Playwright` presenti nel progetto, ma con copertura attuale minima

Il profilo tecnologico coincide con quanto Lovable dichiara come stack standard
per i progetti exportati: React + Vite + TypeScript + Tailwind +
shadcn/ui/Radix.

## Architettura ad alto livello

### Frontend

Il frontend e' una SPA Vite servita staticamente.

File di riferimento:

- [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx)
- [src/pages/Index.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Index.tsx)
- [src/pages/SinnerPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/SinnerPage.tsx)
- [src/pages/JuventusPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/JuventusPage.tsx)
- [src/pages/Formula1Page.tsx](/Users/matteobernardini/code/calendarsports/src/pages/Formula1Page.tsx)
- [src/pages/MotoGPPage.tsx](/Users/matteobernardini/code/calendarsports/src/pages/MotoGPPage.tsx)

### Accesso ai dati lato client

Il frontend non chiama direttamente le fonti esterne. Passa da:

- [src/lib/api/sportsApi.ts](/Users/matteobernardini/code/calendarsports/src/lib/api/sportsApi.ts)
- [src/hooks/useSportsData.ts](/Users/matteobernardini/code/calendarsports/src/hooks/useSportsData.ts)

Le richieste browser puntano alle Edge Functions Supabase via:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Backend leggero

Le integrazioni esterne stanno nelle funzioni dentro
[supabase/functions](/Users/matteobernardini/code/calendarsports/supabase/functions):

- `sports-f1`
- `sports-football`
- `sports-tennis`
- `sports-motogp`

Queste funzioni si occupano di:

- interrogare API pubbliche;
- fare scraping di provider esterni;
- applicare mapping statici e fallback;
- uniformare il payload verso il frontend.

## Fonti dati e affidabilita'

Questo progetto **non** usa una sola fonte dati omogenea. Usa un mix di API,
scraping e dati statici. Va documentato e mantenuto come tale.

### Formula 1

Fonti correnti:

- Jolpica / Ergast-compatible API per calendario e standings;
- OpenF1 per headshot dei piloti;
- mapping statici di fallback per foto piloti e loghi costruttori.

Rischi:

- i campi disponibili possono cambiare lato provider;
- OpenF1 non garantisce copertura completa di tutti i piloti;
- i fallback statici richiedono manutenzione stagionale.

### Juventus

Fonti correnti:

- widget e pagine Sky Sport per calendario e classifica;
- API Lega Serie A per le informazioni broadcaster;
- merge applicativo tra Serie A, Champions League e Coppa Italia.

Rischi:

- scraping fragile rispetto a cambi HTML o widget;
- dipendenza da competition ID e season ID esterni;
- eventuali cambi strutturali sui siti Sky o Lega possono rompere la feature.

### Jannik Sinner

Fonti correnti:

- dati statici codificati nella Edge Function `sports-tennis`;
- il codice dichiara come fonte concettuale ATP Tour / Wikipedia, ma il runtime
  attuale usa dataset statici 2026.

Rischi:

- forte rischio di obsolescenza;
- manutenzione manuale a ogni nuova stagione;
- nessun refresh automatico da API ufficiale.

### MotoGP

Fonti correnti:

- calendario statico 2026;
- scraping Sky Sport per standings;
- mapping statici per foto piloti e loghi team o costruttori.

Rischi:

- calendario hardcoded soggetto a drift;
- scraping standings fragile;
- mapping statici da aggiornare in caso di roster o team changes.

## Setup locale

### Prerequisiti

- Node.js 20+ raccomandato
- npm disponibile
- progetto Supabase valido se vuoi usare le Edge Functions reali collegate

Il repository contiene anche `bun.lock` e `bun.lockb`, ma i comandi
ufficialmente presenti in `package.json` sono npm-based.

### Installazione

```bash
npm install
```

### Variabili ambiente

Per il frontend servono queste variabili:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Nel repository era presente anche una `.env` reale con chiavi di progetto.
Trattala come materiale da rimuovere dal versionamento e ruotare se necessario.
Usa invece `.env.local` o `.env` locale non tracciata e prendi come base
[.env.example](/Users/matteobernardini/code/calendarsports/.env.example).

Variabili aggiuntive non-Vite:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Nel codice frontend oggi vengono lette direttamente solo le variabili `VITE_*`;
le variabili non-Vite sono comunque mantenute nell'esempio per coerenza con il
setup Supabase e Lovable esistente.

### Avvio locale

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm run test
```

### End-to-end test

```bash
npm run test:e2e
```

### Test in watch

```bash
npm run test:watch
```

## Supabase e funzioni edge

Le funzioni edge sono sotto
[supabase/functions](/Users/matteobernardini/code/calendarsports/supabase/functions).

Punti chiave:

- il frontend costruisce URL del tipo
  `https://<project>.supabase.co/functions/v1/<function>?...`;
- le chiamate includono `Authorization: Bearer <anon-key>` e `apikey`;
- le funzioni rispondono in JSON con forma `success/data` o `success/error`;
- ogni funzione incapsula logica di fetch, scraping, fallback e rate limiting
  basilare.

### Import del client Supabase nel frontend

Per qualunque uso del client Supabase JS SDK (auth, realtime,
`functions.invoke`, storage, query DB) importa sempre da
`@/lib/supabaseClient`, non da `@/integrations/supabase/client`.

Il file `src/integrations/supabase/client.ts` e' auto-generato e read-only,
e legge `import.meta.env.VITE_SUPABASE_URL` /
`VITE_SUPABASE_PUBLISHABLE_KEY` direttamente. In alcuni build di produzione
queste variabili non vengono iniettate nel bundle: il client viene quindi
creato con `URL = undefined` e le richieste finiscono su
`https://<host>/undefined/functions/v1/...` (fallback HTML 200, mai JSON,
React Query in loading infinito).

`src/lib/supabaseClient.ts` ricrea il client usando le stesse variabili
con fallback hardcoded sui valori pubblici (project URL e anon key),
garantendo che funzioni in qualunque build. Esporta inoltre
`SUPABASE_PROJECT_URL` e `SUPABASE_ANON_KEY` per chiamate `fetch` manuali
verso le edge functions (gia' usate da `src/lib/api/sportsApi.ts`).

```ts
// OK
import { supabase } from "@/lib/supabaseClient";

// Da evitare nei nuovi import
import { supabase } from "@/integrations/supabase/client";
```

Il repo non contiene una documentazione operativa completa per sviluppo edge
locale. In pratica oggi il percorso piu' lineare e':

1. usare un progetto Supabase gia' configurato;
2. esporre nel frontend le variabili `VITE_SUPABASE_*`;
3. verificare che le Edge Functions corrispondenti siano deployate su quel
   progetto.

## GitHub, branch e relazione con Lovable

Questo e' il punto piu' sensibile del repository.

- Lovable sincronizza in modo bidirezionale e automatico sul branch di
  default del repo, che per questo progetto e' `main`.
- Ogni modifica fatta dall'editor Lovable produce un commit automatico su
  `main`. Lovable e' quindi l'unico canale autorizzato a scrivere
  direttamente su `main`.
- Gli sviluppatori umani non pushano mai direttamente su `main`. Lavorano su
  feature branch derivati da `develop`, aprono PR verso `develop` e arrivano
  su `main` solo tramite una PR separata `develop` -> `main`.
- Il deploy in produzione resta manuale da eseguire in Lovable
  (Publish -> Update).

Policy operativa corrente del repository:

- `main` accetta scritture solo da:
  - l'app GitHub di Lovable (sync automatico bidirezionale);
  - merge di pull request provenienti da `develop`.
- Su `main` non vanno fatti push diretti da utenti umani.
- La protezione di `main` deve essere gestita da una sola Ruleset moderna,
  senza una Branch protection classica attiva in parallelo.
- La Ruleset di `main` deve restare minimale e compatibile con il push diretto
  di Lovable: protegge da deletion e force-push, ma non deve imporre gate di
  PR o required checks che possano rigettare il sync automatico.
- Le PR verso `develop` e `main` devono avere `auto-merge` attivo con metodo
  `squash`, ma solo dopo esito positivo dei workflow PR pertinenti.
- Il workflow `guard-main-source.yml` blocca ogni PR verso `main` che non
  provenga da `develop` e non si applica ai push automatici di Lovable.
- Il workflow PR gira su PR verso `develop` e `main`; il workflow push gira
  solo su `develop`.
- Gli E2E usano fixture e mocking delle Edge Functions, quindi validano
  router, UI e shape dati senza dipendere dai provider esterni live.

### Configurazione GitHub finale su `main`

**Regola d'oro**: usare **una sola** fonte di protezione per `main`.

La configurazione finale richiesta del repository e':

- una sola Ruleset repository-level attiva su `main`, con target esatto
  `refs/heads/main`;
- bypass riservato alla sola app GitHub `lovable-dev` con `bypass mode`
  `Always`;
- branch rules attive: blocco deletion e blocco force-push;
- nessuna Branch protection classica attiva su `main`.

Non vanno attivati nella Ruleset:

- `required_linear_history`;
- `required_signatures`;
- `required_deployments`;
- code scanning come gate di merge su `main`;
- flag equivalenti a `Do not allow bypassing` o `Enforce for admins`.

#### Diagnostica errore "Push was rejected by branch protection rules"

Se Lovable mostra questo errore, controllare in ordine:

1. Esiste ancora una Branch protection classica attiva oltre alla Ruleset?
2. La Ruleset di `main` contiene per errore gate come `pull_request` o
  `required_status_checks` invece del solo set minimale compatibile con
  Lovable?
3. E' attivo qualche flag tipo `Do not allow bypassing` o `Enforce for
   admins`?

Risultato pratico:

- Lovable continua a pushare su `main` per il sync automatico.
- Gli umani contribuiscono via feature branch -> `develop`, poi via PR
  `develop` -> `main`.
- Le PR eleggibili si auto-fondono con `squash` solo dopo workflow PR verdi e
  guardrail soddisfatti.
- Il divieto di push diretto umano su `main` resta una regola operativa del
  repository, non un gate che deve interferire con il sync automatico di
  Lovable.

### Sync GitHub -> Lovable

- Il sync e' event-driven sul branch di default (`main`).
- Quando un commit arriva su `main` (sia da Lovable, sia da merge di PR
  umane), Lovable aggiorna automaticamente il progetto in editor.
- Non esiste un pulsante "Sync now": e' automatico.
- Se da locale non vedi i commit fatti da Lovable, esegui
  `git fetch --all --prune` e verifica `git log origin/main --oneline`.

Se cambi branch policy, default branch o integrazione GitHub in Lovable,
aggiorna immediatamente questa documentazione e `AGENTS.md`.

## GitHub Copilot nel repository

Il repository include una suite minima e conservativa per usare GitHub Copilot
senza introdurre una seconda policy indipendente rispetto a `AGENTS.md`.

Gerarchia operativa:

- `AGENTS.md`: fonte normativa primaria per agenti e assistenti AI.
- `.github/copilot-instructions.md`: istruzioni repository-wide compatte per
  Copilot.
- `.github/instructions/*.instructions.md`: istruzioni specifiche per path, per
  frontend, funzioni edge e documentazione.
- `.github/prompts/*.prompt.md`: prompt riusabili per onboarding, pianificazione,
  review rischi, refactor sicuro e aggiornamento documentale.
- `.vscode/settings.json`: abilita i prompt files nel workspace VS Code.

La suite Copilot non cambia workflow Git, branch policy, segreti, deploy o
integrazione Lovable. Serve solo a mantenere Copilot aderente ai vincoli gia'
documentati nel repository.

### Dependabot e auto-merge

- Dependabot apre i version updates verso `develop`, non verso `main`.
- Le PR Dependabot vengono assegnate a `@matteobern9244`.
- Gli aggiornamenti `npm` minor e patch sono raggruppati separatamente dalle
  major; le major hanno anche un cooldown di 30 giorni per ridurre rumore e
  churn sul ramo operativo.
- Gli aggiornamenti di `github-actions` vengono gestiti in PR dedicate verso
  `develop`.
- Se una PR Dependabot e' verde, il repository puo' mantenere il flag di
  `auto-merge` con metodo `squash`.
- Se GitHub Copilot lascia una review non `APPROVED` su una PR Dependabot,
  l'auto-merge viene disabilitato e la PR resta in attesa di decisione umana.
- Questa regola di blocco e' limitata alle PR create da `dependabot[bot]` e non
  altera il comportamento normale di auto-merge per le altre PR.
- Limite noto di GitHub: `target-branch` vale per i version updates; eventuali
  security updates di Dependabot continuano a usare il branch di default
  `main`.

## Routing e hosting SPA

L'app usa `BrowserRouter`. Di conseguenza, su hosting esterno, il server web
deve fare fallback a `index.html` per tutte le route applicative.

Questo e' coerente anche con la documentazione Lovable sui deploy esterni dei
progetti exportati.

## Stato attuale e limiti noti

- `README.md` originario generato da Lovable era incompleto.
- Il progetto usa fonti eterogenee e non sempre affidabili.
- Alcune sezioni sono parzialmente o totalmente hardcoded sulla stagione 2026.
- La copertura test reale e' quasi nulla: e' presente solo un test esempio.
- Il file `.env` era presente nel repo con valori reali.
- Il setup di deployment non e' descritto end-to-end in modo sufficiente.
- Puo' esistere drift tra stato del repository, ambiente Supabase collegato e
  versione live su Lovable.

## Miglioramenti raccomandati

- Rimuovere `.env` dal versionamento e sostituirlo operativamente con
  `.env.example` + `.env.local`.
- Valutare la rotazione delle chiavi gia' presenti nel file `.env` tracciato.
- Rafforzare i test almeno su trasformazioni dati delle Edge Functions,
  rendering delle pagine principali e regressioni di routing, theme e query
  invalidation.
- Formalizzare il workflow branch con branch di lavoro dedicati, review prima di
  merge e merge su `main` solo quando compatibile con il sync Lovable
  desiderato.
- Documentare meglio il flusso di deploy reale e lo stato delle Edge Functions
  deployate.

## File da leggere per orientarsi

- [src/App.tsx](/Users/matteobernardini/code/calendarsports/src/App.tsx)
- [src/lib/api/sportsApi.ts](/Users/matteobernardini/code/calendarsports/src/lib/api/sportsApi.ts)
- [src/hooks/useSportsData.ts](/Users/matteobernardini/code/calendarsports/src/hooks/useSportsData.ts)
- [supabase/functions/sports-f1/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/sports-f1/index.ts)
- [supabase/functions/sports-football/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/sports-football/index.ts)
- [supabase/functions/sports-tennis/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/sports-tennis/index.ts)
- [supabase/functions/sports-motogp/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/sports-motogp/index.ts)
- [supabase/functions/streaming-tv/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/streaming-tv/index.ts) (FRAGILE: scraping `staseraintv.com`, parser regex)
- [supabase/functions/streaming-releases/index.ts](/Users/matteobernardini/code/calendarsports/supabase/functions/streaming-releases/index.ts) (richiede secret `TMDB_API_KEY`)
