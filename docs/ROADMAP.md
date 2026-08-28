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

### Rotazione del segreto del dispatcher

`DISPATCH_SECRET` è scritto in chiaro nella migration
`20260523084606_*.sql`, presente nella storia di Git e su GitHub. È l'unica
autenticazione di `push-dispatcher`. Va considerato compromesso: chi legge il
repository può far partire notifiche a tutti gli iscritti.

Serve: ruotare il valore nei secrets di Supabase, ricreare il job cron leggendo il
segreto dal Vault invece di inlinearlo, e rendere idempotente la migration
(`cron.unschedule` di un job inesistente solleva, quindi oggi quella migration
fallisce su un database nuovo).

**Costo**: basso come codice, ma richiede accesso alla dashboard Supabase.
**Perché ora**: è l'unico problema di sicurezza del progetto con un impatto reale.
Dettagli in [`SECURITY.md`](SECURITY.md).

### Lo schema `extensions` è accessibile ad `anon`

La migration che installa `pg_net` concede `USAGE` sullo schema `extensions` a
`anon` e `authenticated`. Postgres concede `EXECUTE` alle nuove funzioni a
`PUBLIC` per default: è la metà mancante di una primitiva SSRF, in cui un chiamante
non autenticato potrebbe far partire richieste HTTP dal database.

Serve: `REVOKE USAGE ON SCHEMA extensions FROM anon, authenticated` e
`REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions FROM PUBLIC`.

**Costo**: basso. **Perché ora**: `anon` non ha nessuna ragione legittima di avere
quel permesso in questo progetto.

### Le notifiche possono partire doppie

`push-dispatcher` verifica di non aver già inviato con una `SELECT` e poi scrive
con una `INSERT`. Il cron scatta ogni cinque minuti mentre la finestra di
selezione è di sei: le esecuzioni si sovrappongono di proposito. Due esecuzioni
concorrenti possono superare entrambe il controllo, inviare entrambe, e la
seconda `INSERT` fallisce — ma il suo errore viene scartato senza guardarlo.

Serve: scrivere prima di inviare, con `upsert(..., { ignoreDuplicates: true })`,
e decidere in base all'esito.

**Costo**: basso. **Perché ora**: produce notifiche doppie sui dispositivi reali.

## Priorità media

### I payload delle edge function arrivano come `any`

`callEdgeFunction` in [`src/lib/api/sportsApi.ts`](../src/lib/api/sportsApi.ts)
ritorna `json.data` senza tipo, quindi ogni pagina che la consuma lavora su
`any`: sono venticinque punti, sparsi fra `JuventusPage`, `SinnerPage`,
`Index`, `MotoGPPage`, `Formula1Page` e `JuventusMatchPage`. Un campo
rinominato a monte non produce nessun errore di compilazione: produce
`undefined` a schermo.

È anche il motivo per cui `@typescript-eslint/no-explicit-any` resta spenta in
`eslint.config.js`: riaccenderla senza aver tipizzato il confine
significherebbe venticinque `eslint-disable`.

Serve: schemi al confine, derivati dai payload già tipizzati in
`e2e/support/mockSportsApi.ts`, e `callEdgeFunction<T>` che li applica.
**Nota**: `zod` è stato rimosso dalle dipendenze durante l'audit perché non lo
importava nessuno, quindi il primo passo è reinstallarlo.

**Costo**: medio. **Perché ora**: è il confine fra codice controllato e dati
altrui, l'unico punto dove la tipizzazione compra qualcosa di reale.

### Il calendario ricalcola tutto a ogni render

In [`src/hooks/useCalendarEvents.ts`](../src/hooks/useCalendarEvents.ts)
l'espansione, il filtro e l'ordinamento di circa 350 eventi stanno nel corpo
dell'hook, fuori da qualunque `useMemo`. `CalendarPage` fa scattare un tick
ogni 60 secondi per i conti alla rovescia, e quel tick li invalida tutti.

Nello stesso ambito, `TonightTvList` ha una `useMemo` che dipende da
`[tvQueries]`, cioè dall'array restituito da `useQueries`, che è nuovo a ogni
render: quella memo non ha mai memoizzato niente. Va usata l'opzione `combine`
di `useQueries`, oppure una dipendenza sui `.data`.

**Costo**: basso. **Perché ora**: una `useMemo` che non memoizza è peggio di
nessuna `useMemo`, perché dichiara una garanzia che non c'è.

### L'app installata non funziona offline

`public/sw.js` gestisce solo le notifiche push: non ha un handler `fetch`, quindi
nessuna cache. `OfflineFallback` e `OfflineIndicator` coprono solo il caso in cui
l'app è già aperta. Aprire la PWA senza rete mostra la pagina d'errore del
browser.

Nella stessa voce: il manifest dichiara una sola icona 512×512 usata sia come
`any` sia come `maskable`, senza la zona di sicurezza richiesta, quindi su Android
l'icona viene ritagliata.

**Costo**: medio. **Perché ora**: l'app si dichiara installabile e si comporta
come se non lo fosse.

## Priorità bassa

### Le pagine sport ripetono lo stesso guscio

`Formula1Page`, `MotoGPPage`, `SinnerPage` e `JuventusPage` ripetono ognuna il
guardiano offline, la stessa struttura di `Tabs` e la stessa terna
`LoadingState` / `ErrorState` / `UnavailableExternalSource`. Un componente
`SportPageShell` toglierebbe qualche centinaio di righe.

**Costo**: medio. **Perché non ora**: è pulizia, non correttezza.

### `StreamingPage` fa troppe cose

828 righe: dieci stati locali, la serializzazione dei filtri nell'URL, tre
sotto-componenti definiti in fondo al file e quattro tabelle di dati inline.
`TonightTvList` (760) e `CalendarPage` (600) sono i successivi in fila.

**Costo**: medio-alto. **Perché non ora**: va fatto per estrazioni successive, non
in un colpo solo.

### `push_sent_log` cresce senza limite

Nessuna retention, nessun `DELETE` da nessuna parte. L'indice su `sent_at` esiste
e non è usato da niente. Con pochi iscritti non è un problema oggi.

**Costo**: basso.

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
