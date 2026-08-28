# Architettura

Documento sintetico dell'architettura di **Calendar Events v2.7.0**.

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
│  countdownClock (un timer per tutta l'app)                     │
│  service worker: solo notifiche push, nessuna cache            │
└────────────────────────────┬──────────────────────────────────┘
                             │  HTTPS, anon key
┌────────────────────────────▼──────────────────────────────────┐
│  Supabase Edge Functions (Deno)                               │
│  sports-f1 · sports-football · sports-motogp · sports-tennis  │
│  streaming-tv · streaming-releases · highlights-youtube        │
│  push-subscribe · push-vapid-key · push-dispatcher             │
│  _shared/security.ts: CORS + rate limit                        │
└──────┬─────────────────────────────────────┬──────────────────┘
       │                                      │
┌──────▼──────────────────┐        ┌──────────▼─────────────────┐
│ Postgres                │        │ Terze parti                │
│ push_subscriptions      │        │ Jolpica · OpenF1 · Sky     │
│ push_sent_log           │        │ Lega Serie A · Pulselive   │
│ pg_cron ogni 5 min      │        │ Wikipedia · TMDB · YouTube │
└─────────────────────────┘        └────────────────────────────┘
```

Il punto da tenere a mente: **il database non contiene eventi sportivi**. Ospita
solo le iscrizioni alle notifiche push e il registro degli invii. Tutto il resto
è effimero, recuperato a ogni richiesta e tenuto in cache per pochi minuti nella
memoria dell'isolate che serve la funzione.

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
│                   api/sportsApi, supabaseClient, pushClient
├── contexts/       pannello preferenze
└── integrations/   types.ts generato da Supabase
```

## Route

Tutte figlie di `Layout`, tranne il catch-all.

| Path                         | Componente          |
| ---------------------------- | ------------------- |
| `/`                          | `Index`             |
| `/calendario`                | `CalendarPage`      |
| `/streaming`                 | `StreamingPage`     |
| `/sinner`                    | `SinnerPage`        |
| `/juventus`                  | `JuventusPage`      |
| `/juventus/partite/:matchId` | `JuventusMatchPage` |
| `/formula1`                  | `Formula1Page`      |
| `/motogp`                    | `MotoGPPage`        |
| `/preferenze`                | `PreferencesPage`   |
| `*`                          | `NotFound`          |

Routing dichiarativo con react-router 8: nessun data router, nessun loader.

## Hook di dati e chiavi di cache

Ogni hook è un involucro sottile su React Query. La chiave è la sua identità: due
punti che leggono la stessa cosa con chiavi diverse non condividono niente, e un
prefetch scritto con una chiave sbagliata viene semplicemente buttato.

| Hook                                                    | Chiave                                                                  | Azione                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| `useF1Calendar(season)`                                 | `["f1","calendar",season]`                                              | `sports-f1?action=calendar`           |
| `useF1DriverStandings(season)`                          | `["f1","driver-standings",season]`                                      | `driver-standings`                    |
| `useF1ConstructorStandings(season)`                     | `["f1","constructor-standings",season]`                                 | `constructor-standings`               |
| `useF1NextRace()`                                       | `["f1","next-race"]`                                                    | `next-race`                           |
| `useSerieAStandings(season)`                            | `["juventus","standings",season]`                                       | `sports-football?action=standings`    |
| `useJuventusCalendar(season,page?,pageSize?,upcoming?)` | `["juventus","calendar",season,page??null,pageSize??null,upcomingOnly]` | `calendar`                            |
| `useSinnerInfo()`                                       | `["sinner","info"]`                                                     | `sports-tennis?action=player-info`    |
| `useSinnerNextEvent()`                                  | `["sinner","next-event"]`                                               | `next-event`                          |
| `useSinnerSchedule(season)`                             | `["sinner","schedule",season]`                                          | `schedule`                            |
| `useSinnerResults(season,page?,pageSize?)`              | `["sinner","results",season,page??null,pageSize??null]`                 | `results`                             |
| `useMotoGPCalendar(season)`                             | `["motogp","calendar",season]`                                          | `sports-motogp?action=calendar`       |
| `useMotoGPNextEvent()`                                  | `["motogp","next-event"]`                                               | `next-event`                          |
| `useMotoGPStandings(season)`                            | `["motogp","standings",season]`                                         | `standings`                           |
| `useMotoGPConstructorStandings(season)`                 | `["motogp","constructor-standings",season]`                             | `constructor-standings`               |
| `useHighlights(sport,limit)`                            | `["highlights",sport,limit]`                                            | `highlights-youtube`                  |
| `useTvByFamily(family)`                                 | `["streaming-tv",family]`                                               | `streaming-tv?action=prime-time`      |
| `useReleasesItaly(opts)`                                | `["streaming-releases-italy",provider,kind,from,to,sort,genreId]`       | `streaming-releases?action=new-italy` |
| `useReleaseDetails(type,id)`                            | `["streaming-release-details",type,id]`                                 | `details`                             |

`useJuventusCalendar` chiamata **senza** `page` e `pageSize` restituisce l'intera
stagione: è la forma che usano la Home e il dettaglio partita, e condividono la
stessa voce di cache.

## Schema database

Due tabelle, entrambe con RLS attiva e **nessuna policy permissiva**: i ruoli
`anon` e `authenticated` non le vedono affatto. Ci arrivano solo le edge function
con la service role key.

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
```

L'app **non ha autenticazione**: una subscription è identificata solo dal suo
endpoint push.

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
