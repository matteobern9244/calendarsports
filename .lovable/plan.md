

## Badge "giorni mancanti" sulle release

### Cosa aggiungere

Accanto al titolo di ogni card nella griglia "Nuove uscite" (tab `releases` di `/streaming`), un piccolo badge che indica la distanza in giorni dalla `releaseDate` rispetto a oggi (fuso `Europe/Rome`):

- `releaseDate < oggi` → "Già uscito" (variante neutra/muted)
- `releaseDate === oggi` → "Oggi" (variante gold, accento brand)
- `releaseDate === domani` → "Domani" (variante gold soft)
- `releaseDate > domani` → "Tra N giorni" (variante outline)
- `releaseDate` mancante o invalida → nessun badge

Calcolo della differenza in **giorni di calendario** (non ore): si confrontano le date in timezone `Europe/Rome` azzerando l'orario, così "oggi" resta coerente per tutto il giorno italiano.

### File da modificare

| File | Modifica |
|---|---|
| `src/lib/dateUtils.ts` | Nuova funzione `daysUntilRome(dateIso: string): number \| null` che ritorna la differenza in giorni di calendario tra `dateIso` e oggi in `Europe/Rome`. Ritorna `null` per input non valido. |
| `src/components/streaming/ReleaseCountdownBadge.tsx` (nuovo) | Componente piccolo che riceve `releaseDate: string` e renderizza il badge con label + variante stile coerente con design tokens (gold per "Oggi"/"Domani", outline per futuro, muted per passato). Usa `Badge` di shadcn o un `<span>` con classi tailwind allineate al resto della UI streaming. |
| `src/pages/StreamingPage.tsx` | Importare il nuovo badge e renderizzarlo nella griglia release accanto al titolo della card (stesso blocco dove oggi vengono mostrati `title` + `formatDateIT(releaseDate)`). |
| `changelog.md` | Voce sotto 2.1.0: "Streaming: badge 'giorni mancanti' su ciascuna nuova uscita (Oggi / Domani / Tra N giorni / Già uscito)." |

### Comportamento atteso

- Badge sempre visibile su ogni card release con `releaseDate` valida.
- Layout card invariato: il badge si affianca al titolo o va sotto su mobile se manca spazio (wrap naturale via `flex-wrap`).
- Nessun cambio a `ReleaseDetailDialog`, filtri, range, fallback widened.
- Versione resta **2.1.0**.

### Cosa NON cambia

- Shape payload edge function `streaming-releases`.
- Hook `useReleasesByProvider` e `ReleasesPayload`.
- Logica filtraggio IT (flatrate + per-item validation).
- Default famiglia TV su RAI, default range `30d`.

### Dettagli tecnici

- `daysUntilRome` usa `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })` per ottenere `YYYY-MM-DD` di oggi e della release, poi calcola la differenza in giorni via `Date.UTC` per evitare drift DST. Stesso pattern già usato in `todayRomeISO` e `addDaysISO`.
- Badge sfrutta classi tailwind con tokens semantici (`bg-[hsl(var(--gold))]/10`, `border-[hsl(var(--gold))]/30`, `text-foreground`, `text-muted-foreground`) — niente colori hardcoded.
- Accessibilità: `aria-label="Mancano N giorni all'uscita"` o equivalente per i casi non banali.

### Checklist post-edit

1. Verifica visiva su `/streaming?tab=releases` desktop + mobile per ogni provider.
2. Verifica casi edge: release di oggi, di domani, futura, passata (può capitare con `widenedWindow`).
3. `npm run lint` + `npm run build`.
4. Aggiornare `changelog.md` (versione invariata 2.1.0).
5. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

