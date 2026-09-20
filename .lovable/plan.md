# Migrazione a TanStack Start

Passaggio dell'app dallo stack Classic (Vite + React Router) a TanStack Start, seguendo la procedura della skill `migrate-to-tanstack`. La migrazione avviene tutta in questo turno e si annulla con il revert del messaggio dalla cronologia chat.

## Cosa ho verificato nel progetto

- 13 rotte in `src/App.tsx`, tutte dentro un layout condiviso + una catch-all.
- Provider attorno alle rotte: React Query, Tooltip, Sonner, Auth, Preferenze utente, ErrorBoundary.
- `useSearchParams` usato in una sola pagina (Streaming).
- Nessuna API React Router esotica, nessuna libreria solo-browser a rischio.
- Tema molto personalizzato in `src/index.css` (554 righe, già Tailwind v4 con `@theme`, font Oswald/Inter, palette oro/blu, breakpoint su misura).
- `index.html` personalizzato: manifest, icone, preconnect, preload logo, script tema anti-lampeggio, titolo/descrizione, tag social.
- `src/main.tsx` contiene pulizia di una vecchia preferenza e la registrazione del service worker.
- Service worker scritto a mano (`public/sw.js`), non generato da strumenti: resta com'è.
- 11 funzioni server già attive: restano dove sono, nessuna spostata.

## Cosa farò

1. Sostituzione dell'impalcatura del framework (configurazione, router, entry server, gestione errori).
2. Riporto integrale del tema personalizzato nel nuovo foglio di stile, token per token, con verifica scritta.
3. Unione del `package.json`: le tue dipendenze e i tuoi script restano, quelli del framework vengono aggiornati.
4. Rimozione dei vecchi punti d'ingresso SPA, dopo averne salvato il contenuto.
5. Generazione delle rotte una per file, con layout condiviso, pagina 404, e riporto in testata di tutti i tag di `index.html` (manifest, preconnect, preload, script tema, SEO e social).
6. Riporto del codice d'avvio da `main.tsx` e della registrazione del service worker in forma sicura per il rendering lato server.
7. Adeguamento del client del backend e del compatibility shim per `useSearchParams`.
8. Installazione pulita e correzione dell'ondata di errori di tipo dovuta alle regole più severe.
9. Verifiche finali: build verde, controllo tipi, pagine servite senza errori.

## Punti di attenzione

- **Test e gate locali**: `vitest.config.ts` e `src/test/` vengono rimossi dalla procedura standard. Gli script `test`, `verify`, `test:e2e` restano nel `package.json` ma il collegamento ai test va rifatto in un passaggio successivo. Te lo segnalo alla fine, non lo faccio di nascosto.
- **`tsconfig` multiprogetto**: oggi ci sono quattro configurazioni collegate (app, node, e2e, edge). La nuova impostazione ne usa una sola; `typecheck` (`tsc -b`) verrà riscritto di conseguenza.
- **Service worker e PWA**: il tuo service worker scritto a mano resta intatto e continua a funzionare, con manifest e icone ricollegati.
- **Aspetto grafico**: il riporto del tema è il rischio principale. Lo documento in un file di verifica e controllo le pagine dopo la migrazione.
- Durante il lavoro l'anteprima continua a mostrare la versione attuale; la nuova appare solo a migrazione conclusa.

## Dettagli tecnici

- Template della skill per `vite.config.ts`, `tsconfig.json`, `src/router.tsx`, `src/server.ts`, `src/start.ts`, `src/lib/error-*.ts`, `src/styles.css`, `eslint.config.js`, `components.json`, `bunfig.toml`.
- `QueryClient` con `retry: false`, `staleTime: 5 min`, `refetchOnWindowFocus: false` riportato in `src/router.tsx`.
- Rotte generate sotto `src/routes/`: `__root.tsx` (provider + head + errorComponent), `_layout.tsx` per il layout comune, file per `/`, `/home`, `/calendario`, `/streaming`, `/sinner`, `/squadra/$teamSlug`, `/squadra/$teamSlug/partite/$matchId`, `/formula1`, `/motogp`, `/preferenze`, `/accedi`, `/reimposta-password`, redirect storici `/juventus*`, catch-all 404.
- `StartRoute` e `TeamRoute` conservati come componenti di gate dentro le rispettive rotte.
- `__BUILD_ID__` ridefinito nella nuova configurazione Vite per non rompere la registrazione del service worker.
- Gate di completamento: `bun run build` verde, `bunx tsc --noEmit` pulito, rotte principali servite senza 500.
