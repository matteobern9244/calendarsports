# Sicurezza

Documento sintetico del modello di sicurezza di **Calendar Events v2.8.0**.

> Le affermazioni di questo documento sono state verificate contro il codice il
> **26 agosto 2026**, e quelle sul database contro il database di produzione il
> **31 agosto 2026**. Dove il codice smentiva un'aspettativa, il documento lo
> dice invece di tacerlo: le sezioni «Punti aperti» esistono per questo.

Il modello è insolito e conviene dirlo subito: **l'app non ha autenticazione,
non ha utenti e non conserva dati personali oltre alle iscrizioni alle notifiche
push**. Non c'è una sessione da rubare né un profilo da violare. Le superfici che
restano sono tre: l'accesso al database, l'esposizione delle edge function e i
segreti.

## Accesso al database

Le due tabelle hanno RLS attiva e **nessuna policy permissiva**. La prima
migration ne aveva create due (`Anyone can insert subscription`,
`Anyone can update by endpoint`, entrambe con `WITH CHECK (true)`) e la migration
subito successiva le ha rimosse. Una terza aggiunge una policy **restrittiva**
`USING (false)` per `anon` e `authenticated` su entrambe le tabelle.

Il risultato è un diniego totale per i ruoli client, con una seconda difesa
esplicita sopra. Nessuna funzione `SECURITY DEFINER` esiste nel progetto.

Tutti gli accessi passano dalle edge function che usano la service role key, e
nessun componente del frontend chiama `supabase.from(...)` né `supabase.rpc(...)`.

### Retention di `push_sent_log`

`supabase/migrations/20260905184700_push_sent_log_retention.sql` aggiunge un job
`pg_cron` giornaliero che cancella le righe più vecchie di trenta giorni, più
una cancellazione immediata. Prima non c'era nessun `DELETE` in tutto il
progetto: la tabella poteva solo crescere, alimentata da un job che gira ogni
cinque minuti.

La migration **non crea nessuna funzione**: il `DELETE` sta nel corpo del job.
È voluto, ed è la ragione per cui compare qui e non solo nel changelog — la
condizione da sorvegliare dichiarata più sotto è che `public` non acquisti
funzioni `SECURITY DEFINER`, e il modo più semplice di rispettarla è non
aggiungere funzioni.

Trenta giorni non sono un compromesso: la finestra in cui una riga impedisce
davvero un doppione dura **sei minuti**, quanto la finestra di invio del
dispatcher. Oltre quella, la riga è solo la traccia di ciò che è stato mandato.

**Applicata e verificata il 5 settembre 2026.** Prima: 671 righe, di cui 566
oltre i trenta giorni — l'84%, con la più vecchia del 7 maggio. Dopo: 105
righe, `da_cancellare` = 0, righe recenti e cinque iscritti intatti. Il job
`push-sent-log-retention` è attivo, gira alle 03:17 UTC come `postgres`.

Prima di cancellare è stata verificata l'unica cosa che poteva far danno: che
nessuna riga da cancellare puntasse a un evento ancora futuro. Gli `event_id`
sono per numero di round, e i round cancellati erano già passati.

> **Nota sul registro delle migration.** Questa è stata applicata eseguendo
> l'SQL direttamente e non compare in `supabase_migrations.schema_migrations`.
> Non è una dimenticanza: **il registro si ferma al 23 maggio 2026** e non
> contiene nemmeno le due migration del 31 agosto, che pure sono applicate e
> funzionanti. In questo progetto le migration recenti si applicano a mano, e
> tutte e tre sono scritte per essere rieseguibili.

### `pg_net` è raggiungibile dai ruoli client

Verificato sul database reale il **31 agosto 2026**, e la diagnosi che
circolava era sbagliata nel punto che conta: **`pg_net` non è rilocabile**.
Nonostante la migration `20260523083929_*.sql` la installi
`WITH SCHEMA extensions`, le sue funzioni vivono nello schema `net`. Chi
cercasse il problema in `extensions` non lo troverebbe.

Misurato: dodici funzioni `pg_net` nello schema `net` — fra cui
`net.http_post`, `net.http_get`, `net.http_delete` — con `EXECUTE` concesso ad
`anon` e `authenticated`, che hanno `USAGE` sia su `net` sia su `extensions`.

**Quanto è grave davvero.** Lo schema `public` non contiene nessuna funzione e
PostgREST non espone `net`: oggi quel privilegio non ha una porta da cui essere
usato. È difesa in profondità, non un buco aperto. Basterebbe però una funzione
`SECURITY DEFINER` in `public`, o un cambio negli schemi esposti, perché
diventasse metà di una primitiva SSRF con il database come mittente.

**La revoca non è applicabile, e l'abbiamo scoperto provandoci.** Il 31 agosto
2026 la migration è stata eseguita davvero sul progetto: non ha sollevato
errori e non ha cambiato niente. Rileggendo i privilegi dopo, `anon` poteva
ancora eseguire tutte e dodici le funzioni.

Due ragioni, entrambe verificate:

1. **Le funzioni appartengono a `supabase_admin`.** Le migration girano come
   `postgres`, che non è superuser né membro di quel ruolo. In PostgreSQL un
   `REVOKE` fatto da chi non è owner né ha `GRANT OPTION` emette un warning e
   prosegue: nessun errore, nessun effetto. È il modo peggiore in cui una
   migration può sbagliare — applicata, sembra riuscita.
2. **La revoca corretta fermerebbe le notifiche.** L'ACL reale è
   `=X/supabase_admin`: il grantee vuoto significa `PUBLIC`, e `anon` non ha
   nessun grant diretto — eredita da lì. Ma nella stessa ACL non compare
   `postgres`, che è il ruolo con cui gira il job cron del dispatcher.
   Revocare da `PUBLIC` senza prima concedere esplicitamente a `postgres`
   spegnerebbe le push, e anche quel `GRANT` richiede di essere owner.

**Il rischio reale, misurato dall'esterno** con la anon key pubblica:
`POST /rest/v1/rpc/http_post` risponde 404, e forzando `Accept-Profile: net`
PostgREST risponde `PGRST106 — Only the following schemas are exposed: public,
graphql_public`. Lo schema `net` non è raggiungibile dall'API e `public` non
contiene nessuna funzione da cui rimbalzare: il privilegio c'è e non ha una
porta.

Resta difesa in profondità mancante, non un buco aperto. Le due condizioni che
lo terrebbero tale sono verificabili da qui e vanno tenute d'occhio: `public`
senza funzioni, e nessuno schema esposto oltre a `public` e `graphql_public`.

**Ricontrollate il 5 settembre 2026.** In `public` non c'è nessuna funzione —
non zero `SECURITY DEFINER`, proprio zero funzioni: manca il piano d'appoggio,
non solo il trampolino. La seconda condizione **non è leggibile da SQL**:
l'elenco degli schemi esposti non è impostato né a livello di database né di
ruolo, vive nella configurazione del progetto. Quella metà resta verificata
solo per via empirica, dalla risposta di PostgREST del 31 agosto, e va
ricontrollata dall'esterno.
Il ragionamento completo è dentro
`supabase/migrations/20260831193000_revoke_pg_net_from_client_roles.sql`, che
è stata svuotata e lasciata come nota proprio perché nessuno riscriva la stessa
migration fra sei mesi.

## Esposizione delle edge function

`supabase/functions/_shared/security.ts` fornisce CORS e rate limit a ogni
funzione pubblica.

**Rate limit**: 60 richieste al minuto per IP, per funzione (`push-subscribe`
scende a 30). È in memoria e per isolate: si azzera a ogni cold start e non è
condiviso fra istanze concorrenti. L'IP arriva dall'header `x-forwarded-for`, che
il client può scrivere. **È un ammortizzatore, non un controllo di sicurezza**:
niente di importante deve dipenderne.

### Punti aperti dichiarati

| Cosa                                                                                                  | Perché è aperto                                                                                          |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| L'allowlist CORS accetta qualunque sottodominio `.lovable.app`, `.lovableproject.com`, `.lovable.dev` | copre anche progetti Lovable di altri utenti. Restringerla ai domini propri richiede di conoscerli tutti |
| Gli `origin` di localhost sono ammessi anche in produzione                                            | comodo in sviluppo, inutile e non necessario in produzione                                               |
| `push-vapid-key` non ha rate limit                                                                    | restituisce solo una chiave pubblica, ma è un'incoerenza rispetto a tutte le altre                       |
| `push-subscribe` non verifica il possesso dell'endpoint                                               | chi conosce l'endpoint push di un altro browser può disattivargli le notifiche o cambiargli gli anticipi |
| `verify_jwt` non è dichiarato in `supabase/config.toml`                                               | la configurazione reale vive nella dashboard: la posture non è riproducibile dal repository              |

Nessuno di questi espone dati personali, perché non ce ne sono. Il danno
possibile è spam di notifiche e consumo di quota.

## Il segreto del dispatcher

`push-dispatcher` non è pubblica: richiede l'header `x-dispatch-secret`
confrontato con la variabile d'ambiente `DISPATCH_SECRET`. È la sua **unica**
autenticazione.

> **Il valore di quel segreto è scritto in chiaro dentro la migration
> `supabase/migrations/20260523084606_*.sql`, che è nella storia di Git e su un
> repository GitHub.** Chi ha accesso in lettura al repository può invocare il
> dispatcher: inviare notifiche a tutti gli iscritti, ripetutamente, e far
> generare a ogni invocazione una trentina di sotto-richieste verso
> `sports-football`.
>
> Va considerato compromesso. Riscrivere la storia di `main` non è praticabile
> con la sincronizzazione Lovable attiva: è la rotazione a neutralizzare il
> valore esposto, non la cancellazione.

La correzione è in due pezzi, ed è importante non confonderli.

**Pezzo uno, applicato il 31 agosto 2026.**
`supabase/migrations/20260831193100_cron_dispatch_secret_from_vault.sql` sposta
il segreto dal corpo del job al Vault e fa leggere al job il valore a ogni
esecuzione. Non cambia il valore: lo **estrae dal job stesso**, quindi si può
applicare senza perdere nessuna notifica. Rende anche il job rieseguibile —
oggi `cron.unschedule` di un job inesistente solleva, quindi la migration del
23 maggio fallisce su un database nuovo.

**Pezzo due, la rotazione vera.** Richiede la dashboard: il secret
`DISPATCH_SECRET` della edge function non è raggiungibile da SQL. Dopo il pezzo
uno diventa `vault.update_secret(...)` più l'aggiornamento del secret, senza
toccare il job. La procedura in quattro passi è in fondo a quella migration.

Finché il pezzo due non è fatto, **il valore su GitHub resta valido**. Il pezzo
uno da solo non è una mitigazione: è il prerequisito che la rende facile.

Stato dopo l'applicazione, verificato il 31 agosto 2026: `dispatch_secret` è
nel Vault e il suo valore **coincide** con quello che era nel job (confrontato
con un'uguaglianza, non a occhio); il job è stato ricreato, è attivo, gira come
`postgres` ogni cinque minuti, e il suo corpo non contiene più nessuna stringa
esadecimale lunga. La sottoquery che legge il Vault restituisce davvero 194
caratteri e non `NULL` — che era il modo silenzioso in cui questa migration
poteva fallire, lasciando il job a mandare un header vuoto e il dispatcher a
rispondere 401.

## Segreti e variabili

| Dove                    | Cosa contiene                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `.env` (tracciato)      | solo valori pubblici: URL del progetto, anon key, project id                                            |
| `.env.local` (ignorato) | sovrascritture personali                                                                                |
| Secrets Supabase        | `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `TMDB_API_KEY`, `DISPATCH_SECRET` |

`.env` è tracciato di proposito: serve a Lovable per il build. L'anon key è
progettata per viaggiare nel bundle del browser e le tabelle sono in diniego
totale, quindi la sua presenza nel repository non aggiunge esposizione. La stessa
chiave compare come valore di fallback in `src/lib/supabaseClient.ts` e in
`index.html`.

Quel fallback ha però un effetto collaterale: se un giorno l'anon key venisse
ruotata, una build senza le variabili d'ambiente continuerebbe a usare quella
vecchia **senza fallire**. Un errore di configurazione diventa silenzioso invece
che rumoroso.

`push-dispatcher/env.ts` fa la cosa giusta: solleva all'avvio se un segreto
manca, invece di proseguire con `undefined`.

## Validazione degli input

È la parte più solida del backend. Ogni funzione valida i parametri con
espressioni regolari strette prima di interpolarli in una URL a monte —
`season` deve essere `^\d{4}$`, gli id numerici `^\d{1,9}$`, `family` e `sport`
sono confrontati con un elenco chiuso, `page` e `pageSize` sono limitati. I
commenti nel codice dichiarano che la ragione è impedire la path injection verso
i provider.

`push-subscribe` limita la lunghezza dell'endpoint a 2000 caratteri, tronca lo
user agent a 500 e accetta come anticipo solo i tre valori previsti.

Nessuna funzione lascia trapelare il dettaglio delle eccezioni: il ramo di
cattura finale risponde sempre con un generico «Errore interno del server», e
nessuna chiave API viene mai riflessa in una risposta.

## File da non modificare a mano

`supabase/functions/_shared/security.ts`, `supabase/functions/push-dispatcher/*`,
`src/lib/supabaseClient.ts` (unico punto autorizzato a creare il client),
`src/integrations/supabase/types.ts` (generato), e le migration già applicate.

## Riferimenti

- Regole operative: [`../AGENTS.md`](../AGENTS.md).
- Architettura e schema: [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Fonti dati e cache: [`DATA_SOURCES.md`](DATA_SOURCES.md).
