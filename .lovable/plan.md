

## Calendari F1 e MotoGP completamente live (rimozione hardcode)

### Diagnosi (verificata via `curl`)

**F1 — già live, nessuna modifica funzionale necessaria.**
L'edge function `sports-f1` riga 89-108 fa già `fetch(\`${JOLPICA_BASE}/${season}.json\`)` per il calendario. Verifica: `https://api.jolpi.ca/ergast/f1/2026.json` ritorna 22 gare reali (`R1: Australian Grand Prix - 2026-03-08`, ...). `meta.dataSource = "live"`. **Nessun hardcode da rimuovere su F1.**

**MotoGP — calendario hardcoded, va sostituito con API ufficiale.**
`supabase/functions/sports-motogp/index.ts` riga 3-26 contiene `MOTOGP_CALENDAR_2026` (22 GP costanti). Le action `calendar` (riga 398-407) e `next-event` (riga 435-442) leggono da questa costante e ritornano `dataSource: "static"`. Il toast "dati non live per MotoGP 2026" deriva proprio da qui.

**Fonte live identificata e verificata**: API Pulselive ufficiale di motogp.com (la stessa usata dal sito ufficiale).
- Stagioni: `https://api.motogp.pulselive.com/motogp/v1/results/seasons` → ritorna lista anni con `id` UUID per ogni stagione (2026 → `e88b4e43-2209-47aa-8e83-0e0b1cedde6e`, marker `current: true`).
- Eventi: `https://api.motogp.pulselive.com/motogp/v1/results/events?seasonUuid={id}` → ritorna 31 oggetti per il 2026 (22 GP + 9 sessioni di test). Ogni evento espone `name`, `circuit.name`, `circuit.place`, `country.iso`, `country.name`, `date_start`, `date_end`, `test`, `status`. Filtro `test === false` → esattamente 22 GP, dati identici al dataset hardcoded attuale.

**Sky Sport (URL richiesti dall'utente) NON è una fonte praticabile per scraping server-side.** Verifica: `https://sport.sky.it/formula-1/calendario` e `/motogp/calendario` ritornano un HTML di 484 righe composto solo da nav/header/footer. Il calendario è renderizzato lato client (SPA con bundle JavaScript). Una Edge Function Deno non può eseguire JS del browser (no Puppeteer/Playwright in edge runtime). Tentare uno scraping HTML statico restituirebbe **zero gare**. Sky F1 e Sky MotoGP **già usati per le classifiche** (`fetchSkyStandings` riga 308-370) funzionano solo perché lì le tabelle classifiche sono server-rendered nell'HTML; il calendario invece no.

**Decisione tecnica**: per garantire dati live, reali, sincronizzati, usiamo le API ufficiali del rispettivo sport. Sono più stabili e affidabili dello scraping di Sky:
- F1: **Jolpica/Ergast** (già in uso, immutato).
- MotoGP: **Pulselive ufficiale motogp.com** (nuovo, sostituisce hardcode).

Localizzazione italiana dei nomi GP (l'API ritorna `GRAND PRIX OF SPAIN` in inglese) gestita con mappa di traduzione paese→nome italiano (`Spain` → `GP di Spagna`, `Italy` → `GP d'Italia`, ecc.) — niente di hardcoded sui dati: solo traduzione delle 25 nazioni che possono ospitare un round.

### Implementazione

#### A. `supabase/functions/sports-motogp/index.ts`

1. **Rimuovere completamente** la costante `MOTOGP_CALENDAR_2026` (righe 3-26).
2. **Aggiungere** mappe di traduzione:
   - `COUNTRY_NAME_IT: Record<string, string>` — chiave `country.iso` (es. `IT`, `ES`, `TH`), valore nome italiano (`Italia`, `Spagna`, `Thailandia`, ...). Coperti tutti gli ISO che compaiono nel circuit list MotoGP: TH, BR, US, ES, FR, IT, HU, CZ, NL, DE, GB, SM, AT, JP, ID, AU, MY, QA, PT, AR, IN.
   - `GP_NAME_IT(country: string, iso: string): string` — costruisce `GP di Spagna` / `GP d'Italia` / `GP della Thailandia` / `GP delle Americhe` (per US) usando regole di articolo italiano basate sulla nazione.
3. **Nuove funzioni**:
   - `async function fetchMotoGPSeasonId(year: number): Promise<string>` — chiama `/results/seasons`, trova `s.year === year`, ritorna `s.id`. Cache in-memory con TTL 24h (le stagioni cambiano una volta l'anno).
   - `async function fetchMotoGPCalendar(year: number): Promise<MotoGPEvent[]>` — chiama `/results/events?seasonUuid={id}`, filtra `test === false`, ordina per `date_start`, rinumerica `round` 1..N, mappa ogni evento a:
     ```
     { round, name (it), location (circuit.place), circuit (circuit.name), date_start, date_end, country (iso uppercase) }
     ```
4. **Refactor action `calendar`** (riga 398-407):
   ```
   const events = await fetchMotoGPCalendar(year);
   const now = new Date();
   data = events.map(e => ({ ...e, status: new Date(e.date_end) < now ? 'finished' : 'upcoming' }));
   dataSource = 'live';
   ```
   In caso di errore upstream: try/catch → log + `dataSource: 'static-fallback'` con `data: []` (l'app gestisce già lo stato vuoto). **Nessun calendario hardcoded come backup**: l'utente ha richiesto esplicitamente "niente hardcoded".
5. **Refactor action `next-event`** (riga 435-442): usa lo stesso `fetchMotoGPCalendar`, prende il primo evento con `date_start > now`. `dataSource: 'live'`.
6. **`source` meta** quando live: `"motogp.com (Pulselive API)"`.
7. Mantenere invariato: action `standings`, `constructor-standings` (Sky scraping già live), enrichment piloti/team (foto, numeri, nazionalità, loghi).

#### B. `src/hooks/useSyncAll.ts` — fix toast falso positivo

Il warning "Dati non live per MotoGP 2026" oggi appare anche quando le classifiche sono live. Con il fix backend di sopra, il calendario diventa live → il warning sparisce naturalmente per il caso happy path. Aggiungo comunque la categorizzazione corretta (già pianificata nel ticket precedente, ora ne approfitto):

- Estrarre `requiresWarning(meta)` in `src/hooks/syncWarning.ts`. `dataSource ∈ {"live", "wikipedia", "wikipedia+curated"}` → no warning. Tutto il resto (`static-fallback`, `fallback-previous-season`, `mixed`, `unknown`, errori) → warning. **Rimuovo `"static"` dalla whitelist**: dopo questo fix nessun endpoint del progetto deve più ritornare `static` di proposito; se lo fa, è un sintomo di errore da segnalare.

#### C. Test

1. **Edge function** — test Deno in `supabase/functions/sports-motogp/index.test.ts`:
   - Mock `fetch` per `/results/seasons` e `/results/events`. Verifica:
     - 22 eventi ritornati (filtro `test=false` applicato).
     - `name` italianizzato (es. `GRAND PRIX OF SPAIN` → `GP di Spagna`).
     - `round` rinumerato 1..22 in ordine cronologico.
     - `dataSource === 'live'`.
   - Test errore upstream → `dataSource === 'static-fallback'`, `data === []`, `success === true` (l'app non crasha).
2. **Frontend** — `src/hooks/syncWarning.test.ts`:
   - 8 casi: `live`/`wikipedia`/`wikipedia+curated` → false; `static`/`static-fallback`/`fallback-previous-season`/`mixed`/`unknown` → true; `undefined` → false (best effort).
3. **Validazione manuale post-deploy** (script via `supabase--curl_edge_functions`):
   ```
   curl 'sports-motogp?action=calendar&season=2026' | jq '.meta.dataSource, (.data | length), .data[0]'
   ```
   Atteso: `"live"`, `22`, primo GP con `round: 1, name: "GP della Thailandia"`.

#### D. Documentazione

- `changelog.md` `### Changed`: *"Calendario MotoGP ora completamente live via API ufficiale motogp.com (Pulselive). Rimosso dataset hardcoded 2026: la sincronizzazione carica i 22 GP reali della stagione corrente. Calendario F1 era già live via Jolpica/Ergast (nessuna modifica)."*
- `README.md` sezione fonti dati: aggiornare riga MotoGP da `"calendario hardcoded 2026 + Sky scraping classifiche"` a `"motogp.com Pulselive API (calendario) + Sky Sport scraping (classifiche)"`.
- `AGENTS.md` "Limiti noti": rimuovere o ridurre la voce "Contenuti stagionali statici o hardcoded" (resta valida solo per il dataset Sinner statico, da indicare esplicitamente).

### Cosa NON cambia

- Edge function `sports-f1`: già live, intoccata.
- Schema risposta JSON `sports-motogp`: campi identici (`round, name, location, circuit, date_start, date_end, country, status`). Nessun impatto su `MotoGPPage.tsx`, `useMotoGPCalendar`, hook React Query.
- Mappe statiche **piloti** (foto, numeri, nazionalità) e **costruttori** (loghi): restano. Sono enrichment legittimo non disponibile dall'API Sky.
- Layout, UI, pagine, accessibilità.
- Lista canali streaming, scraping `staseraintv`.
- Nessuna nuova dipendenza, env var, segreto.
- Branch policy: lavoro su `develop`, PR verso `develop`, assegnata `@matteobern9244`.

### Perché NON usiamo Sky come fonte calendario (chiarimento per l'utente)

L'utente ha indicato `https://sport.sky.it/formula-1/calendario` e `https://sport.sky.it/motogp/calendario` come fonti di sync. Ho verificato direttamente con `code--fetch_website`: queste pagine sono SPA renderizzate dal browser. Il loro HTML server-side è vuoto di gare. Una Edge Function Supabase (Deno, no headless browser) non può estrarne il calendario.

Le API ufficiali che propongo sono **più affidabili** di Sky perché:
- Sono il backend ufficiale dei rispettivi sport (Jolpica = Ergast F1, Pulselive = motogp.com).
- Espongono JSON strutturato stabile, non HTML soggetto a redesign Sky.
- Già usate da migliaia di app sportive in produzione.
- Aggiornate immediatamente quando il calendario cambia (es. cancellazioni, reschedule).

Se l'utente vuole comunque Sky come fonte primaria, l'unica strada tecnica è introdurre un servizio esterno tipo Firecrawl (rendering JS) — costo aggiuntivo, latenza maggiore, fragilità DOM Sky. **Raccomando di mantenere le API ufficiali**, già live, gratuite, affidabili. Sky resta usato per le classifiche dove funziona benissimo.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/sports-motogp/index.ts` | EDIT | Rimuovere `MOTOGP_CALENDAR_2026`. Aggiungere `COUNTRY_NAME_IT`, `GP_NAME_IT`, `fetchMotoGPSeasonId` (con cache 24h), `fetchMotoGPCalendar`. Refactor action `calendar` e `next-event` per usare API Pulselive. `dataSource: 'live'` quando OK, `'static-fallback'` con `data: []` su errore upstream. |
| `supabase/functions/sports-motogp/index.test.ts` | NEW | Mock fetch Pulselive, verifica numero eventi, italianizzazione, ordine cronologico, gestione errore. |
| `src/hooks/syncWarning.ts` | NEW | `requiresWarning(meta)` con whitelist `live`/`wikipedia`/`wikipedia+curated`. |
| `src/hooks/syncWarning.test.ts` | NEW | 8 casi di categorizzazione `dataSource`. |
| `src/hooks/useSyncAll.ts` | EDIT | Sostituire `isLiveSource` con `requiresWarning` importato. |
| `changelog.md` | EDIT | `### Changed`: calendario MotoGP live, F1 già live confermato. |
| `README.md` | EDIT | Aggiornare sezione fonti dati MotoGP. |
| `AGENTS.md` | EDIT | Ridurre la voce "contenuti stagionali statici" ai soli casi residui (Sinner). |

### Validazione finale

1. `npm run lint`, `npm run build`, `npm run test`.
2. `npm run check:italian` exit 0 (i nomi `GP di Spagna` ecc. sono già italiano).
3. Deploy edge function `sports-motogp`.
4. `curl sports-motogp?action=calendar&season=2026` → 22 eventi, `meta.dataSource: "live"`, primo round `GP della Thailandia` 2026-02-27.
5. `curl sports-motogp?action=next-event` → primo GP futuro reale.
6. Apertura preview → click "Sincronizza" → toast `success` "Tutti i dati sono stati aggiornati", **nessun warning MotoGP**.
7. Pagina MotoGP → tab Calendario mostra 22 gare reali con date corrette.

### Checklist post-edit

1. `MOTOGP_CALENDAR_2026` eliminato dal codice.
2. `sports-motogp/index.ts` chiama Pulselive API per calendario e next-event.
3. `useSyncAll.ts` non genera più falsi warning.
4. Test verde in CI (Deno tests + Vitest frontend).
5. `changelog.md`, `README.md`, `AGENTS.md` aggiornati.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

