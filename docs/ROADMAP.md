# Roadmap

Backlog di Calendar Events. Nasce il **26 agosto 2026** durante l'audit completo
del repository, quando è emerso che il progetto documentava accuratamente il
passato — `changelog.md` è lungo 1.500 righe — ma non aveva nessuna traccia di
quello che restava da fare: le cose note e non risolte vivevano nella testa di
chi le aveva viste.

**Regole d'uso**

- Una voce entra qui quando è una decisione, non un'idea passeggera.
- Ogni voce dichiara il _perché_ e il costo stimato, non solo il _cosa_.
- Quando una voce viene realizzata si sposta in `changelog.md` e si cancella da
  qui. Questo file descrive solo ciò che non esiste ancora.
- Prima di aggiungere una voce, **verifica che non sia già implementata**: la
  verifica si fa sul codice, non a memoria.

## Priorità alta

### La revoca di `pg_net` non è applicabile, e ora sappiamo perché

Provata sul progetto reale il 31 agosto 2026: il `REVOKE` **non ha sollevato
errori e non ha cambiato niente**. Le funzioni appartengono a `supabase_admin`,
le migration girano come `postgres`, e in PostgreSQL un `REVOKE` da chi non è
owner emette un warning e prosegue.

E la revoca corretta — da `PUBLIC`, perché è da lì che `anon` eredita —
**fermerebbe le notifiche**: nella stessa ACL non compare `postgres`, che è il
ruolo del job cron.

Il rischio reale è misurato: con la anon key, `POST /rest/v1/rpc/http_post`
risponde 404 e forzando lo schema PostgREST risponde «Only the following
schemas are exposed: public, graphql_public». Lo schema `net` non ha una porta
e `public` non contiene funzioni da cui rimbalzare.

**Cosa resta da sorvegliare**: che `public` non acquisti funzioni
`SECURITY DEFINER`, e che gli schemi esposti restino `public` e
`graphql_public`. La prima è stata ricontrollata sul database il 5 settembre
2026 — in `public` non c'è nessuna funzione. La seconda **non è leggibile da
SQL** e va verificata dall'esterno, con la anon key. Il ragionamento completo è in
`supabase/migrations/20260831193000_revoke_pg_net_from_client_roles.sql`, che è
stata svuotata e lasciata come nota.

**Costo**: richiede `supabase_admin`, che i progetti non hanno.

### Il dispatcher fa molto lavoro per mandare pochissimo

Il timeout **non è più un problema, ed è misurato**. Il 31 agosto 2026, su
`net._http_response`, 65 giri su 72 finivano in timeout. Ricontrollato il 5
settembre dopo il passaggio a `timeout_milliseconds := 120000`: **72 giri su
72, tutti 200, zero timeout, zero errori.** Quella metà è chiusa.

Resta la seconda, e adesso ha un numero. Fra il 31 agosto e il 5 settembre il
dispatcher ha fatto **1404 giri e ha mandato 10 notifiche**: lo 0,7%. Ogni
giro impagina il calendario Juventus fino a trenta pagine, quindi sono
nell'ordine delle quarantamila sotto-richieste a `sports-football` in cinque
giorni per dieci notifiche.

Serve: ridurre il lavoro per giro. Le strade sono due e non si escludono —
impaginare solo finché servono eventi nella finestra di preavviso invece di
trenta pagine fisse, oppure interrogare meno spesso. La prima è dentro
`supabase/functions/push-dispatcher/index.ts:150`.

**Costo**: medio, e richiede di poter ridistribuire la edge function.

### Rotazione del segreto del dispatcher

`DISPATCH_SECRET` è scritto in chiaro nella migration `20260523084606_*.sql`,
presente nella storia di Git e su GitHub. È l'unica autenticazione di
`push-dispatcher`. Va considerato compromesso: chi legge il repository può far
partire notifiche a tutti gli iscritti.

La migration del Vault qui sopra è il **prerequisito**, non la soluzione:
sposta il segreto in un posto dove si può cambiare senza ricreare il job, ma
non lo cambia. La rotazione vera richiede la dashboard Supabase, perché il
secret della edge function non è raggiungibile da SQL. La procedura in quattro
passi è scritta in fondo a quella migration.

**Costo**: basso come codice, ma richiede accesso alla dashboard Supabase.
**Perché ora**: è l'unico problema di sicurezza del progetto con un impatto
reale. Dettagli in [`SECURITY.md`](SECURITY.md).

## Priorità bassa

### Quello che resta dei componenti giganti

Resta **`StreamingPage`**, 588 righe: dieci stati locali e quattro tabelle
di rendering. La serializzazione dei filtri è già fuori
(`src/lib/streamingFilters.ts`, con i test dell'andata e ritorno) e la
rete c'è — una e2e sul deep-link, che è la parte capace di rompersi in
silenzio, perché la UI continuerebbe a funzionare ignorando l'URL.

**Costo**: medio. **Perché non ora**: quello che resta dentro è JSX
leggibile, e tagliarlo non farebbe guadagnare niente in verificabilità.
È il criterio con cui è stato fatto tutto il resto di questo lavoro, e
qui dice di fermarsi.

Chiuse nel frattempo, e raccontate nei commit su `develop`:
`JuventusPage` (712 → 248 righe), il guscio comune delle quattro pagine
sportive, `CalendarPage` (620 → 371, con la e2e che prima non la
visitava) e la selezione del programma di prima serata di
`TonightTvList`, che ora è una funzione pura con i suoi test.

## Valutate e scartate, per ora

- **TypeScript 7.** Esiste ed è stabile, ma `typescript-eslint` dichiara
  `typescript <6.1.0`: adottarla spegnerebbe il linting type-aware, che vale più
  della versione. Si riprenderà quando typescript-eslint la supporterà.
- **`tw-animate-css` al posto di `tailwindcss-animate`.** È il successore
  pensato per Tailwind 4, ma `tailwindcss-animate` funziona tramite `@plugin` e le
  circa cento classi di animazione in uso non sono coperte da nessun test:
  cambiarle sarebbe un rischio visivo senza un beneficio misurabile.
- **Un framework di i18n.** L'app è italiana per scelta di prodotto, non per
  mancanza di infrastruttura.

## Falsi vuoti — cose che sembrano mancare ma ci sono

| Sembra mancare                        | In realtà                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Gestione offline nelle pagine         | c'è in tutte, `StreamingPage` compresa da agosto 2026                                       |
| Un orologio per i conti alla rovescia | `src/lib/countdownClock.ts`: un timer per tutta l'app, adattivo, che si ferma in background |
| Validazione dei parametri edge        | ogni funzione valida con regex strette prima di interpolare nelle URL a monte               |
| RLS sulle tabelle push                | attiva, con diniego totale per i ruoli client e una policy restrittiva sopra                |
| Test sul fuso orario                  | `src/lib/timezoneConsistency.test.ts`, che copre formattazione **e** confronti              |
