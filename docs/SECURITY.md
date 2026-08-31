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

La correzione è scritta e **non ancora applicata**:
`supabase/migrations/20260831193000_revoke_pg_net_from_client_roles.sql`.
Revoca solo ciò che appartiene a `pg_net`, letto dal catalogo, invece
dell'intero schema `extensions`, dove vivono anche pgcrypto, uuid-ossp e
pg_stat_statements.

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

**Pezzo uno, scritto e non applicato.**
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

Stato verificato il 31 agosto 2026: il Vault esiste (`supabase_vault`, schema
`vault`) e contiene zero segreti; il job `push-dispatcher-every-5-min` è attivo,
gira come `postgres` ogni cinque minuti, e il suo corpo contiene ancora
l'header in chiaro.

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
