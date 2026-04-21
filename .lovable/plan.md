

## "Sincronizza" davvero completo: tutti i dati, tutte le pagine

### Obiettivo
Il bottone **Sincronizza** in Home deve precaricare **tutto** ciò che le pagine dell'app possono mostrare, in modo che dopo lo sync la navigazione tra Home, Streaming, Sinner, Juventus, F1 e MotoGP (incluse le tab Highlights) non richieda nessuna nuova fetch.

### Stato attuale (cosa già fa `useSyncAll`)
- F1: calendar, driver-standings, constructor-standings, next-race ✅
- Juventus: standings, calendar (solo pagina 1), next-match ✅
- Sinner: player-info, next-event, schedule, results ✅
- MotoGP: calendar, next-event, standings, constructor-standings ✅
- Streaming TV: solo `invalidateQueries` (non prefetcha le 5 famiglie) ⚠️
- Streaming Releases: 4 provider con range fisso `today → +14gg` ⚠️
- **Highlights YouTube (Juventus, F1, MotoGP): MANCANTI** ❌
- **Juventus calendar: solo pagina 1, le altre pagine non vengono prefetchate** ⚠️

### Cosa aggiungere/sistemare

#### 1. Highlights YouTube (3 sport) — NUOVO
Aggiungere un task di prefetch dedicato che chiama `highlights-youtube` per ognuno dei 3 sport con il limit di default usato dalle pagine (`12`):

```ts
// queryKey allineate a useHighlights(sport, 12)
["highlights", "juventus", 12]
["highlights", "f1", 12]
["highlights", "motogp", 12]
```

Le edge function `highlights-youtube` accettano `?sport=...&limit=12` e ritornano l'envelope `{ success, data, meta }`. Useremo `callEdgeFunctionWithMeta` (già importato) e `setQueryData` come per gli altri sport, così entrano anche nel meccanismo di warning fallback.

#### 2. Juventus calendar — TUTTE le pagine
Oggi viene prefetchata solo `page=1, pageSize=12`. Le pagine 2, 3, … restano "fredde". Soluzione:

- Prefetchare **prima** la pagina 1 per leggere `totalPages` dal payload paginato.
- Fare prefetch **in parallelo** di tutte le altre pagine (`page=2..totalPages`) con la stessa `pageSize=12` e le query key allineate a `useJuventusCalendar(season, page, 12)`.

Cap di sicurezza: massimo 10 pagine (oltre 120 partite è impossibile per una sola squadra/stagione).

#### 3. Streaming TV — prefetch reale per tutte le famiglie
Oggi solo `invalidateQueries({ queryKey: ["streaming-tv"] })`. Sostituire con prefetch esplicito per ognuna delle 5 famiglie di `STREAMING_FAMILIES` (rai, mediaset, sky-sport, sky-cinema, discovery), usando la stessa query key di `useTvByFamily`:

```ts
queryKey: ["streaming-tv", family]
queryFn: () => streamingApi.getTvByFamily(family)
```

#### 4. Streaming Releases — coprire anche il range usato in pagina
Oggi: `today → +14gg`. La pagina `StreamingPage` usa di default `range="30d"` → `today → +30gg` (e supporta anche range diversi). Soluzione minima e sufficiente per "non rifetcha al primo accesso": prefetch su **due** range che coprono i default di Home e di StreamingPage:

- `today → today+14` (già presente, lasciato)
- `today → today+30` (NUOVO, allineato al default `range=30d` della pagina)

Per i 4 provider × 2 range → 8 prefetch totali, tutti in parallelo. Non si toccano gli altri range filtrabili dall'utente (sarebbe spreco di chiamate TMDB).

### Modifiche al file

**Solo `src/hooks/useSyncAll.ts`** (nessun altro file impattato; query key e `staleTime` restano coerenti con gli hook esistenti, così le pagine leggono la cache senza rifetcha).

Struttura aggiornata della funzione `sync`:

```ts
// === Step 1: pulizia cache stagioni obsolete === (invariato)

// === Step 2: prefetch sport per stagione corrente === (invariato)

// === Step 2bis: Highlights YouTube === (NUOVO)
setSyncStep("Aggiornamento highlights YouTube...");
await Promise.all(
  (["juventus", "f1", "motogp"] as const).map(async (sport) => {
    try {
      const { data, meta } = await callEdgeFunctionWithMeta(
        "highlights-youtube",
        { sport, limit: "12" },
      );
      queryClient.setQueryData(["highlights", sport, 12], data);
      if (requiresWarning(meta)) {
        // mappa il warning sullo sport corrispondente
        const mapped: SportKey = sport === "juventus" ? "juventus" : sport;
        fallbackBySport[mapped].add(meta?.dataSource ?? "unknown");
      }
    } catch (err) {
      console.warn(`Sync highlights ${sport} failed:`, err);
    }
  }),
);
setSyncProgress(70);

// === Step 3: Juventus calendar — tutte le pagine === (NUOVO)
setSyncStep("Aggiornamento calendario Juventus completo...");
const firstPage = queryClient.getQueryData<{ totalPages?: number }>(
  ["juventus", "calendar", seasonJ, 1, 12],
);
const totalPages = Math.min(10, firstPage?.totalPages ?? 1);
if (totalPages > 1) {
  await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (p) => {
      try {
        const { data } = await callEdgeFunctionWithMeta("sports-football", {
          action: "calendar",
          season: String(seasonJ),
          page: String(p),
          pageSize: "12",
        });
        queryClient.setQueryData(["juventus", "calendar", seasonJ, p, 12], data);
      } catch (err) {
        console.warn(`Sync juventus calendar page ${p} failed:`, err);
      }
    }),
  );
}
setSyncProgress(78);

// === Step 4: Streaming TV — prefetch reale 5 famiglie === (RISCRITTO)
setSyncStep("Aggiornamento palinsesti TV...");
await Promise.all(
  STREAMING_FAMILIES.map((f) =>
    queryClient.prefetchQuery({
      queryKey: ["streaming-tv", f.id],
      queryFn: () => streamingApi.getTvByFamily(f.id),
      staleTime: 0,
    }),
  ),
);
setSyncProgress(88);

// === Step 5: Streaming Releases — 14gg + 30gg === (ESTESO)
setSyncStep("Aggiornamento nuove uscite streaming...");
const today = todayRomeISO();
const ranges = [addDaysISO(today, 14), addDaysISO(today, 30)];
await Promise.all(
  STREAMING_PROVIDERS.flatMap((p) =>
    ranges.map((dateTo) =>
      queryClient.prefetchQuery({
        queryKey: ["streaming-releases", p.id, today, dateTo],
        queryFn: () => streamingApi.getReleasesByProvider(p.id, today, dateTo),
        staleTime: 0,
      }),
    ),
  ),
);
setSyncProgress(100);
```

Aggiunto import:
```ts
import { STREAMING_FAMILIES, STREAMING_PROVIDERS } from "@/hooks/useStreamingData";
```
(`STREAMING_PROVIDERS` già importato; aggiungere `STREAMING_FAMILIES`.)

### Cosa NON viene toccato (anti-regressione)
- `useSportsData.ts`, `useStreamingData.ts`, pagine: **nessuna modifica**. Le query key restano identiche, quindi la cache prefetchata viene letta direttamente dai componenti.
- Filtri streaming non-default (es. range `7d`, `60d`, ecc.) restano on-demand: non è ragionevole prefetcharli tutti (consumerebbe quote TMDB inutilmente).
- `JuventusMatchPage` continua a funzionare con la sua ricerca multi-pagina, ma ora trova subito i match nelle pagine già in cache.
- `EventCard`, `OfflineFallback`, header, timezone Roma, lingua italiana: invariati.

### Progress map aggiornato
- 0 → 8: pulizia cache
- 8 → 60: 4 sport (F1, Juve base, Sinner, MotoGP)
- 60 → 70: Highlights YouTube
- 70 → 78: Juventus calendar pagine extra
- 78 → 88: TV palinsesti 5 famiglie
- 88 → 100: Releases 4 provider × 2 range

### Verifica post-modifica
- `npm run lint` + `npm run build` + `npm run test` (nessun test su `useSyncAll` da aggiornare oltre a quelli già presenti).
- Smoke manuale: cliccare **Sincronizza** in Home, poi navigare in Streaming (tab TV su tutte e 5 le famiglie + tab Nuove uscite), Sinner, Juventus (pagine 1, 2, …), F1 → tab Highlights, MotoGP → tab Highlights. Nessuno dei `useQuery` dovrebbe entrare in `isLoading` (lettura immediata da cache).
- Toast finale: success se tutto live, warning con elenco sport in fallback (logica esistente, già coerente).

### Note tecniche
- Tutte le chiavi e `staleTime` restano allineati 1:1 agli hook consumer → nessuna duplicazione di rete.
- Cap di 10 pagine sul calendario Juventus evita loop runaway in caso di payload mal formato.
- Prefetch streaming usa `prefetchQuery` (rispetta deduplica React Query) anziché `setQueryData`, perché `streamingApi.getTvByFamily` è chiamata diretta JSON e non usa `callEdgeFunctionWithMeta` (TV/Releases non sono nel sistema warning fallback per scelta).
- Nessun colore hardcoded, nessuna nuova dipendenza, nessun cambio routing/Lovable/sync GitHub.

