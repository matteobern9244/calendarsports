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

### Due migration scritte, nessuna applicata

Il lavoro di codice è fatto; manca l'applicazione, che tocca il database di
produzione e non passa da qui.

**`20260831193000_revoke_pg_net_from_client_roles.sql`** toglie ad `anon` e
`authenticated` l'accesso alle funzioni di `pg_net`.

> La diagnosi originale di questa voce era imprecisa e va corretta, perché
> manderebbe a cercare nel posto sbagliato: **`pg_net` non è rilocabile**.
> Nonostante la migration del 23 maggio l'abbia installata
> `WITH SCHEMA extensions`, le sue funzioni vivono nello schema `net`.
> Verificato sul database reale il 31 agosto 2026: dodici funzioni in `net`,
> `anon` e `authenticated` con `EXECUTE` su tutte e `USAGE` su entrambi gli
> schemi.
>
> Quanto è grave davvero, misurato e non supposto: lo schema `public` non
> contiene **nessuna** funzione e PostgREST non espone `net`, quindi oggi il
> privilegio non ha una porta da cui essere usato. È difesa in profondità, non
> un buco aperto — ma basterebbe una `SECURITY DEFINER` in `public` perché lo
> diventasse, e quel permesso non serve a nessuno.

**`20260831193100_cron_dispatch_secret_from_vault.sql`** rende il job cron
rieseguibile (`cron.unschedule` di un job inesistente solleva, quindi oggi
quella migration fallisce su un database nuovo) e sposta il segreto nel Vault.
Non cambia il valore: lo estrae dal job stesso, quindi si applica **senza
perdere nessuna notifica**.

**Costo**: applicarle. **Perché ora**: sono scritte e verificate contro lo
schema reale; finché restano file non proteggono niente.

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

## Priorità media

### Il confine streaming è dichiarato, ma non verificato

Da quando `callEdgeFunction` valida i payload con gli schemi di
[`src/lib/api/schemas.ts`](../src/lib/api/schemas.ts), le cinque azioni
sportive controllano davvero cosa ricevono. Le cinque azioni di
`streaming-tv` e `streaming-releases` no: passano da `declaredOnly`, che
tipizza e basta. È lo stesso grado di garanzia di prima — nessuno — ma ora è
scritto e si trova con un grep invece di nascondersi dentro `any`.

Serve: schemi ricavati da quello che le due edge function producono davvero
(TMDB per le uscite, palinsesti per la TV), non dalle interfacce scritte a
mano, che potrebbero già essere in ritardo sul codice.

**Costo**: medio. **Perché ora**: `StreamingPage` è la pagina più grande del
progetto e la sola dove un campo rinominato a monte non fa rumore.

### I font si perdono, offline

Il service worker adesso c'è e copre documento, `/assets/` e le risorse di
root. Restano fuori i font di Google (`fonts.gstatic.com`), che sono
cross-origin: offline l'app si apre ma ripiega sui font di sistema.

Serve: ospitare i font nel progetto invece di prenderli da un CDN. È anche una
questione di privacy e di una richiesta di rete in meno all'avvio.

**Costo**: basso. **Perché non ora**: l'app resta leggibile e usabile; è un
degrado estetico, non funzionale.

### Il bottone «+N altri» del calendario non fa quello che dice

Nella vista mese, quando un giorno ha più di quattro eventi compare «+N
altri». Il testo promette di mostrare gli altri; il codice fa
`setSelectedEvent(dayEvents[4])`, cioè apre il dettaglio del quinto e basta.

Trovato correggendo i nomi accessibili: l'`aria-label` ora dice la verità
sull'azione, ma l'azione resta quella sbagliata.

Serve: aprire l'elenco del giorno, o passare alla vista agenda filtrata su
quel giorno.

**Costo**: basso.

## Priorità bassa

### Le pagine sport ripetono ancora il guscio esterno

La parte interna è fatta: la terna `LoadingState` / `ErrorState` /
`UnavailableExternalSource`, che si ripeteva dieci volte (una per scheda), vive
ora in `src/components/common/DataSection.tsx`.

Resta il contorno, ripetuto quattro volte, una per pagina:

- il **guardiano offline** — lo stesso `if` che verifica «nessuna sezione ha
  dati _e_ tutte sono in errore _e_ siamo offline» e ritorna `OfflineFallback`
  dentro `div.container.py-8.sm:py-12`, ~12 righe per pagina;
- l'**intestazione con le tab** — stesso contenitore, `SectionHeader` dentro un
  `div.mb-2`, `Tabs` con `TabsList` e trigger che ripetono la stessa classe,
  ~15 righe per pagina. `SinnerPage` usa una `TabsList` più semplice delle
  altre tre.

**Costo**: basso. **Perché non ora**: sono ~50 righe in tutto, contro le
centinaia che valeva la terna. È pulizia, non correttezza, e il guadagno per
riga toccata è molto più basso di quello appena incassato.

### `StreamingPage` fa troppe cose

788 righe: dieci stati locali, la serializzazione dei filtri nell'URL, tre
sotto-componenti definiti in fondo al file e quattro tabelle di dati inline.
`TonightTvList` (802) e `CalendarPage` (695) sono i successivi in fila.
Conteggi verificati il 28 agosto 2026.

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
