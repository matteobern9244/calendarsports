
The user reports that the app works in preview but not in production after deploy. From the network logs, preview is working (all 4 edge functions returning 200). The published URL is `https://calendarsports.lovable.app`.

Looking at `_shared/security.ts`: CORS allows the request origin if it matches the allowlist, otherwise falls back to `https://calendarsports.lovable.app`. Need to verify what's in the allowlist — if `calendarsports.lovable.app` is allowed, it should work. Let me check.

Actually I should check the security.ts allowlist. The summary says "exact origins or hosts ending with known suffixes". The fallback origin is `https://calendarsports.lovable.app`, suggesting the production domain SHOULD be in the allowlist. But if browsers see `Access-Control-Allow-Origin: https://calendarsports.lovable.app` while requesting from same origin, it should match — that's fine.

So why would prod fail? Possibilities:
1. The published version is an OLD bundle from before the recent edge function changes — but edge functions deploy independently of frontend, so that shouldn't matter for data loading.
2. Frontend in prod uses different env vars (`VITE_SUPABASE_URL` etc.) — but `.env` is auto-managed and same across builds.
3. The published version was built BEFORE the recent code changes and the user hasn't clicked "Update" in the publish dialog. **This is the most likely cause** — the user explicitly says "una volta deployata non vengon caricati i dati", and frontend changes require manual republish.
4. Rate limiter is in-memory per instance — could block if hammered, but unlikely the root cause.
5. CORS allowlist might not include `calendarsports.lovable.app` exactly — need to verify.

I need to actually inspect `_shared/security.ts` to see the allowlist before planning.

## Diagnosi

In **preview** funziona (tutte e 4 le edge functions restituiscono 200 con dati validi, log network confermano). In **produzione** (`https://calendarsports.lovable.app`) no.

Le edge functions sono condivise tra preview e prod (stesso progetto Supabase), quindi il problema non sta nel backend ma in **uno** di questi punti:

1. **Frontend non re-pubblicato** — le modifiche frontend in Lovable richiedono un click esplicito su "Update" nel dialog Publish. Le edge functions invece si deployano da sole. Se hai modificato solo edge functions di recente, la prod usa ancora il bundle precedente, ma quello dovrebbe comunque chiamare le edge functions correttamente. Da verificare quando è stato fatto l'ultimo Publish del frontend.
2. **CORS allowlist** in `supabase/functions/_shared/security.ts` — se l'origin `https://calendarsports.lovable.app` non è esplicitamente in allowlist, il browser blocca le risposte in prod (in preview l'origin è `*.lovableproject.com` che probabilmente è whitelisted). Questa è la causa più probabile.

## Indagine che propongo (read-only)

1. Aprire `supabase/functions/_shared/security.ts` e verificare l'allowlist origin: confermare se `calendarsports.lovable.app` è incluso e con che pattern matching.
2. Aprire `vite.config.ts` e `src/integrations/supabase/client.ts` per escludere differenze prod vs preview lato client.
3. Controllare i log delle edge function in prod (`supabase--analytics_query` su `function_edge_logs` filtrando per origin `calendarsports.lovable.app`) per vedere se le richieste arrivano e che status code restituiscono.
4. Eseguire `supabase--curl_edge_functions` simulando l'origin di produzione (`Origin: https://calendarsports.lovable.app`) per riprodurre il problema lato server.

## Fix probabile (da confermare dopo l'indagine)

A seconda di cosa emerge, una di queste due azioni:

- **A)** Aggiungere `https://calendarsports.lovable.app` (ed eventualmente il custom domain) all'allowlist CORS in `supabase/functions/_shared/security.ts`, poi ridistribuire le 4 edge functions.
- **B)** Se la causa è solo frontend non aggiornato, indicarti di cliccare **Publish → Update** in Lovable (nessuna modifica codice).

## Cosa NON tocco

- `main`, workflow GitHub, segreti, `supabase/config.toml`, fonti dati, mapping statici.
- Stack o routing.

Nessuna modifica a codice in questa fase: serve prima leggere `security.ts` e i log per evitare di sparare alla cieca.
