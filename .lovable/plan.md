

## Verifica "Stagione attiva" durante Sincronizza + dati reali

### Obiettivo

Garantire che il pulsante "Sincronizza" in home:

1. Rispetti sempre la logica "stagione attiva per sport" centralizzata in `src/lib/currentSeason.ts` (Sinner/F1/MotoGP = anno solare; Juventus = stagione Serie A con cutoff luglio).
2. Recuperi dati **reali** dalle Edge Functions, senza forzare fallback statici quando le sorgenti live sono disponibili.
3. Non rimanga "incollato" su stagioni vecchie cachate da React Query dopo il rollover (es. da giugno 2026 a luglio 2026 quando Juventus passa da 2025 a 2026).

### Audit attuale (cosa fa oggi `useSyncAll`)

`src/hooks/useSyncAll.ts` esegue tre passi:

1. `queryClient.invalidateQueries({ predicate: q => !q.queryKey[0]?.startsWith("streaming-"), refetchType: "all" })` → invalida tutte le query non-streaming. **Problema**: invalida solo le query con la chiave **già montata**. Se l'utente ha aperto solo la home, le query di `/sinner`, `/juventus`, `/formula1`, `/motogp` non sono mai state create e quindi non vengono "ri-tirate". Inoltre, se in cache c'è ancora una query con `season=2025` (vecchia preferenza pre-rollover), `invalidate` la marca stale ma la chiave resta `["juventus","calendar",2025]` finché qualcuno la richiede di nuovo con quella chiave — ed effettivamente nessuno lo fa più, quindi è solo cache morta. **OK funzionalmente**, ma sporco.
2. Invalida `["streaming-tv"]`.
3. Prefetch streaming-releases per i prossimi 14 giorni.

**Cosa manca**:
- Nessuna garanzia che la stagione usata al prossimo render sia ricalcolata da `currentSeason.ts` (lo è già, perché ogni pagina chiama l'helper al mount, ma vale la pena renderlo esplicito anche durante sync).
- Nessuna pulizia della cache obsoleta delle stagioni precedenti (`["f1","calendar",2025]` rimane in memoria a vita).
- Nessuna verifica che le Edge Functions stiano effettivamente restituendo dati reali e non fallback statici silenziosi.

### Modifiche proposte

#### 1. `src/hooks/useSyncAll.ts` — sync stagione-aware

Riscrittura mirata del passo 1 in modo che:

a) Calcoli al volo le stagioni correnti per i 4 sport via `currentSeason.ts`.

b) **Rimuova dalla cache** tutte le query sportive con stagione diversa da quella corrente (`queryClient.removeQueries` con predicate). Esempio: dopo il rollover Juventus a luglio, rimuove tutte le `["juventus", *, 2025, ...]`. Questo evita che vecchie chiavi restino in memoria e che `placeholderData: (prev) => prev` (usato in `useJuventusCalendar`) mostri dati vecchi della stagione sbagliata per un frame.

c) **Prefetchi esplicitamente** le query principali della stagione corrente per ciascun sport, usando le stesse chiavi/queryFn dei rispettivi hook. Così, anche se l'utente non ha mai aperto `/juventus`, la cache viene popolata e la prima visita è istantanea con dati freschi della stagione attiva.

   Lista prefetch (allineata agli hook esistenti):
   - F1: `f1Api.getCalendar(seasonF1)`, `f1Api.getDriverStandings(seasonF1)`, `f1Api.getConstructorStandings(seasonF1)`, `f1Api.getNextRace()`.
   - Juventus: `footballApi.getStandings(seasonJ)`, `footballApi.getCalendar(seasonJ, 1, 12)`, `footballApi.getJuventusInfo(seasonJ)`.
   - Sinner: `tennisApi.getPlayerInfo()`, `tennisApi.getNextEvent()`, `tennisApi.getSchedule(seasonS)`, `tennisApi.getResults(seasonS)`.
   - MotoGP: `motogpApi.getCalendar(seasonM)`, `motogpApi.getNextEvent()`, `motogpApi.getStandings(seasonM)`, `motogpApi.getConstructorStandings(seasonM)`.

d) Mantenga il passo 2 (streaming-tv) e passo 3 (prefetch streaming-releases) invariati.

e) Aggiorni i messaggi `syncStep` per riflettere la nuova granularità (es. "Aggiorno F1 2026…", "Aggiorno Juventus 2025/26…").

#### 2. `src/lib/currentSeason.ts` — helper formato Juventus

Aggiungere helper di formattazione condiviso per evitare duplicazione tra `JuventusPage` e `useSyncAll`:

```ts
export function formatJuventusSeasonLabel(season: number): string {
  const next = String((season + 1) % 100).padStart(2, "0");
  return `${season}/${next}`;
}
```

Usato sia per i messaggi toast/sync sia (opzionalmente) per l'eventuale futura `ActiveSeasonLabel`.

#### 3. Verifica "dati reali" — audit Edge Functions

Stato attuale documentato in `AGENTS.md` e `README.md`:

| Edge Function | Fonte primaria reale | Fallback statico | Rischio "non veritiero" |
|---|---|---|---|
| `sports-f1` | Jolpica API + OpenF1 (foto) | Mappa statica `F1_DRIVER_PHOTOS`, `F1_CONSTRUCTOR_LOGOS` | Solo arricchimento foto/loghi è statico; calendario/standings sono live. **OK reale**. |
| `sports-football` | Sky Sport widget HTML + Lega Serie A (broadcaster) | Tentativo season-1 se 404 | Scraping fragile ma reale. Se Sky cambia HTML i dati sono **assenti**, non falsi. **OK** (ma vedere punto 4). |
| `sports-tennis` | Wikipedia IT (profilo) + Wikipedia EN (stagione) | "Curated upcoming list" appended se mancano | **ATTENZIONE**: il fallback "curated" è hardcoded dentro la function. Va verificato che l'append avvenga solo se mancano davvero match futuri da Wikipedia, non sempre. |
| `sports-motogp` | Sky Sport scraping | `MOTOGP_CALENDAR_2026` calendario hardcoded | **ATTENZIONE**: il calendario MotoGP è interamente statico anno 2026. Per stagione 2027+ servirebbe aggiornamento. |

Azione: **non** modificare le Edge Functions in questo intervento (rischio di rottura su scraping fragile), ma:

- Aggiungere nel response delle 4 sport-functions un campo `meta: { dataSource: "live" | "static-fallback" | "mixed", season: number }` quando già non presente. La maggior parte già espone `source` e `seasonUsed` — verificare e uniformare.
- Lato client, in `useSyncAll`, dopo il prefetch, leggere il `source`/`meta` dei risultati e, se uno o più sport tornano come `static-fallback` per la stagione corrente, mostrare un toast warning: `"Juventus 2025/26: dati live non disponibili, mostro l'ultima copia. Riprova più tardi."`. Questo dà trasparenza all'utente sulla "verità" dei dati senza nascondere problemi.

#### 4. Validazione manuale tramite `supabase--curl_edge_functions`

Prima del merge, eseguire (in modalità default dopo approvazione) chiamate dirette alle 4 Edge Functions con la stagione calcolata oggi (aprile 2026):

- `sports-f1?action=calendar&season=2026` → verificare che ritorni gare 2026 reali da Jolpica.
- `sports-football?action=calendar&season=2025` → verificare che ritorni partite Juventus 2025/26 da Sky.
- `sports-tennis?action=schedule&season=2026` → verificare numero match e che `source` non sia "fallback".
- `sports-motogp?action=calendar&season=2026` → verificare se è live o se cade sul `MOTOGP_CALENDAR_2026` statico (atteso: statico, da documentare).

Risultati raccolti come note nel changelog.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/hooks/useSyncAll.ts` | EDIT | Rifare il passo 1: calcola stagioni correnti via `currentSeason.ts`, `removeQueries` per stagioni obsolete dei 4 sport, prefetch espliciti delle query primarie con la stagione corrente. Aggiungere step granulari (4 step sportivi + streaming-tv + streaming-releases). Leggere `source`/`meta` dei risultati e, se `static-fallback` per la stagione corrente, accumulare warning. Toast finale: success se tutto live, warning con elenco sport se fallback. |
| `src/lib/currentSeason.ts` | EDIT | Aggiungere `formatJuventusSeasonLabel(season: number): string`. |
| `src/lib/currentSeason.test.ts` | EDIT | Aggiungere test: `formatJuventusSeasonLabel(2025) === "2025/26"`, `formatJuventusSeasonLabel(2099) === "2099/00"`. |
| `supabase/functions/sports-f1/index.ts` | EDIT (minimo) | Garantire che la response includa `meta: { dataSource: "live" \| "static-fallback", season }` per le action `calendar`, `driver-standings`, `constructor-standings`. Default `live` se Jolpica risponde 200 con dati; `static-fallback` solo se l'unica fonte usata è la mappa statica (foto/loghi non contano: sono enrichment). |
| `supabase/functions/sports-football/index.ts` | EDIT (minimo) | Idem. `dataSource: "live"` se `seasonUsed === requestedSeason`; `dataSource: "fallback-previous-season"` se è caduto sulla stagione precedente; `dataSource: "static-fallback"` se mai. |
| `supabase/functions/sports-tennis/index.ts` | EDIT (minimo) | Idem. Esporre se la "curated upcoming list" è stata appesa (`dataSource: "wikipedia"` o `"wikipedia+curated"`). |
| `supabase/functions/sports-motogp/index.ts` | EDIT (minimo) | Idem. Per `calendar` action, marcare esplicitamente `dataSource: "static"` (il calendario è hardcoded), per `standings` `dataSource: "live"` (scraping Sky). |
| `changelog.md` | EDIT | `### Changed`: "Sincronizza ora ricalcola la stagione attiva per ciascun sport, rimuove dalla cache le stagioni obsolete e fa prefetch esplicito delle query principali." `### Added`: "Indicazione `dataSource` nelle response delle 4 Edge Functions sport; il client mostra warning se uno sport sta servendo dati fallback invece di live." |
| `README.md` | EDIT | Sezione "Affidabilità dati": aggiornare la tabella sport con la nuova colonna `dataSource` e i comportamenti documentati di sync. Documentare che il calendario MotoGP è statico fino ad aggiornamento manuale. |

### Cosa NON cambia

- Logica `currentSeason.ts` per Sinner/F1/MotoGP/Juventus (solo aggiunta helper formato).
- Pannello Preferenze (resta solo Aspetto).
- Pagine sportive (continuano a leggere `getCurrent...Season()` al mount).
- Routing, branding, layout, versione `2.1.0`, lingua italiana.
- Streaming-tv e streaming-releases (sync invariato).
- Branch policy GitHub <-> Lovable.

### Validazione

1. Click "Sincronizza" da home oggi (aprile 2026):
   - Toast progressivo mostra "Aggiorno F1 2026…", "Aggiorno Juventus 2025/26…", ecc.
   - Cache popolata per i 4 sport con stagione corrente.
   - Toast finale "Sincronizzazione completata" se tutti `dataSource === "live"`.
   - Se MotoGP calendario torna `dataSource: "static"`, toast warning specifico.
2. Aprire `/juventus` subito dopo sync: dati istantanei, stagione `2025/26`, nessun loading.
3. React Query DevTools: nessuna chiave `["juventus","calendar",2024]` o stagioni obsolete dopo sync.
4. Simulare rollover (orologio a luglio 2026): nuovo sync rimuove `["juventus", *, 2025]` e popola `["juventus", *, 2026]`. La pagina Juventus mostra `2026/27`.
5. Curl manuale alle 4 edge functions con stagione corrente: tutte rispondono 200 con `data` non vuoto e `meta.dataSource` valorizzato.
6. `npm run lint`, `npm run build`, `npm run test` invariati (eccetto il nuovo test su `formatJuventusSeasonLabel`).
7. `npm run check:italian` exit 0 (toast e step in italiano).

### Checklist post-edit

1. `useSyncAll` usa `currentSeason.ts` esplicitamente per le 4 stagioni.
2. `removeQueries` rimuove stagioni obsolete dei 4 sport.
3. Prefetch espliciti completati con successo per la stagione corrente.
4. 4 Edge Functions espongono `meta.dataSource`.
5. Client mostra warning se `dataSource !== "live"` per la stagione corrente.
6. `README.md` e `changelog.md` aggiornati.
7. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

