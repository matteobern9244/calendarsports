
## Diagnosi aggiornata (importante: cambia tutto rispetto alle conclusioni precedenti)

Verifica appena fatta direttamente sul sito pubblicato:

1. `https://calendarsports.lovable.app` **monta React** correttamente (non è una pagina bianca da bundle vuoto: lo snapshot HTML mostra il componente `HomePage` renderizzato con il titolo "Prossimi Eventi" e lo spinner "Caricamento prossimi eventi…").
2. Le richieste dal dominio di produzione **arrivano** alle edge functions e ricevono **200 OK** con payload corretti — i log in tempo reale lo confermano per tutte e 4 le funzioni (`sports-f1`, `sports-football`, `sports-tennis`, `sports-motogp`).
3. Il browser (anche in incognito) resta bloccato su `isLoading = true`, quindi **una o più query non passano mai a `success` lato React Query** anche se la rete restituisce 200.
4. "Publish → Up to date" = il commit attuale è già il bundle live, quindi non puoi pubblicare di nuovo manualmente.

Conclusione: **non è un problema di CORS, secrets, GitHub o publish**. È un bug runtime nel bundle frontend prodotto in build di produzione che blocca la transizione `loading → success` di React Query. Le ipotesi più probabili (in ordine):

- **A)** Errore JS lanciato dopo il fetch (es. `forwardRef` warning su `EventCard`/`Badge` che in build minificata diventa eccezione), che fa fallire silenziosamente la query → React Query la marca pending all'infinito.
- **B)** Mismatch fra il bundle servito e il codice corrente: il CDN Lovable potrebbe servire un bundle precedente in cache pur dichiarando "Up to date" (raro ma possibile).
- **C)** Errore in `useMemo` di `Index.tsx` quando uno dei dataset arriva (es. `formatTimeIT` o `formatDateIT` che esplode su uno dei payload), che blocca il render del primo successo e congela l'UI.

## Cosa serve fare in default mode (read+write+exec)

1. **Acquisire i log console+network reali del pubblicato** aprendolo con il browser tool (`browser--navigate_to_url https://calendarsports.lovable.app`, poi `browser--read_console_logs` e `browser--list_network_requests`). Senza questo è cieco — i log che ho ora sono solo della preview.
2. **In base agli errori trovati**, applicare uno di questi fix mirati:
   - se `forwardRef` warning → wrappare `EventCard` con `React.forwardRef` (causa #A)
   - se `TypeError` in `formatDateIT`/`formatTimeIT` → guardia null nel reducer/`useMemo` (causa #C)
   - se nessun errore JS ma le query restano pending → aggiungere logging temporaneo in `callEdgeFunction` e ridistribuire
3. **Forzare un bust della cache CDN** facendo una micro-modifica al bundle (es. bump version in `package.json` + commit) per garantire che il CDN serva il nuovo build, poi richiedere all'utente un hard refresh.
4. **Verificare end-to-end** sul pubblicato (non sulla preview) dopo il fix.

## File potenzialmente toccati

- `src/components/common/EventCard.tsx` (forwardRef se necessario)
- `src/pages/Index.tsx` (guardia su `useMemo` se necessario)
- `src/lib/dateUtils.ts` (guardia null se necessario)
- `package.json` (bump versione per forzare cache bust se necessario)

Nessuna modifica a `main`, GitHub workflow, secrets, edge functions, `supabase/config.toml`. Nessuna modifica a stack o routing. Tutti gli interventi reversibili e isolati a un componente.

## Cosa NON farò

- Non cambierò CORS, allowlist, edge functions o segreti — sono già verificati funzionanti per il dominio di produzione.
- Non chiederò di re-pubblicare manualmente — Lovable dice già "Up to date".
- Non toccherò `main` né suggerirò push.

## Cosa serve da te

Niente. Tutti gli strumenti necessari (browser, deploy, edit) sono disponibili in default mode. Approva il piano e procedo subito con l'apertura del sito pubblicato in browser headless per leggere errori console/network reali, poi applico il fix mirato.
