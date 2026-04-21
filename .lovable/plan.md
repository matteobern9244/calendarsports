

## Sinner: dati reali da Wikipedia + foto + ranking #1

### Verifica preliminare onesta (cambio di rotta rispetto alla scelta)

Hai scelto **scraping ATPTour.com**, ma ho verificato e **non è tecnicamente fattibile da Edge Function**:

- ATPTour.com è una **Single Page Application**: il fetch HTTP server-side restituisce solo lo scheletro HTML, nessun dato (ranking, attività, profilo) è presente nel sorgente. I dati arrivano via JavaScript/XHR dopo il rendering nel browser, quindi `fetch()` da Deno/Edge Function trova HTML vuoto.
- Per scrapare ATP servirebbe un browser headless (Puppeteer/Playwright) hostato altrove + proxy + manutenzione costante. Non è realistico nello stack attuale.

**Wikipedia invece funziona** (verificato adesso): HTML statico, tabelle parsabili, dati aggiornati al **20 aprile 2026**, ranking attuale **#1**, record 24-2, calendario completo con match round-per-round.

Procedo quindi con **scraping Wikipedia** come fonte primaria, dichiarandolo esplicitamente. Se in futuro vuoi davvero ATP live serve infrastruttura dedicata che non c'è.

### Cosa cambia

**1. `supabase/functions/sports-tennis/index.ts` — riscrittura completa**

Sostituisco i dataset hardcoded con scraper Wikipedia. Tre URL:

- `https://en.wikipedia.org/wiki/Jannik_Sinner` → infobox: ranking attuale, height, plays, coach, prize money, born, Grand Slam results.
- `https://en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season` → infobox stagione (record, titoli, ranking change) + tabella "All matches" (tornei + ogni match con round, opponent, score, win/loss).
- `https://en.wikipedia.org/wiki/2026_ATP_Tour` → calendario completo prossimi tornei (per derivare il "next event" = primo torneo successivo a oggi nella schedule).

Parser pattern: regex su tabelle markdown/HTML con normalizzazione, perché Wikipedia è abbastanza stabile come HTML. Fallback graceful: se uno scrape fallisce, restituisce `null` per quel campo invece di crashare.

**Cache server-side**: variabile module-scope con TTL 30 minuti per evitare di battere Wikipedia ad ogni request (fair use).

Nuove action / payload aggiornati:

| Action | Output |
|---|---|
| `player-info` | `{ name, ranking, rankingDate, careerHigh, country, birthDate, birthPlace, height, weight, plays, coach, turnedPro, prizeMoney, careerTitles, seasonRecord, seasonTitles, photoUrl, source }` |
| `next-event` | Prossimo torneo dal calendario 2026 con `name, date, dateEnd, surface, location, tier, status` |
| `schedule` | Calendario completo 2026 (tornei) con stato derivato |
| `results` | Lista match 2026 dalla tabella "All matches" Wikipedia: `{ tournament, date, round, opponent, opponentRank, score, result, surface, tier }` |

`source: 'Wikipedia (en.wikipedia.org)'` su tutte le risposte, sostituisce il falso "ATP Tour" attuale.

**2. `src/pages/SinnerPage.tsx` — foto + ranking + dettagli**

- Player card ridisegnata con **foto in alto a sinistra** (immagine 96×96 rounded, bordo gold, fallback iniziale "JS" se foto non carica). Foto: `https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Jannik_Sinner_2025_US_Open.jpg/500px-Jannik_Sinner_2025_US_Open.jpg` (Wikimedia Commons, licenza libera).
- Ranking grande (#1) con etichetta "ATP Singolare" e data aggiornamento ranking ("aggiornato al 13 aprile 2026").
- Riga statistiche stagione 2026: record W-L, titoli, prossimo Grand Slam.
- Nel componente `EventCard` per i match: mostro round (1R/2R/QF/SF/F/W) + opponent + ranking opponent + score + esito (V/S in chip verde/rosso usando token `--success`/`--destructive`).

**3. `src/pages/Index.tsx` — Home**

`useSinnerNextEvent` riceve già il payload aggiornato dal nuovo edge → la card "Tennis · Sinner" mostra automaticamente il prossimo torneo reale (Madrid Open 22 aprile, in base ai dati attuali). Nessuna modifica al rendering, solo coerenza dati.

**4. Componente foto — `src/components/sinner/PlayerHeader.tsx` (NUOVO, piccolo)**

Estraggo la player card in un componente isolato per pulizia, con `<img>` ottimizzata, `loading="eager"`, `alt="Jannik Sinner"`, e fallback gestito con `onError`.

### Cosa NON cambia

- Stack, routing, hook React Query: invariati.
- Pagine F1/MotoGP/Juventus: invariate.
- Stagione: resta selezionabile, ma per ora i dati Wikipedia reali coprono solo 2026 (le stagioni precedenti restano vuote → EmptyState esistente).
- Versione resta **2.1.0**.

### Limiti dichiarati

- **Latenza dati**: Wikipedia viene aggiornato dagli editor entro 24-48h dai match. Non è "real-time strict" come un'API ufficiale, ma è la fonte gratuita più affidabile e **sempre aggiornata** in pratica.
- **Fragilità scraper**: se Wikipedia cambia struttura tabelle, lo scraper può rompersi. Mitigazione: parser difensivo + fallback `null` per campo + log errori.
- **Cache 30 min**: per contenere il carico su Wikipedia. Significa che dopo un match, possono passare fino a 30 minuti prima che il nuovo dato compaia (sommati alla latenza editoriale Wikipedia).
- **Stagioni < 2026**: non popolate via scraping in questo intervento. Se servono, vanno aggiunte URL aggiuntive (`2025_Jannik_Sinner_tennis_season`, ecc.) — proposta separata.

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/sports-tennis/index.ts` | EDIT | Riscrittura completa: scraper Wikipedia per player-info, schedule, results, next-event. Cache 30 min. |
| `src/pages/SinnerPage.tsx` | EDIT | Player header con foto, ranking #1 grande, statistiche stagione. Match card con round + opponent rank + chip esito. |
| `src/components/sinner/PlayerHeader.tsx` | NUOVO | Componente isolato con foto + ranking + meta info. |
| `src/hooks/useSportsData.ts` | EDIT | TypeScript types aggiornati per il nuovo shape `playerInfo` (ranking come number, photoUrl, ecc.). Stale time `useSinnerInfo` allineato a 30 min. |
| `README.md` | EDIT | Sezione "Fonti dati" aggiornata: tennis = Wikipedia (era "dataset statico"). |
| `changelog.md` | EDIT | `### Changed`: Sinner ora usa Wikipedia come fonte live (ranking, calendario, match) + foto Wikimedia. Dichiarazione esplicita: ATP non scrapabile da Edge Function. |

### Checklist post-edit

1. `/sinner`: foto Sinner visibile in alto a sinistra, ranking **#1**, "aggiornato al 13 aprile 2026".
2. Tab Risultati: match reali Australian Open → Monte-Carlo (almeno 30 match), con round, opponent, score, esito.
3. Tab Tornei: calendario 2026 da Madrid in poi, stato corretto (programmato/in corso/completato).
4. Home: card "Tennis · Sinner" mostra il prossimo torneo reale dalla schedule.
5. DevTools Network: chiamata a `sports-tennis` ritorna `source: "Wikipedia"`, payload con dati aggiornati.
6. Ricarica entro 30 min → cache hit (no nuova fetch a Wikipedia).
7. `npm run lint` + `npm run build` + `npm run test`.
8. Aggiornare `changelog.md` + `README.md`.
9. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

