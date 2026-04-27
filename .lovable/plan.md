Ho ricontrollato frontend, hook, chiamate di rete e funzione `streaming-releases`. Ci sono due problemi concreti da correggere:

1. Il frontend sta usando correttamente `new-italy`, ma la vista mostra solo una selezione a pagina e non espone abbastanza chiaramente la finestra effettiva usata dal backend quando TMDB non trova risultati nella finestra richiesta.
2. Nel backend restano ancora codice e commenti legacy basati su Network/Company TMDB, mentre la logica attiva usa i Watch Provider. Questo crea ambiguità e aumenta il rischio che i risultati non siano coerenti con ciò che ci aspettiamo dai filtri provider.

Piano di intervento:

1. Pulizia e riallineamento backend TMDB
   - Rimuovere o isolare il codice legacy non usato basato su `with_networks` / `with_companies` per Netflix, Prime Video, Disney+ e HBO Max.
   - Mantenere una sola sorgente logica per i filtri provider: `watch_region=IT` + `with_watch_providers` + validazione finale su `/watch/providers` in `results.IT.flatrate`.
   - Per `provider=all`, limitare i risultati ai quattro provider selezionabili in UI quando l’utente sta nella sezione “Nuove uscite” principale, evitando che Apple TV+, Paramount+, RaiPlay, Mediaset Infinity, ecc. entrino nel risultato “Tutti” se l’intento è confrontare solo Netflix/Prime/Disney+/HBO Max.
   - Aumentare il numero di pagine TMDB lette dove serve, così i provider con pochi titoli recenti non risultano artificialmente vuoti.

2. Correzione frontend dei filtri
   - Verificare che ogni click su Netflix, Prime Video, Disney+ e HBO Max produca una query distinta con `provider=<id>` e reset pagina a 1.
   - Rendere visibile nella UI il riepilogo attivo: provider, tipo, genere, ordinamento e finestra effettiva usata (`dateFrom/dateTo` oppure `effectiveFrom/effectiveTo`).
   - Correggere il testo informativo: oggi “Prossimi 7 giorni” può mostrare una finestra allargata senza che sia evidente; renderlo esplicito.
   - Assicurare che la lista mostrata corrisponda sempre ai provider presenti in `availableProviders` del payload.

3. Aggiornamento sincronizzazione/cache frontend
   - Aggiornare `useSyncAll` perché prefetchi la stessa query usata dalla pagina (`new-italy`) invece della vecchia `new-today`, così “Sincronizza” non scalda cache obsolete.
   - Valutare se ridurre o invalidare lo `staleTime` per le nuove uscite durante il cambio filtri, evitando che l’utente veda risultati precedenti.

4. Verifica reale dei quattro provider
   - Testare direttamente la funzione dati per:
     - `provider=netflix`
     - `provider=prime`
     - `provider=disney`
     - `provider=hbo`
     - `provider=all`
   - Controllare che ogni item restituito includa nel payload `availableProviders` il provider selezionato con tipo `flatrate`.
   - Verificare un caso specifico come Disney+ e titoli Marvel/Daredevil tramite disponibilità italiana TMDB, tenendo chiaro che TMDB non espone la “data ingresso in piattaforma”, ma la data uscita/first air date.

5. Versione e changelog
   - Aggiornare `APP_VERSION` a una nuova patch per forzare il bundle aggiornato.
   - Aggiornare `changelog.md` spiegando che la sezione streaming è ora allineata ai Watch Provider italiani TMDB e che “Tutti” considera solo i quattro provider selezionabili.

File previsti:
- `supabase/functions/streaming-releases/index.ts`
- `src/pages/StreamingPage.tsx`
- `src/hooks/useStreamingData.ts` se serve rifinire chiavi/cache
- `src/hooks/useSyncAll.ts`
- `src/lib/version.ts`
- `changelog.md`

Verifiche previste:
- Test diretto della backend function per tutti e quattro i provider.
- Controllo delle query frontend dai network logs.
- Build/lint se disponibili in modalità implementazione.
- Nessuna modifica a workflow Git, segreti, file `.env` o client backend auto-generati.