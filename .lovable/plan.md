

## Deep link reali alle piattaforme streaming

### Problema

Cliccando "Vai a Netflix/Prime/Disney+/HBO Max" nel dialog dettaglio uscita (`ReleaseDetailDialog.tsx`), si viene portati alla **homepage generica** della piattaforma (`netflix.com`, `primevideo.com`, ecc.), non alla pagina del singolo titolo. UX scadente: l'utente deve poi cercarlo manualmente.

### Soluzione

Recuperare da TMDB il **link diretto** al titolo sul provider (campo `results.IT.link` di `/watch/providers`) e usarlo come destinazione del bottone "Vai a {provider}". Questo link è il deep link ufficiale JustWatch/TMDB che apre la pagina del titolo sulla piattaforma corretta in regione IT (es. `https://www.netflix.com/title/81234567` o redirect intelligente verso il titolo su Prime/Disney+/Max).

Fallback: se il link non è disponibile, usa la homepage attuale (comportamento corrente).

### Cambio backend

In `supabase/functions/streaming-releases/index.ts`:

1. **Estendere `tmdbItemAvailableIT`** (riga 113) — già scarica `/watch/providers` per regione IT — per restituire **anche** il `link` deep di JustWatch (`json.results.IT.link`), oltre al boolean di disponibilità. Ribattezzata in `tmdbItemProviderInfoIT` che ritorna `{ available: boolean; deepLink: string | null }`.
2. **Estendere `normalizeItem`** per accettare e includere `deepLink: string | null` nel payload di ogni `ReleaseItem`.
3. **Action `credits`** invariata.
4. Cache invariata (la chiave già copre provider+date, e il deep link è stabile per titolo).

Risultato: ogni item nel payload `new-today` avrà un nuovo campo `deepLink`.

### Cambio frontend

In `src/hooks/useStreamingData.ts`:
- Aggiungere `deepLink: string | null` all'interfaccia `ReleaseItem`.

In `src/components/streaming/ReleaseDetailDialog.tsx`:
- Calcolare `targetUrl = item.deepLink ?? PROVIDER_HOMEPAGES[provider]`.
- Cambiare l'`<a href={providerHomepage}>` del bottone "Vai a {provider}" in `<a href={targetUrl}>`.
- Quando si usa il deep link, label invariata ("Vai a {provider}"); quando si fallback alla homepage, comportamento attuale.

### Note tecniche su `link` di TMDB

Il campo `results.IT.link` di `/watch/providers` è fornito da JustWatch (partner ufficiale TMDB) e punta alla pagina del titolo. Tipicamente è un URL `justwatch.com/it/...` che a sua volta redirige al provider corretto, oppure direttamente al provider. Per gli utenti questo è il comportamento atteso: clicco e arrivo sul titolo, non sulla home. Non esistono URL pattern affidabili "puri" provider-side per ogni titolo (Netflix `/title/<id>` richiederebbe un mapping TMDB→Netflix ID che TMDB non espone), quindi il `link` JustWatch è la soluzione corretta e ufficiale.

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/streaming-releases/index.ts` | `tmdbItemAvailableIT` → ritorna `{ available, deepLink }`. Pipeline `fetchWindow` aggiornata per propagare `deepLink` a `normalizeItem`. `normalizeItem` accetta `deepLink` opzionale e lo include nel payload. |
| `src/hooks/useStreamingData.ts` | Interfaccia `ReleaseItem` con nuovo campo `deepLink: string \| null`. |
| `src/components/streaming/ReleaseDetailDialog.tsx` | Bottone "Vai a {provider}" usa `item.deepLink ?? PROVIDER_HOMEPAGES[provider]`. |
| `changelog.md` | Voce sotto Unreleased: "Streaming: bottone 'Vai a {provider}' nel dialog dettaglio ora porta direttamente alla pagina del titolo sulla piattaforma (deep link JustWatch via TMDB), con fallback alla homepage se non disponibile." |

### Cosa NON cambia

- Action `new-today`, validazione provider, fallback widened window.
- Action `credits` e dialog cast.
- Bottone "Dettagli su TMDB".
- Cache TTL, rate limit, CORS.
- Versione resta **2.1.0**.

### Rischi

- Il link JustWatch può occasionalmente puntare a una pagina di disambiguazione invece del titolo specifico (raro, dipende dal mapping JustWatch). Mitigato dal fallback alla homepage.
- Nessun costo extra di chiamate TMDB: `/watch/providers` è già chiamato per validare la disponibilità, leggiamo solo un campo in più dalla stessa risposta.

### Checklist post-edit

1. Deploy edge function `streaming-releases`.
2. Curl `?action=new-today&provider=netflix&dateFrom=...&dateTo=...` → verificare che ogni item abbia `deepLink` valorizzato.
3. `/streaming` tab "Nuove uscite" → aprire un titolo, cliccare "Vai a Netflix/Prime/Disney+/HBO Max" → verifica che si apra la pagina del titolo, non la home.
4. Test fallback: simulare `deepLink: null` (eventuale provider raro) → bottone porta alla homepage come oggi.
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

