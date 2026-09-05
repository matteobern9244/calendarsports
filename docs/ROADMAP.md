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

### Il dispatcher: il codice c'è, il deploy no

**Scritto, testato e su `main` — non distribuito.** Commit `5e1d794`. Finché
non viene ridistribuito, in produzione gira la versione vecchia: questa voce
resta aperta per il deploy, non per il codice.

Il problema misurato: fra il 31 agosto e il 5 settembre 2026 il dispatcher ha
fatto **1404 giri per mandare 10 notifiche**, lo 0,7%, ricaricando l'intera
stagione della Juventus a ogni giro — **sei chiamate a monte**, quattro a
`sports-football` più una a `sports-f1` e una a `sports-motogp`.

La correzione fa due cose che funzionano solo insieme: `upcoming=1`, che
`sports-football` offriva già e nessuno usava, fa scartare a monte le partite
già giocate; l'uscita anticipata (`calendarWindow.ts`, otto test) smette di
chiedere pagine appena la data letta supera `now + 1440 min`. Da sola la
seconda sarebbe inutile per metà stagione — il calendario è ordinato per data
crescente, quindi a maggio ci sarebbero trenta partite passate davanti.

**La misura che dirà se il deploy è arrivato**, da fare dopo:

| Segnale                                          | Prima | Atteso dopo |
| ------------------------------------------------ | ----- | ----------- |
| `eventsConsidered` nella risposta del dispatcher | 339   | ~304        |
| invocazioni orarie di `sports-football`          | ~43   | ~12         |

Il primo si legge in `net._http_response`, il secondo nella pagina Edge
functions del progetto.

**Come si distribuisce, e come no.** Verificato il 6 settembre 2026: allineare
`main` e pubblicare da Lovable **non ridistribuisce le edge function** — dopo
la pubblicazione la pagina della funzione segnava ancora «Last updated 16
giorni fa» e `eventsConsidered` era invariato su due giri. La pagina Edge
functions è di sola lettura: offre _Copy URL_, _View logs_, _View code_, e
nessun pulsante di deploy. Serve la CLI Supabase — che su questa macchina non
è installata, come non lo è Docker:

```
supabase functions deploy push-dispatcher --project-ref jxijruuclgskxlbqittk
```

**Costo**: basso, ormai è solo il deploy. **Perché non è urgente**: nessuno se
ne accorge, e da quando il timeout è a 120 secondi non fa fallire niente.

### Non far girare il cron meno spesso senza toccare il codice

Sta qui perché è la trappola in cui questi documenti erano già caduti, e
qualcuno la riproporrà.

La condizione di invio in `push-dispatcher/index.ts` prende un evento solo se
il giro cade dentro `[t − preavviso, t − preavviso + WINDOW_MS]`. La finestra
non è un margine attorno all'evento: è l'ampiezza dell'unico intervallo in cui
un giro riesce a vederlo. Quindi **è l'intervallo del cron a non poter
superare la finestra**, non il contrario, e i preavvisi non c'entrano —
spostano la finestra, non la allargano.

Simulato il 5 settembre 2026 su una giornata intera, minuto per minuto, per
tutti e tre i preavvisi: `*/5` e `*/6` non perdono niente, **`*/10` perde 432
notifiche su 1440, il 30%**, senza un errore da nessuna parte. Passare a dieci
minuti richiede di portare `WINDOW_MS` ad almeno dieci minuti nel codice.
`*/6` funzionerebbe senza toccare niente e risparmierebbe un giro su sei, ma
consuma tutto il margine fra intervallo e finestra: scartato.

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
