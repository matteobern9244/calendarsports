
The build is failing on `sports-motogp/index.ts` lines 128 and 150 — the non-null assertions I supposedly added in an earlier turn aren't actually present (or were lost). Need to verify the current state of the file before planning the fix. Also the user reports no data loads in preview AND published app — this is almost certainly because the edge functions failed to deploy due to these TS errors, so the old version is running OR all 4 functions are broken.

Let me check the actual file state first.

Plan:

## Diagnosi

Il build delle Edge Functions sta fallendo con 2 errori TypeScript in `supabase/functions/sports-motogp/index.ts` (righe 128 e 150): `cells[0]` è `possibly 'undefined'`. Finché il build non passa, **nessuna delle 4 edge functions viene ridistribuita** — di conseguenza preview e produzione non caricano dati nuovi (e se la versione precedente non è mai stata deployata con successo dopo le ultime modifiche al CORS/rate-limit, le chiamate falliscono del tutto).

Questo è un problema di **codice**, non di configurazione/secrets: tutti i secrets richiesti sono già presenti (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, ecc.) e non serve nulla da parte tua su GitHub o nelle impostazioni.

## Fix proposto

Verifico prima lo stato reale di `sports-motogp/index.ts` (righe 120-160) per capire perché le non-null assertions annunciate in precedenza non risultano applicate. Poi:

1. **Correzione TS in `supabase/functions/sports-motogp/index.ts`** — sostituisco l'accesso `cells[0]` / `cells[N]` con un pattern sicuro:
   ```ts
   const c0 = cells[0]; const c1 = cells[1]; // ecc.
   if (!c0 || !c1 || ...) continue;
   const pos = parseInt(c0.replace(...).trim());
   ```
   Questo soddisfa il type-checker Deno senza usare `!` (più robusto se il parsing HTML cambia).

2. **Deploy esplicito** delle 4 edge functions con `supabase--deploy_edge_functions` per garantire che la nuova versione vada online subito.

3. **Verifica end-to-end** con `supabase--curl_edge_functions` su un endpoint per ciascuna funzione (status 200 + `success: true`).

4. **Report finale** con esito di ciascun endpoint e conferma che preview/produzione tornano a caricare dati.

## File toccati
- `supabase/functions/sports-motogp/index.ts` (solo le 2 zone di parsing classifiche)

Nessuna modifica a `main`, a workflow Git, a secrets o a configurazione Lovable. Nessun rischio per il sync GitHub↔Lovable.
