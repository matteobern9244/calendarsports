# Architettura

Documento sintetico dell'architettura di **Calendar Events v2.10.0**.

Fonte di verità per questo documento: `src/App.tsx`, `src/hooks/`,
`src/lib/api/sportsApi.ts` e `supabase/migrations/*`. Quando il codice e questo
file divergono, vince il codice: aggiornare qui.

## Diagramma generale

```text
┌──────────────────────────────────────────────────────────────┐
│  Browser — SPA React 19 + Vite 8, installabile come PWA       │
│                                                               │
│  ErrorBoundary › QueryClientProvider › TooltipProvider ›       │
│    Toaster · Sonner · BrowserRouter › Routes › Layout          │
│                                                               │
│  React Query  ──▶  sportsApi  ──▶  fetch con retry 502/503/504 │
│  React Query  ──▶  supabase.from("profiles")  (solo preferenze) │
│  countdownClock (un timer per tutta l'app)                     │
│  service worker: notifiche push + cache offline di documento,  │
│                  asset con hash e font ospitati               │
└────────────────────────────┬──────────────────────────────────┘
                             │  HTTPS, anon key
┌────────────────────────────▼──────────────────────────────────┐
│  Supabase Edge Functions (Deno)                               │
│  sports-f1 · sports-football · sports-motogp · sports-tennis  │
│  streaming-tv · streaming-releases · highlights-youtube        │
│  push-subscribe · push-vapid-key · push-dispatcher             │
│  _shared/security.ts: CORS + rate limit                        │
│  _shared/serieATeams.ts: le venti squadre, copia di src/lib/    │
└──────┬─────────────────────────────────────┬──────────────────┘
       │                                      │
┌──────▼──────────────────┐        ┌──────────▼─────────────────┐
│ Postgres                │        │ Terze parti                │
│ push_subscriptions      │        │ Jolpica · OpenF1 · Sky     │
│ push_sent_log           │        │ Lega Serie A · Pulselive   │
│ profiles  (RLS: la tua) │        │ Wikipedia · TMDB · YouTube │
│ Supabase Auth           │        │ Google · Apple (accesso)   │
│ pg_cron ogni 5 min      │        │                            │
└─────────────────────────┘        └────────────────────────────┘
```

Il punto da tenere a mente: **il database non contiene eventi sportivi**. Ospita
le iscrizioni alle notifiche push, il registro degli invii e — dalla 2.10.0 — le
preferenze degli utenti registrati. Tutto il resto è effimero, recuperato a ogni
richiesta e tenuto in cache per pochi minuti nella memoria dell'isolate che
serve la funzione.

Una sola tabella si raggiunge dal browser: `profiles`, protetta da RLS sulla
riga di chi è collegato. Alle altre due arrivano soltanto le edge function con
la service role key.

## Organizzazione di `src/`

```text
src/
├── pages/          una pagina per route, export default
├── components/
│   ├── common/     riusabili fra pagine (stati di errore, card, countdown)
│   ├── home/       scheda "Stasera in TV"
│   ├── layout/     Header, Layout, indicatore offline
│   ├── streaming/  dialog dettaglio, badge conto alla rovescia
│   ├── sinner/ highlights/ preferences/
│   └── ui/         generati dalla CLI shadcn — non editare
├── hooks/          useSportsData, useStreamingData, useSyncAll, useNow, ...
├── lib/            logica pura: dateUtils, currentSeason, countdownClock,
│                   serieATeams (le venti squadre), queryKeys,
│                   queryPlaceholder, api/sportsApi, supabaseClient,
│                   pushClient
├── contexts/       sessione (AuthContext), preferenze utente
│                   (UserPrefsContext), pannello preferenze
└── integrations/   types.ts generato da Supabase
```

## Route

Tutte figlie di `Layout`, tranne il catch-all.

| Path                                  | Componente                           |
| ------------------------------------- | ------------------------------------ |
| `/`                                   | `Index`                              |
| `/calendario`                         | `CalendarPage`                       |
| `/streaming`                          | `StreamingPage`                      |
| `/sinner`                             | `SinnerPage`                         |
| `/squadra/:teamSlug`                  | `TeamPage`                           |
| `/squadra/:teamSlug/partite/:matchId` | `TeamMatchPage`                      |
| `/juventus`                           | redirect a `/squadra/juventus`       |
| `/juventus/partite/:matchId`          | redirect al ramo `/squadra/juventus` |
| `/formula1`                           | `Formula1Page`                       |
| `/motogp`                             | `MotoGPPage`                         |
| `/preferenze`                         | `PreferencesPage`                    |
| `/accedi`                             | `AuthPage`                           |
| `/reimposta-password`                 | `ResetPasswordPage`                  |
| `*`                                   | `NotFound`                           |

Routing dichiarativo con react-router 8: nessun data router, nessun loader.

## Hook di dati e chiavi di cache

Ogni hook è un involucro sottile su React Query. La chiave è la sua identità: due
punti che leggono la stessa cosa con chiavi diverse non condividono niente, e un
prefetch scritto con una chiave sbagliata viene semplicemente buttato.

| Hook                                                         | Chiave                                                                       | Azione                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------- |
| `useF1Calendar(season)`                                      | `["f1","calendar",season]`                                                   | `sports-f1?action=calendar`              |
| `useF1DriverStandings(season)`                               | `["f1","driver-standings",season]`                                           | `driver-standings`                       |
| `useF1ConstructorStandings(season)`                          | `["f1","constructor-standings",season]`                                      | `constructor-standings`                  |
| `useF1NextRace()`                                            | `["f1","next-race"]`                                                         | `next-race`                              |
| `useSerieAStandings(season)`                                 | `["juventus","standings",season]`                                            | `sports-football?action=standings`       |
| `useJuventusCalendar(team,season,page?,pageSize?,upcoming?)` | `["juventus","calendar",team,season,upcomingOnly,page??null,pageSize??null]` | `calendar`                               |
| `useJuventusInfo(team,season)`                               | `["juventus","info",team,season]`                                            | `info`                                   |
| `useSinnerInfo()`                                            | `["sinner","info"]`                                                          | `sports-tennis?action=player-info`       |
| `useSinnerNextEvent()`                                       | `["sinner","next-event"]`                                                    | `next-event`                             |
| `useSinnerSchedule(season)`                                  | `["sinner","schedule",season]`                                               | `schedule`                               |
| `useSinnerResults(season,page?,pageSize?)`                   | `["sinner","results",season,page??null,pageSize??null]`                      | `results`                                |
| `useMotoGPCalendar(season)`                                  | `["motogp","calendar",season]`                                               | `sports-motogp?action=calendar`          |
| `useMotoGPNextEvent()`                                       | `["motogp","next-event"]`                                                    | `next-event`                             |
| `useMotoGPStandings(season)`                                 | `["motogp","standings",season]`                                              | `standings`                              |
| `useMotoGPConstructorStandings(season)`                      | `["motogp","constructor-standings",season]`                                  | `constructor-standings`                  |
| `useHighlights(sport,limit)`                                 | `["highlights",sport,limit]`                                                 | `highlights-youtube`                     |
| `useTvByFamily(family)`                                      | `["streaming-tv",family]`                                                    | `streaming-tv?action=prime-time`         |
| `useReleasesItaly(opts)`                                     | `["streaming-releases-italy",provider,kind,from,to,sort,genreId]`            | `streaming-releases?action=new-italy`    |
| `useReleaseDetails(type,id)`                                 | `["streaming-release-details",type,id]`                                      | `details`                                |
| `useProfile()`                                               | `["profile",userId]`                                                         | **nessuna**: `supabase.from("profiles")` |

`useJuventusCalendar` chiamata **senza** `page` e `pageSize` restituisce l'intera
stagione: è la forma che usano la Home e il dettaglio partita, e condividono la
stessa voce di cache.

Tre cose di quelle chiavi non sono cosmetiche:

- **`team` viene prima di `season` e non è opzionale.** Una chiamata che lo
  dimenticasse non condividerebbe la cache fra squadre in silenzio: non
  compilerebbe.
- **`page` e `pageSize` stanno in coda.** Tutto ciò che identifica la _lista_
  viene prima, così una pagina si riconosce dal prefisso: è come
  `keepPreviousPageOf` (`src/lib/queryPlaceholder.ts`) distingue «un'altra
  pagina» da «un'altra squadra». `placeholderData: (prev) => prev` è vietato
  proprio perché quella distinzione non la sa fare.
- **`standings` non prende la squadra**, perché il payload è identico per tutte
  e venti: metterla nella chiave moltiplicherebbe le stesse righe per venti e
  farebbe ricominciare da un caricamento a ogni cambio squadra.

Il namespace si chiama ancora `juventus` di proposito: è un pezzo di chiave di
cache, e rinominarlo invalida tutto ciò che è in memoria. La rinomina in
`football` è un commit a sé.

`useProfile` è l'unico hook che **non** passa da una edge function: legge e
scrive `profiles` direttamente, con la sessione dell'utente, e le sue mutation
aggiornano la cache **in anticipo sul server** (`onMutate`), perché
`UserPrefsContext` legge il profilo prima del valore locale.

## Schema database

Tre tabelle, con **due regimi diversi**.

`push_subscriptions` e `push_sent_log` hanno RLS attiva e nessuna policy
permissiva: i ruoli `anon` e `authenticated` non le vedono affatto, ci arrivano
solo le edge function con la service role key.

`profiles` invece è fatta per essere letta e scritta dal browser, ma **solo la
propria riga**: quattro policy, una per operazione, tutte per il solo ruolo
`authenticated` e tutte con il predicato `auth.uid() = id`.

```text
push_subscriptions
├─ id            uuid PK
├─ endpoint      text UNIQUE     ← identifica la subscription, non c'è un utente
├─ p256dh, auth  text            ← chiavi di cifratura del browser
├─ lead_times    integer[]       ← minuti di anticipo: 15, 60, 1440
├─ enabled       boolean
└─ created_at, last_seen_at
   indice parziale su (enabled) WHERE enabled = true

push_sent_log
├─ id               uuid PK
├─ subscription_id  uuid → push_subscriptions ON DELETE CASCADE
├─ event_id         text     ← stringa sintetica, non una chiave esterna
├─ lead_time        integer
└─ sent_at          timestamptz
   UNIQUE (subscription_id, event_id, lead_time)

profiles
├─ id                     uuid PK → auth.users.id ON DELETE CASCADE
├─ display_name           text            ← nullable, l'unico campo scritto a mano
├─ theme                  text  DEFAULT 'dark'
├─ favorite_team          text  DEFAULT 'juventus'  ← slug, non nome
├─ show_sinner            boolean DEFAULT true
├─ show_f1, show_motogp   boolean DEFAULT true
└─ created_at, updated_at timestamptz
   trigger handle_new_user: crea la riga alla registrazione
```

`favorite_team` conserva lo **slug** della squadra (`juventus`, non `Juventus`):
è la forma che entra nelle chiavi di cache, nel parametro `team` delle edge
function e nelle URL. Non c'è un vincolo `CHECK` sull'elenco delle squadre, e
non è una dimenticanza: congelerebbe nel database una lista che cambia a ogni
promozione, rendendo non aggiornabile la preferenza di chi tifa una squadra
retrocessa. La validazione vive in `src/lib/serieATeams.ts`, e in lettura passa
da `resolveTeam`, che è totale — qualunque valore inatteso ricade sul default.

Le notifiche push **non** conoscono l'utente: una subscription è identificata
solo dal suo endpoint push, e `push_subscriptions` non ha una colonna utente.
Chi cambia squadra continua quindi a ricevere le notifiche della Juventus.

`push_sent_log.event_id` è costruito dal dispatcher (`f1-{round}-{sessione}`,
`motogp-{round}-{tipo}`, `juve-{matchId}`) e non ha integrità referenziale verso
nulla: se una fonte a monte cambia il modo di identificare un evento, il
meccanismo anti-duplicato smette di riconoscerlo.

## Cron

Un solo job: `push-dispatcher-every-5-min`, `*/5 * * * *`, che chiama la funzione
`push-dispatcher` via `net.http_post` con un segreto condiviso nell'header.

La finestra di selezione degli eventi è di sei minuti mentre il cron scatta ogni
cinque: le esecuzioni si sovrappongono di proposito, per non perdere eventi al
confine.

## Build e strumenti

Vite 8 (bundler rolldown) con `@vitejs/plugin-react`, Tailwind 4 tramite
`@tailwindcss/vite` — la configurazione del tema vive in `src/index.css` dentro un
blocco `@theme`, non esiste più un `tailwind.config.ts`. `lovable-tagger` gira
solo in modalità sviluppo. TypeScript in `strict`, ESLint 10 con le regole del
React Compiler, Vitest 4 su jsdom, Playwright su Chromium.

## PWA

`public/manifest.webmanifest` dichiara l'app installabile, in italiano, verticale,
con tema `#0B1A33`.

`public/sw.js` gestisce **solo le notifiche push**: non c'è un handler `fetch`,
quindi nessuna cache e nessun funzionamento offline a freddo. I componenti
`OfflineFallback` e `OfflineIndicator` coprono il caso in cui l'app è già aperta
e la rete cade, non il caso in cui viene aperta senza rete.

La registrazione (`src/main.tsx`) si disattiva dentro l'iframe di Lovable e sugli
host di preview, dove anzi rimuove le registrazioni esistenti.

## Riferimenti

- Da dove vengono i dati: [`DATA_SOURCES.md`](DATA_SOURCES.md).
- Segreti, CORS, RLS: [`SECURITY.md`](SECURITY.md).
- Convenzioni di codice: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Cosa manca ancora: [`ROADMAP.md`](ROADMAP.md).
