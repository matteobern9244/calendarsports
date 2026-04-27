# Calendar Events

Applicazione web di eventi sportivi e streaming multi-sezione per
consultare eventi imminenti, calendari e classifiche di Jannik Sinner,
Juventus, Formula 1 e MotoGP, oltre a palinsesti TV serali e nuove uscite
sui principali provider streaming.

Versione repository corrente: `2.2.0` (consolidamento UI/UX sopra la
baseline di rebrand `2.1.0`). Il footer dell'app mostra la versione
corrente leggendola da `src/lib/version.ts` nel formato `Calendar Events
· v2.2.0` (con `v` minuscola).

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

La baseline documentata del repository e' la release `2.2.0`, costruita
sopra la release di rebrand `2.1.0`. Le release storiche `2.0.0`, `2.0.1`,
`2.0.2` restano archiviate nel `changelog.md`.

La release `2.2.0` introduce solo miglioramenti UI/UX e helper di
presentazione: niente cambi di stack, fonti dati, schema payload edge
function, branch policy o policy Lovable. In particolare:

- timezone `Europe/Rome` ora applicato in modo uniforme a tutte le pagine
  sport (Sinner, Juventus, F1, MotoGP) tramite l'helper centralizzato
  `toRomeDate` di `src/lib/dateUtils.ts`;
- card "Stasera in TV" nella Home mostra anche l'orario di fine
  programma quando l'edge function `streaming-tv` espone `endTime`
  esplicito;
- sezione "Risultati" di Jannik Sinner paginata a esattamente 4 card per
  pagina, con stato `Caricamento risultati…` durante il cambio pagina e
  prefetch React Query della pagina `N+1` per uno scorrimento istantaneo;
- pagina Juventus con loading gate full-page che attende calendario,
  classifica e — quando necessario — il fetch della pagina contenente la
  prossima partita prima di renderizzare il contenuto, eliminando lo
  sfarfallio iniziale.

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
  + tab "Nuove uscite". All'atterraggio sulla pagina la famiglia TV
  selezionata di default e' **RAI** (override via `?family=...`). La tab
  "Nuove uscite" propone due viste:
  1. **Catalogo Italia** (default, ispirata a starflicks.it). Edge action
     `streaming-releases?action=new-italy`. TMDB Discover region `IT` con
     `with_watch_monetization_types=flatrate|free|ads`, senza vincolo
     provider in upfront. Filtri: provider (Tutti / Netflix / Prime /
     Disney+ / HBO Max), kind (Film/Serie/Tutti), genere TMDB IT (15
     generi principali), ordinamento (data uscita / popolarità). Ogni
     titolo è arricchito con generi italiani (`/genre/{movie|tv}/list`,
     cache 24h), `availableProviders` con logo (`/watch/providers` IT,
     cache 1h) e `justWatchLink` (`results.IT.link`).
  2. **Per provider**. Edge action `new-today` (logica precedente):
     Discover con `with_watch_providers=<provider>` +
     `with_watch_monetization_types=flatrate`, validato 1-a-1 su
     `/watch/providers` `results.IT.flatrate`. Mantiene il fallback
     "widened window" (`-14` / `+30` giorni) e `widenedWindow: true` nel
     payload.

  Il dialog dettaglio uscita usa la action `details` (one-shot,
  `append_to_response=credits,watch/providers,videos`) e mostra:
  generi IT, regista o creators, runtime o stagioni, **box "Disponibile
  su (Italia)"** con loghi e badge "Gratis"/"Con pubblicità", **trailer
  YouTube embed** quando presente, cast top 10, CTA "Vedi dove è
  disponibile" che apre la pagina JustWatch IT del titolo.

  Le uscite restano basate su `primary_release_date` /
  `first_air_date` TMDB (data di prima pubblicazione mondiale, non
  ingresso sulla singola piattaforma in IT): la striscia provider sotto
  la card chiarisce dove il titolo è già disponibile in Italia oggi.
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

Pagina dettaglio partita (`/juventus/partite/:matchId`):

- mostra solo dati realmente disponibili dal payload Sky/Lega del calendario
  (data e ora in `Europe/Rome`, competizione, broadcaster, score finale,
  link Sky alla pagina partita);
- formazioni, modulo tattico e cronologia eventi (gol, ammonizioni,
  sostituzioni) **non sono esposti** dalle API pubbliche gratuite (Sky,
  Lega Serie A, TheSportsDB free): i tab corrispondenti dichiarano
  esplicitamente l'indisponibilità e rimandano alla pagina Sky reale via
  CTA "Apri su Sky Sport". Nessun dato finto o mock, in linea con la
  policy `no hardcoded`.

### Highlights video (Juventus, F1, MotoGP)

Le tab "Highlights" su `/juventus`, `/formula1` e `/motogp` sono alimentate
dai **feed RSS pubblici** delle 3 playlist YouTube ufficiali, esposti
dall'edge function `supabase/functions/highlights-youtube`:

- Juventus → `PLamQuNkRTV0eQ-UiYDCuz_WUHOlri1BY3` (canale ufficiale Juventus).
- Formula 1 → `PLZbcTUGG8ELs188DCvpKMVFsnia-uB3j8` (Sky Sport F1).
- MotoGP → `PLMgcIchslSqgqxtkUg4iiqc1UL8u8uFey` (Sky Sport MotoGP).

Per ogni video vengono estratti dati **reali** dal feed: `videoId`, `title`,
`publishedAt` (ISO 8601), `source` (nome canale dal `<author>`) e thumbnail
deterministica `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`. Il client
li consuma via hook `useHighlights(sport, limit)` con `staleTime` 10 minuti;
l'edge function aggiunge `Cache-Control: public, max-age=600`.

Vantaggi:

- nessuna API key richiesta (RSS pubblico);
- nessun dato hardcoded: titoli, date e link cambiano solo se cambia la
  playlist YouTube ufficiale.

Rischi:

- se una delle 3 playlist viene cancellata o resa privata, il feed ritorna
  vuoto e la sezione mostra uno stato vuoto onesto (nessun crash);
- breaking change sulla struttura RSS YouTube comporterebbe parsing vuoto
  con stesso fallback;
- limiti di rate side-YouTube su traffico molto alto sono mitigati dalla
  cache HTTP 10 minuti lato edge.

### Jannik Sinner

Fonti correnti:

- **scraping Wikipedia su due lingue** in `sports-tennis`:
  - `it.wikipedia.org/wiki/Jannik_Sinner` per il **profilo**: ranking
    corrente, miglior ranking, vittorie/sconfitte e titoli di carriera
    (singolare), altezza, peso, palmarès Grande Slam (AO, Roland Garros,
    Wimbledon, US Open, Tour Finals), foto principale Wikimedia Commons
    e data "Statistiche aggiornate al ...".
  - `en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season` per la
    **stagione 2026**: record stagione, titoli calendar, calendario tornei
    e match round-per-round con opponent rank, score ed esito.
- cache server-side 30 minuti per rispetto fair use Wikipedia.
- ATPTour.com è stato valutato e scartato: è una SPA che richiede browser
  rendering, quindi non scrapabile da Edge Function `fetch()`.

Rischi:

- doppia fonte (IT profilo + EN stagione) = doppia superficie di rottura;
- la voce stagione 2026 IT non esiste in modo stabile, quindi il
  calendario/match restano in inglese;
- coach e mano di gioco non sono nell'infobox IT: estratti da regex sul
  testo, in caso di fallimento il campo sparisce dalla UI invece di
  rompere;
- latenza editoriale Wikipedia (24-48h dopo i match);
- fragilità del parser regex se Wikipedia cambia struttura tabelle;
- stagioni precedenti al 2026 non popolate (richiedono URL aggiuntivi);
- foto profilo hot-linkata da Wikimedia Commons (URL stabile, licenza
  libera, ma soggetta a cambi raro caso di rinomina file).

### MotoGP

Fonti correnti:

- **calendario live via API ufficiale motogp.com (Pulselive)**:
  `https://api.motogp.pulselive.com/motogp/v1/results/seasons` per
  risolvere lo `seasonUuid` della stagione corrente (cache 24h),
  `/results/events?seasonUuid=...` per i singoli eventi. Filtro
  `test === false` esclude le sessioni di test, i nomi GP vengono
  italianizzati via mappa interna;
- scraping Sky Sport per standings piloti e team
  (`https://sport.sky.it/motogp/classifiche`);
- mapping statici per foto piloti, numeri, nazionalità e loghi team o
  costruttori (enrichment non disponibile dall'API).

Rischi:

- API Pulselive non documentata pubblicamente: shape può cambiare senza
  preavviso. Su errore upstream l'edge function ritorna
  `dataSource: 'static-fallback'` con `data: []` (nessun calendario
  hardcoded di backup, scelta esplicita);
- scraping standings Sky fragile;
- mapping statici (foto, numeri, loghi) da aggiornare in caso di roster
  o team changes.

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

### Controllo lingua UI italiana

```bash
npm run check:italian
```

Lo script `scripts/check-italian-ui.mjs` analizza `src/` (escluse cartelle
UI shadcn rigenerabili e file di test) e fallisce se trova stringhe utente
in inglese fuori allowlist. Le uniche eccezioni autorizzate sono i token
`STREAMING` (sezione) e `CALENDAR EVENTS` (nome app). Il controllo gira
anche nei workflow CI `ci-develop` e `ci-pr-main`.

Superfici analizzate: testo JSX, attributi `aria-label`,
`aria-description`, `aria-describedby`, `aria-roledescription`,
`aria-valuetext`, `placeholder`, `title`, `alt`, prop `subtitle` e
`description`, primo argomento dei `toast(...)`/`toast.success(...)`/
`toast.error(...)`/`toast.info(...)`/`toast.warning(...)`/
`toast.loading(...)` e assegnazioni `document.title = "..."`.

Titoli pagina e titoli modali hanno copertura dedicata con messaggi di
errore espliciti:

- `document.title = "..."` e `document.title = \`...\`` (template literal,
  parte statica): segnalati come `TITOLO PAGINA (document.title)`.
- contenuto di `<DialogTitle>`, `<AlertDialogTitle>`, `<SheetTitle>`,
  `<DrawerTitle>`, `<SidebarTitle>`: segnalato come
  `TITOLO MODALE (<TagName>)`.
- prop `title="..."` su qualunque componente il cui nome contiene
  `Dialog`, `Modal`, `Sheet` o `Drawer` (es. `<ConfirmDialog title="...">`):
  segnalata come `TITOLO MODALE (prop title su <TagName>)`.

Marker per skip mirato (usare con parsimonia, motivare in changelog):

- `// @lingua-ignore` a fine riga: salta la singola riga
  (utile per testo dinamico o stringhe che il regex non riesce a
  parsare correttamente).
- `// @lingua-ignore-file` o `/* @lingua-ignore-file */` in testa al
  file: salta l'intero file (riservato a file con molte stringhe
  legittime non in allowlist, es. dataset di nomi propri).

Esempio:

```tsx
<span aria-label="Loading skeleton placeholder">…</span> // @lingua-ignore
```

Per eccezioni stabili (nuovo brand, nuova sigla tecnica) preferire
l'aggiornamento di `ALLOWLIST_WORDS` in `scripts/check-italian-ui.mjs`,
dichiarando il motivo nel `changelog.md`.

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

## Performance immagini

Tutti gli asset binari in `public/` sono stati ricompressi (JPEG q85 progressive,
PNG palette + zlib max). **Nessuna immagine viene mai sostituita o ridisegnata**:
stessi pixel, stesse dimensioni, stesso aspetto visivo. Verifica QA: scarto
medio RGB <3 su 128×128 sample (impercettibile a occhio).

- `index.html` include `preconnect` per `flagcdn.com`, `i.ytimg.com`,
  `image.tmdb.org` e l'host Supabase, e `preload` del logo header con
  `fetchpriority=high` (LCP).
- Tutti i tag `<img>` espongono `loading`, `decoding="async"` e `width`/`height`
  espliciti per evitare CLS. LCP critici (logo header, foto Sinner) usano
  `loading="eager"` + `fetchpriority="high"`.
- Le thumbnail YouTube degli highlights sono richieste come `mqdefault.jpg`
  (320×180) con `srcSet` 2x → `hqdefault.jpg` per display retina.
- I poster TMDB sono richiesti come `w342` (sufficiente per card e dialog,
  anche su retina). `normalizeItem` in `streaming-releases` normalizza
  eventuali `w500`/`w780`/`original` su `w342` come difesa contro regressioni.

Per ricomprimere nuovi asset aggiunti al repo, usare lo stesso criterio:
JPEG quality 85 progressive con strip metadata, PNG con palette adattiva +
`compress_level=9`, e verificare che le dimensioni in pixel restino invariate.

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
