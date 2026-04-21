

## Sezione "Highlights" per Juventus, Formula 1 e MotoGP

### Fonte dati (verificata)

YouTube espone **feed RSS pubblici** per qualsiasi playlist senza API key:
`https://www.youtube.com/feeds/videos.xml?playlist_id={ID}`. Verificato HTTP 200 per tutte e 3 le playlist richieste, con ~15 entries ciascuna. Ogni entry contiene **dati reali**: `<title>`, `<yt:videoId>`, `<published>` (ISO 8601 con offset), `<author><name>` (canale = fonte). Le thumbnail si ottengono via URL deterministico `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg` (480×360, sempre disponibile). Nessun mock, nessun hardcode di video.

### Architettura

#### A. Nuova Edge Function `supabase/functions/highlights-youtube/index.ts`

- Endpoint unico: `GET /highlights-youtube?sport=juventus|f1|motogp&limit=12`.
- Mappa interna `sport → playlistId` con i 3 ID forniti.
- Fetch del feed RSS, parsing con `DOMParser` di Deno (`deno-dom` standard) o regex semplici (preferito: regex su `<entry>` per evitare dipendenze, pattern già verificato sui sample).
- Per ogni entry estrae `videoId`, `title`, `published`, `author` (canale ufficiale).
- Output normalizzato:
  ```json
  {
    "success": true,
    "data": [
      {
        "videoId": "cp37e-K70Gw",
        "title": "Juventus 2-0 Bologna | HIGHLIGHTS Serie A",
        "publishedAt": "2026-04-19T22:10:32+00:00",
        "source": "Juventus",
        "url": "https://www.youtube.com/watch?v=cp37e-K70Gw",
        "thumbnailUrl": "https://i.ytimg.com/vi/cp37e-K70Gw/hqdefault.jpg"
      }
    ],
    "meta": { "dataSource": "live", "source": "youtube-rss", "sport": "juventus" }
  }
  ```
- CORS abilitato (riusa `_shared/security.ts` come le altre edge functions).
- Cache HTTP 10 minuti (`Cache-Control: public, max-age=600`) per ridurre richieste a YouTube.
- Se YouTube risponde non-2xx o feed vuoto: ritorna `success:true, data:[], meta.dataSource:"unknown"` (stato vuoto onesto, nessun fake).

#### B. Client adapter `src/lib/api/sportsApi.ts`

Aggiungere:
```ts
export type HighlightSport = "juventus" | "f1" | "motogp";
export const highlightsApi = {
  list: (sport: HighlightSport, limit = 12) =>
    callEdgeFunction("highlights-youtube", { sport, limit: String(limit) }),
};
```

#### C. Hook `src/hooks/useSportsData.ts`

```ts
export function useHighlights(sport: HighlightSport, limit = 12) {
  return useQuery({
    queryKey: ["highlights", sport, limit],
    queryFn: () => highlightsApi.list(sport, limit),
    staleTime: 10 * 60 * 1000,
  });
}
```

#### D. Componente UI condiviso `src/components/highlights/HighlightsSection.tsx`

- Props: `sport: HighlightSport`, `accentColor?: string` (per allineare al tema della pagina: oro Juventus, rosso Ferrari per F1, brand MotoGP).
- Header: `<SectionHeader title="Highlights" subtitle="Ultimi video dal canale ufficiale" />`.
- Stato loading: `<LoadingState message="Caricamento highlights..." />`.
- Stato errore: `<ErrorState message="Impossibile caricare gli highlights." onRetry={...} />`.
- Stato vuoto: `<EmptyState message="Nessun highlight disponibile al momento." />`.
- Layout: griglia responsive `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` con animazioni Framer Motion `staggerChildren` (coerente col resto dell'app).
- Card highlight (componente interno `HighlightCard`):
  - Wrapper `<a href={url} target="_blank" rel="noopener noreferrer">` con focus-ring oro.
  - Thumbnail 16:9 con overlay play button al center, hover scale-105, gradiente bottom-up per leggibilità testo.
  - Badge "NUOVO" (gold) sui video pubblicati negli ultimi 3 giorni.
  - Badge data formato italiano (es. "19 apr 2026") via helper `formatDateIT`.
  - Titolo `font-heading` clamp-2 righe.
  - Footer micro-meta: icona YouTube + nome canale (fonte) + tempo relativo ("2 giorni fa") via helper interno `formatRelativeIT`.
  - Lazy-load thumbnail (`loading="lazy"`).
  - Stile coerente con `EventCard`: `rounded-2xl border border-border bg-card shadow-[...]` + hover lift `whileHover={{ y: -3 }}`.
- CTA in fondo alla sezione: link "Vedi tutti su YouTube" → URL playlist completa, target `_blank`.
- Tutto in italiano (`check:italian` compliant).

#### E. Integrazione nelle 3 pagine

**JuventusPage** (`src/pages/JuventusPage.tsx`): aggiungere un nuovo `<TabsTrigger value="highlights">Highlights</TabsTrigger>` accanto a Calendario/Classifica e relativo `<TabsContent value="highlights"><HighlightsSection sport="juventus" /></TabsContent>`.

**Formula1Page** (`src/pages/Formula1Page.tsx`): nuovo tab Highlights dopo Costruttori, `<HighlightsSection sport="f1" />`.

**MotoGPPage** (`src/pages/MotoGPPage.tsx`): nuovo tab Highlights dopo Costruttori, `<HighlightsSection sport="motogp" />`.

Nessuna modifica al layout principale né alla Home (la richiesta è per le 3 pagine sport).

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/highlights-youtube/index.ts` | NEW | Edge function: parsing RSS YouTube, normalizzazione output, CORS, rate-limit, cache 10min. |
| `src/lib/api/sportsApi.ts` | EDIT | Nuovo `highlightsApi.list(sport, limit)`. |
| `src/hooks/useSportsData.ts` | EDIT | Nuovo hook `useHighlights(sport, limit)`. |
| `src/components/highlights/HighlightsSection.tsx` | NEW | Sezione completa con header, loading/error/empty, griglia animata, CTA playlist. |
| `src/components/highlights/HighlightCard.tsx` | NEW | Card singola: thumbnail 16:9, overlay play, badge NUOVO/data, titolo, fonte, hover lift, link a YouTube. |
| `src/lib/dateUtils.ts` | EDIT | Aggiungere helper `formatRelativeIT(dateStr)` ("oggi", "1 giorno fa", "3 giorni fa", "2 settimane fa"). Riusabile anche altrove. |
| `src/pages/JuventusPage.tsx` | EDIT | Nuovo tab "Highlights" + render `<HighlightsSection sport="juventus" />`. |
| `src/pages/Formula1Page.tsx` | EDIT | Nuovo tab "Highlights" + render `<HighlightsSection sport="f1" />`. |
| `src/pages/MotoGPPage.tsx` | EDIT | Nuovo tab "Highlights" + render `<HighlightsSection sport="motogp" />`. |
| `README.md` | EDIT | Sezione "Highlights": fonte = feed RSS pubblici YouTube delle 3 playlist ufficiali, no API key, cache 10min, possibile drift se le playlist vengono cancellate o rese private. |
| `changelog.md` | EDIT | `### Added`: sezione Highlights su Juventus/F1/MotoGP da feed RSS YouTube ufficiali (titolo, data, fonte, link reali). |

### Cosa NON cambia

- Nessuna API key richiesta (RSS pubblico).
- Nessuna nuova dipendenza npm o Deno.
- Branch policy invariata: `develop` → PR verso `develop`, assegnata `@matteobern9244`.
- Layout, header, route, tema, hook esistenti.
- Nessun dato hardcoded: titoli/date/video provengono interamente dal feed live.

### Rischi e mitigazioni

- **Playlist YouTube cancellata o resa privata**: feed ritorna 404/vuoto → empty state onesto, nessun crash.
- **Rate-limit YouTube su alto traffico**: cache HTTP 10min lato edge function + `staleTime` 10min React Query. Sufficiente per traffico tipico.
- **Cambio struttura RSS YouTube**: regex parsing è semplice e tollerante; in caso di breaking change, output diventa empty (no errore visibile all'utente, log lato edge).
- **Thumbnail YouTube CDN**: URL `i.ytimg.com/vi/{id}/hqdefault.jpg` è documentato e stabile da anni.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-juventus`.
2. Deploy `highlights-youtube`.
3. `curl .../highlights-youtube?sport=juventus&limit=12` → 12 video reali con titoli leggibili.
4. Apertura preview:
   - `/juventus` → tab Highlights → 12 card con thumbnail, titoli reali, data italiana.
   - `/formula1` → tab Highlights → contenuti Sky Sport F1 reali.
   - `/motogp` → tab Highlights → contenuti motogp.com / canale ufficiale.
   - Click su card apre il video corrispondente su YouTube in nuova tab.
   - CTA "Vedi tutti su YouTube" apre la playlist completa.
5. Mobile: griglia 1 colonna leggibile, thumbnail non distorte.

### Checklist post-edit

1. Edge function `highlights-youtube` deployata e risponde su tutti e 3 gli sport.
2. `useHighlights` integrato e cached 10min.
3. `HighlightsSection` + `HighlightCard` riusati identici nelle 3 pagine.
4. Tab "Highlights" presente in Juventus, F1, MotoGP.
5. UI in italiano, focus-ring accessibile, link `target="_blank" rel="noopener noreferrer"`.
6. `changelog.md` e `README.md` aggiornati con fonte reale (RSS YouTube) e nota sui rischi di drift.
7. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

