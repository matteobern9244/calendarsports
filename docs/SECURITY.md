# Sicurezza

Documento sintetico del modello di sicurezza di **Calendar Events v2.10.0**.

> Le affermazioni di questo documento sono state verificate contro il codice il
> **26 agosto 2026**, e quelle sul database contro il database di produzione il
> **31 agosto 2026**. Dove il codice smentiva un'aspettativa, il documento lo
> dice invece di tacerlo: le sezioni «Punti aperti» esistono per questo.
>
> **Rivisto l'11 settembre 2026** per il rilascio 2.10.0, che ha introdotto
> autenticazione e profili: le sezioni sul modello di accesso e sul database
> descrivevano un'app senza utenti e sono state riscritte. I dati sulle policy
> e sulle colonne vengono da `pg_policies` e da `information_schema` letti quel
> giorno sul database di produzione, non dalle migration.

Conviene dirlo subito, perché divide il progetto in due metà con regole
diverse: **i dati sportivi non hanno utenti, le preferenze sì**.

Tutto ciò che l'app mostra — calendari, classifiche, risultati, streaming — è
pubblico, effimero e non è mai stato legato a una persona. Dal rilascio 2.10.0
esiste però un accesso con email e password (o Google, o Apple), gestito da
Supabase Auth, e una tabella `profiles` che conserva **le preferenze
dell'utente**: tema, squadra di calcio, sezioni visibili, e il nome mostrato se
lo si scrive. Non ci sono altri dati personali: nessun pagamento, nessuna
cronologia, nessuna posizione.

Le superfici da difendere sono quindi quattro: l'accesso al database, la
sessione dell'utente, l'esposizione delle edge function e i segreti.

## Accesso al database

Le tabelle sono tre, e **non hanno tutte lo stesso regime**.

`push_subscriptions` e `push_sent_log` hanno RLS attiva e **nessuna policy
permissiva**. La prima migration ne aveva create due
(`Anyone can insert subscription`, `Anyone can update by endpoint`, entrambe con
`WITH CHECK (true)`) e la migration subito successiva le ha rimosse. Una terza
aggiunge una policy **restrittiva** `USING (false)` per `anon` e
`authenticated` su entrambe. Il risultato è un diniego totale per i ruoli
client, con una seconda difesa esplicita sopra: a quelle due tabelle si arriva
solo dalle edge function con la service role key.

`profiles` è l'eccezione, ed è deliberata. Ha quattro policy, tutte per il solo
ruolo `authenticated` e tutte con lo stesso predicato `auth.uid() = id`, una per
`SELECT`, `INSERT`, `UPDATE` e `DELETE`. Il ruolo `anon` non compare in nessuna:
senza sessione la tabella non esiste. Un utente collegato vede e cambia
**soltanto la propria riga**, e la chiave primaria è `auth.users.id`, quindi non
c'è modo di scriverne un'altra: `auth.uid()` viene dal JWT firmato da Supabase,
non da un parametro della richiesta.

Di conseguenza **il frontend parla direttamente con il database**, per questa
tabella e solo per questa: `src/hooks/useProfile.ts` chiama
`supabase.from("profiles")` con la anon key e la sessione dell'utente. Tutto il
resto passa ancora dalle edge function, e nessun componente chiama
`supabase.rpc(...)`. Nessuna funzione `SECURITY DEFINER` scritta a mano esiste
nel progetto, a parte `handle_new_user`, il trigger che crea la riga del profilo
alla registrazione con `SET search_path = public`.

La colonna `favorite_team` è `TEXT` **senza vincolo `CHECK`**, di proposito: un
elenco di squadre congelato nel database renderebbe non aggiornabile la
preferenza di chi tifa una squadra retrocessa. La validazione vive nel codice
(`src/lib/serieATeams.ts`), e la lettura passa da `resolveTeam`, che è totale.
Un valore inatteso in quella colonna non è quindi un modo per far sbagliare
l'app: è una preferenza che ricade sul default.

Dalla 3.3.0 la stessa scelta vale per `start_page`, aggiunta da
`supabase/migrations/20260912142500_profiles_start_page.sql`: `TEXT` con
default `'home'` e **nessun `CHECK`**. La lettura passa da `resolveStartPage`
in `src/lib/startPage.ts`, che è totale: qualunque stringa che non sia una
delle sette pagine previste vale `home`. Un `CHECK` avrebbe congelato nel
database un elenco di pagine che cambia a ogni sezione aggiunta, e avrebbe
fatto fallire la scrittura invece di ricadere su un valore sensato.

Le quattro colonne `show_home`, `show_calendario`, `show_streaming` e
`show_squadra`, aggiunte da
`supabase/migrations/20260912144000_profiles_menu_sections.sql`, sono
`BOOLEAN NOT NULL DEFAULT true` e affiancano le tre che già esistevano. Sono
**preferenze di interfaccia, non permessi**: nascondono la voce nel menù e
nient'altro, e nessuna di esse rende irraggiungibile una pagina. Chi leggesse
`show_streaming = false` come un controllo d'accesso starebbe leggendo male:
non protegge niente, e non c'è niente da proteggere: quei contenuti sono
pubblici e raggiungibili anche senza sessione.

Entrambe le migration usano `ADD COLUMN IF NOT EXISTS` e sono quindi
rieseguibili su un database vuoto, come richiede il contratto.

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

## La sessione dell'utente

L'autenticazione è interamente di Supabase Auth: email e password, Google e
Apple. Il progetto non scrive codice di verifica delle credenziali, non conserva
password e non emette token per conto proprio; `src/contexts/AuthContext.tsx` si
limita ad ascoltare `onAuthStateChange`.

La sessione è **persistita in `localStorage`** con rinnovo automatico del token
(`src/lib/supabaseClient.ts`). È la scelta consueta per una PWA — sopravvive
alla chiusura della scheda, che è ciò che rende utile un'app installata — e ha
il costo consueto: un JWT in `localStorage` è leggibile da qualunque script in
esecuzione sulla pagina, quindi una XSS diventa un furto di sessione. Quel che
si può rubare resta però limitato a ciò che `profiles` contiene: tema, squadra,
voci di menù visibili e pagina iniziale. Nessun dato personale oltre il
`display_name`, che l'utente scrive da sé.

La anon key nel bundle **non è un segreto** e non è una credenziale d'accesso:
identifica il progetto, e da sola non apre nessuna delle tre tabelle. Chi non è
collegato non supera le policy.

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

Nessuno di questi tocca i profili: riguardano tutti le notifiche push e il
CORS, cioè la metà dell'app che non ha utenti. Il danno possibile resta spam di
notifiche e consumo di quota. Le preferenze sono protette da RLS sul database,
non dalla configurazione delle funzioni, e nessuna di queste incoerenze le
raggiunge.

## Il segreto del dispatcher

`push-dispatcher` non è pubblica: richiede l'header `x-dispatch-secret`
confrontato con la variabile d'ambiente `DISPATCH_SECRET`. È la sua **unica**
autenticazione.

> **RUOTATO IL 6 SETTEMBRE 2026. Il valore esposto non è più valido.** Quanto
> segue resta scritto perché descrive un rischio reale durato tre mesi e mezzo,
> e perché la migration incriminata è ancora nella storia di Git.
>
> Il valore precedente era scritto in chiaro dentro la migration
> `supabase/migrations/20260523084606_*.sql`, che è nella storia di Git e su un
> repository GitHub. Chi aveva accesso in lettura al repository poteva invocare
> il dispatcher: inviare notifiche a tutti gli iscritti attivi, ripetutamente, e
> far generare a ogni invocazione sei chiamate verso le funzioni sportive.
>
> Due cifre di questo paragrafo erano sbagliate, e sono state **misurate il 5
> settembre 2026**. Gli iscritti sono cinque righe ma **due abilitate**: il
> dispatcher seleziona `enabled = true`, quindi le notifiche raggiungono due
> browser, non cinque. E «una trentina di sotto-richieste» veniva dal tetto
> `Math.min(total, 30)`, che è un limite e non una misura: `sports-football`
> per la stagione 2026 risponde `total: 47`, `pageSize: 12`, `totalPages: 4`.
> Il giro fa quindi **quattro** chiamate a `sports-football`, più una a
> `sports-f1` e una a `sports-motogp`.
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

**Pezzo due, la rotazione vera — eseguita il 6 settembre 2026, 00:05 CEST.**
Il segreto della edge function non è raggiungibile da SQL, quindi la manovra è
stata fatta a mano dalla dashboard, con la verifica dal connettore.

Ordine seguito, che **inverte** quello scritto in fondo alla migration: prima la
parte lenta (il secret nella dashboard), poi quella istantanea
(`vault.update_secret`). Così la finestra di disallineamento dura secondi
invece dei minuti che servono a incollare e salvare. È stata aperta subito dopo
uno scatto del cron, per stare fra due giri.

Stato verificato dopo:

- `vault.secrets` per `dispatch_secret` ha `updated_at` (22:05:40 UTC) maggiore
  di `created_at` (31 agosto): è la riga che dice se la rotazione è avvenuta.
  Lunghezza passata da 194 a 64 caratteri — il generatore della procedura
  concatena due UUID senza trattini, e 64 caratteri esadecimali restano
  ampiamente sufficienti.
- il giro delle 22:10 UTC ha risposto `200 {"ok":true}`: il valore nel Vault e
  quello nella edge function coincidono.
- **una sola interruzione, e non è stata un 401.** Il giro delle 22:05:00 ha
  risposto `500 {"error":"Server misconfigured"}`, cioè il ramo che scatta
  quando la variabile non esiste: nella dashboard il menu di un secret offre
  solo _Delete_, quindi sostituirlo significa cancellarlo e riaggiungerlo, e il
  cron è passato in quei secondi. Nessuna notifica persa: `sent: 0` su tutti i
  giri della serata, non c'era niente in finestra.

La distinzione fra i due errori conta e va ricordata: **500 significa segreto
assente** e si risolve da sé appena il valore c'è; **401 significa segreto
diverso**, cioè l'isolate ha in memoria il valore vecchio e serve
ridistribuire. Qui non è mai comparso un 401: la funzione rilegge
`Deno.env.get("DISPATCH_SECRET")` a ogni richiesta e ha ripreso il valore nuovo
da sola.

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

`sports-football` accetta anche `team`, confrontato con l'elenco chiuso di
`_shared/serieATeams.ts`: fuori elenco risponde `400`, non un calendario vuoto.
Vale la pena essere precisi sul perché, perché non è lo stesso motivo di
`season`: **`team` non finisce mai in una URL a monte** — i widget Sky sono per
competizione, non per squadra, e il filtro si applica alle partite già
scaricate. Quella whitelist non difende quindi da una path injection: difende il
contratto, e impedisce che una squadra inesistente diventi un calendario vuoto
indistinguibile da una giornata senza partite.

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
