# Fonti dati

Catalogo delle fonti di **Calendar Events v2.10.0**, funzione per funzione e
azione per azione.

Fonte di verità per questo documento: `supabase/functions/*/index.ts`. Quando il
codice e questo file divergono, vince il codice: aggiornare qui.

Esiste perché l'app non possiede nessuno dei dati che mostra. Non c'è una tabella
di partite, di gare o di programmi TV: ogni schermata è il risultato di una
richiesta fatta al momento verso qualcun altro. Sapere **quale** qualcun altro, e
quanto è affidabile, è la premessa di ogni intervento su questa parte.

## Le tre nature di un dato

| Natura              | Che cosa vuol dire                                                    | Come si rompe                               |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| **API reale**       | un endpoint pubblico che restituisce JSON con un contratto dichiarato | cambia versione, va in rate limit, va giù   |
| **Scraping HTML**   | una pagina web pensata per essere letta da persone, non da programmi  | cambia il layout, e nessuno ce lo dice      |
| **Dataset statico** | valori scritti nel codice, aggiornati a mano                          | invecchia in silenzio al cambio di stagione |

La regola che ne discende sta in
[`AGENTS.md`](../AGENTS.md): **non presentare mai come fonte ufficiale ciò che è
statico o scrapato**.

## Catalogo per funzione

### `sports-f1`

Azioni: `calendar`, `driver-standings`, `constructor-standings`, `last-result`,
`next-race`.

- **API reale**: Jolpica/Ergast (`api.jolpi.ca/ergast/f1/`) per calendario,
  classifiche e risultati; OpenF1 (`api.openf1.org/v1/drivers`) per le foto dei
  piloti, e un suo fallimento viene ignorato senza rumore.
- **Dataset statico**: `F1_DRIVER_PHOTOS` e `F1_CONSTRUCTOR_LOGOS`, che hanno la
  **precedenza** sulle foto di OpenF1. I percorsi puntano a `teams/2025/` del CDN
  Formula 1: sono una cosa che invecchia.
- **Cache**: in memoria, 5 minuti. Su fallimento riprova tre volte con backoff, e
  se non ce la fa serve la cache scaduta invece di un errore — scelta nata dai
  429 di Jolpica.
- `meta.dataSource` è sempre `live`.

### `sports-football`

Azioni: `standings`, `calendar`, `next-match`, `team-squad`, `lineups`, `player-stats`.

Parametri: `season` (quattro cifre) e `team` (slug, nome o alias di una squadra
di Serie A). `team` assente vale `juventus`; un valore fuori dall'elenco
risponde `400`, non un calendario vuoto. `standings` ignora `team`: la
classifica è la stessa per tutte e venti.

- **Scraping HTML**: i widget di `sport.sky.it`, da cui si estrae un JSON
  incapsulato in `<script data-props="true">`, con un fallback all'attributo
  `model=` del formato precedente.
- **API reale**: Lega Serie A (`api-sdp.legaseriea.it`) per le emittenti. L'id
  di stagione si **risolve a runtime** da `/competitions/{id}/seasons`, cercando
  la voce il cui `seasonName` inizia con l'anno richiesto, e si memorizza per la
  vita dell'isolate. Prima era una mappa scritta a mano, ed era sbagliata: 2026
  e 2025 puntavano allo stesso id, quindi il calendario in corso mostrava le
  emittenti della stagione precedente. Se la risoluzione fallisce la funzione
  serve il calendario **senza emittenti**, non con quelle di un'altra stagione.
- **Dataset statico**: i **colori sociali** delle venti squadre, in
  `src/lib/teamColors.ts`. Scritti a mano dalle divise, **non ufficiali**:
  nessuna fonte interrogata dall'app li pubblica. Uno solo per squadra — le
  varianti chiara, scura e leggibile si calcolano — e un guardiano verifica che
  le chiavi siano esattamente i venti slug del dataset. Juventus e Udinese
  giocano in bianconero, che non è un accento: la prima tiene l'oro storico
  dell'app, la seconda un grigio-blu che è un ripiego dichiarato, non la sua
  identità.
- **Dataset statico**: gli id competizione. Tre principali (Serie A, Champions,
  Coppa Italia) più ventiquattro sondati in modo opportunistico, ignorando i 404.
  E l'elenco delle venti squadre, in `_shared/serieATeams.ts`, copia generata di
  `src/lib/serieATeams.ts`.
- **HTML scrapato (`team-squad`)**: la pagina rosa di Sky,
  `sport.sky.it/calcio/squadre/{slug}/rosa`. Non è un widget e non è JSON: è una
  tabella `ftbl__team-players-table` server-rendered, parsata da
  `teamSquad.ts`. Verificata dal vivo sulle venti squadre l'11 settembre 2026:
  struttura identica, quattro reparti, allenatore sempre presente.
  **La fonte non espone la data di nascita** — solo l'età in anni — **e non
  espone le foto dei giocatori**: la tabella ha solo bandiere. Il ruolo è una
  riga-intestazione, non una colonna, e l'allenatore chiude la tabella con il
  nome in uno `<span>` invece che in un `<a>`, perché non ha scheda atleta.
- **API reale (`team-squad`)**: Lega Serie A `/seasons/{id}/teams` per lo
  **stadio**, che Sky non dà: nome, città, indirizzo, capienza, anno. Presente
  per tutte e venti, ma **quattro squadre non dichiarano la capienza**, che va
  quindi mostrata solo quando c'è. L'abbinamento fra le due fonti prova sia
  `shortName` sia `officialName` con `matchesTeam`: i due campi non coincidono
  sempre con il nome usato da Sky.
- **JSON incorporato (`lineups`)**: le probabili formazioni da
  `sport.sky.it/calcio/serie-a/probabili-formazioni/{slug}`. **Non è scraping**:
  la pagina porta un `<script type="application/json" data-props="true">`, lo
  stesso formato dei widget. L'indirizzo è **per squadra**, non per partita, e
  contiene la prossima partita di quella squadra; `/partite/.../formazioni` è
  un'altra cosa — la formazione effettiva — e risponde 404 per una partita
  inesistente. Il legame con il nostro dataset è `seoName`, che è già il nostro
  slug. Verificato sulle venti squadre l'11 settembre 2026: quaranta formazioni,
  tutte con undici titolari e allenatore.
  **Nella stessa risposta convivono due qualità di dato**: `startingLineup` sono
  oggetti completi con numero, ruolo, foto e link; `substitutes`,
  `unavailables`, `disqualifieds` e `potentialPlayers` sono invece **un solo
  elemento** con `id: null` e i cognomi in una stringa separata da virgola. La
  categoria vuota è `fullName: ""`, non un array vuoto.
  Le **linee del campo** non sono nella fonte: si ricavano dalle cifre di
  `formation` e dall'ordine di `formationPlace`, e se i conti non tornano si
  ripiega sull'elenco invece di disegnare una formazione diversa da quella
  pubblicata.
  Sono **previsioni editoriali**, non formazioni ufficiali, e la fonte non
  pubblica quando le ha aggiornate: l'interfaccia lo dichiara e non inventa un
  «ultimo aggiornamento».
- **JSON incorporato (`player-stats`)**: la scheda atleta di Sky,
  `sport.sky.it/calcio/atleti/{slug}/{id}`. Come le probabili, **non è
  scraping**: la pagina porta un `<script type="application/json">` con
  `statisticsMap`, un blocco per **stagione e competizione**
  (`seasonAndCompId: "2026#21"`, nello **stesso spazio di id** usato per le
  competizioni: 21 è la Serie A, 5 la Champions).
  **Servono tutti e due i pezzi dell'indirizzo**: verificato l'11 settembre
  2026, `/calcio/atleti/{id}` risponde `404` e così `/calcio/atleti/x/{id}` con
  lo slug sbagliato. Non esiste un indirizzo canonico che rediriga. Entrambi
  arrivano dal `profileUrl` della rosa e vengono rivalidati con regex strette
  prima di finire nell'URL a monte.
  **La forma cambia con il ruolo**: un portiere ha `SavesMade`, `Cleansheets`,
  `GoalsConceded`, `PenaltiesSaved` e **non ha** `Starts`, `Goals` né
  `Assists`. Il payload è quindi un dizionario di quello che c'è, non un
  oggetto a campi fissi: riempire di zeri i campi mancanti darebbe numeri falsi
  con l'aria di dati veri.
  **Costa una pagina da ~460 KB per giocatore**, di cui il JSON utile occupa 3.
  Un indirizzo più leggero è stato cercato e non esiste: per questo la UI le
  chiede **solo per il giocatore che qualcuno apre**, e non per tutta la rosa.
  Il filtro sulla stagione richiesta è obbligatorio e non cosmetico: la stessa
  scheda porta anche stagioni vecchie — gli Europei 2024, per esempio — e
  mostrarle sotto il titolo di quella in corso sarebbe un dato vecchio
  presentato come attuale.
- **Nessuna fonte per le statistiche di squadra.** La scheda «Statistiche»
  della pagina squadra non interroga niente: posizione, punti, medie,
  andamento, forma e ripartizione casa/trasferta sono **derivati** da
  `standings` e `calendar` nel frontend, in `src/lib/teamStats.ts`. È il motivo
  per cui non compaiono in questo catalogo con una voce propria: non c'è un
  «da dove vengono» diverso da quello delle due azioni qui sopra.
- **Cache**: nessuna sulle partite. È l'unica funzione senza cache lato server.
- `meta.dataSource` vale **`unavailable`** quando `team-squad` torna con zero
  giocatori, o quando `lineups` non trova nessuno dei due lati — fuori dalle
  finestre di campionato Sky non pubblica probabili, e non è un guasto: una rosa vuota non è una squadra senza calciatori, è la fonte che
  non ha risposto o ha cambiato forma, e dichiararlo evita che la pagina mostri
  un vuoto convincente. Stessa logica del `configured: false` di
  `streaming-releases`.
- `meta.dataSource` vale `fallback-previous-season` quando la stagione richiesta
  non è ancora pubblicata e si ripiega su quella prima. `calendar` non lo fa di
  proposito: riempirebbe il calendario con le partite dell'anno scorso.
- `meta.team` e `meta.teamName` dichiarano quale squadra è stata servita.
  `meta.competitionsWithoutMatches` elenca i tornei che hanno risposto ma non
  contengono partite della squadra, e resta distinto da
  `meta.competitionsUnavailable`, che è il torneo irraggiungibile: con venti
  squadre «il Lecce non gioca la Champions» è la norma, non un guasto.

### `sports-motogp`

Azioni: `calendar`, `next-event`, `standings`, `constructor-standings`.

- **API reale**: Pulselive (`api.motogp.pulselive.com`) per stagioni, eventi,
  categorie, sessioni e foto dei team.
- **Scraping HTML**: `sport.sky.it/motogp/classifiche` per le due classifiche,
  cercando le stringhe letterali `Classifica Piloti MotoGP` e
  `Classifica Team MotoGP`.
- **Dataset statico**: nomi italiani dei GP, foto, numeri, nazionalità e nomi
  completi dei piloti (tarati sulla griglia 2026), loghi costruttori serviti da
  `public/constructors-motogp/` per evitare i 429 di Wikimedia, e la mappa
  paese → fuso usata per convertire gli orari di sessione.
- **Cache**: 24 ore per stagioni, categorie e team. Le classifiche scrapate non
  sono in cache.
- Se una sessione non ha un orario reale, non ne viene inventato uno: il commento
  nel codice dice «Mai dati sintetici».

### `sports-tennis`

Azioni: `player-info`, `next-event`, `schedule`, `results`.

- **Scraping HTML**: Wikipedia italiana per il profilo (infobox `sinottico`) e
  Wikipedia inglese per la stagione 2026.
- **Dataset statico**: quando la pagina di stagione non espone tornei futuri,
  viene aggiunto un elenco curato di undici tornei (da Madrid a ATP Finals), e
  `meta.dataSource` diventa `wikipedia+curated`. Foto, data e luogo di nascita
  sono anch'essi valori fissi.
- **Stagione**: qualunque anno diverso dal 2026 restituisce dati vuoti.
- **Cache**: 30 minuti, dichiarata nel codice come rispetto del fair use.
- Alcuni campi sono deliberatamente `null` (`coach`, `turnedPro`, `prizeMoney`):
  le espressioni che li estraevano si erano rivelate inaffidabili, e un valore
  sbagliato è peggio di un valore assente.

### `streaming-tv`

Azione: `prime-time`.

- **Scraping HTML**, due sorgenti: `staseraintv.com` (righe `HH:MM - Titolo`,
  solo ieri/oggi/domani) e `superguidatv.it` (classi CSS `sgtv-*`, solo oggi).
- **Dataset statico**: il catalogo dei canali per famiglia, con slug verificati
  a mano. I canali senza slug restituiscono un elenco vuoto e la UI lo dichiara.
- **Cache**: un'ora. Concorrenza limitata a cinque richieste per non martellare
  la fonte.
- **Non restituisce `meta`**: per questa funzione la distinzione live/degradato
  non arriva al client.

### `streaming-releases`

Azioni: `new-today`, `new-italy`, `details`, `credits`.

- **API reale**: TMDB, regione IT. Richiede il secret `TMDB_API_KEY`; senza,
  ogni azione risponde `success: true` con elenco vuoto e `configured: false` —
  mai un errore.
- **Dataset statico**: gli id dei quattro provider (Netflix, Prime Video,
  Disney+, HBO Max).
- **Cache**: un'ora per gli elenchi, ventiquattro per crediti e dettagli.
- Quando una finestra di date non produce risultati, si allarga; se ancora vuota,
  si abbandona il vincolo di data e si ordina per popolarità. Il payload lo
  dichiara con `widenedWindow` e `fallbackRecent`.
- **Non restituisce `meta`**.

### `highlights-youtube`

- **Feed RSS pubblico** di YouTube, senza chiave API, su tre playlist con id
  fissi (Juventus, F1, MotoGP).
- **Cache**: nessuna in memoria; la risposta porta `Cache-Control: max-age=600`.

### Funzioni push

`push-subscribe` (registra una subscription, service role, 30 richieste al
minuto), `push-vapid-key` (restituisce la chiave pubblica; **unica funzione senza
rate limit**), `push-dispatcher` (non pubblica: protetta da segreto condiviso,
invocata da pg_cron ogni cinque minuti, legge i calendari chiamando le altre
funzioni di questo stesso progetto).

## Quello che invecchia

Questi valori sono corretti oggi e non lo saranno per sempre. Nessuno li
sorveglia automaticamente.

| Dove                             | Cosa                                               |
| -------------------------------- | -------------------------------------------------- |
| `sports-tennis`                  | elenco curato dei tornei 2026, gate sull'anno 2026 |
| `sports-motogp`                  | numeri, nazionalità e foto della griglia 2026      |
| `sports-f1` → `F1_DRIVER_PHOTOS` | percorsi CDN che citano `2025`                     |
| `streaming-tv`                   | slug dei canali, verificati a mano                 |

## Fonti valutate e scartate

Stanno qui perché la domanda «e le statistiche dei giocatori?» tornerà, e la
risposta è già stata cercata: senza questa sezione la si ricerca da capo.

### API-Football (`v3.football.api-sports.io`) — **scartata: costa, e non serve**

Era la fonte prevista dal piano per le statistiche del **singolo giocatore**.
Interrogata con una chiave vera l'**11 settembre 2026** su
`/leagues?id=135&season=2026`:

```json
{
  "errors": { "plan": "Free plans do not have access to this season, try from 2022 to 2024." },
  "results": 0
}
```

Il piano gratuito si ferma alla stagione **2024**. Non è un problema di
configurazione: il dato della stagione in corso costa.

**Poi si è cercato meglio, ed è finita diversamente.** Le stesse statistiche —
presenze, minuti, gol, assist, tiri, passaggi chiave, recuperi, falli,
cartellini, e per i portieri parate, clean sheet e rigori parati — sono
pubblicate dalla **scheda atleta di Sky**, che l'app raggiungeva già: il parser
della rosa ne estraeva il link da prima. Gratis, per la stagione in corso, e
senza una fonte nuova da presidiare. Vedi `player-stats` sopra.

API-Football resta scartata, ma per una ragione diversa da quella iniziale:
**non serve più**. Se un giorno servisse per un dato che Sky non pubblica — per
esempio gli expected goals — la decisione tornerebbe a essere di prodotto
(pagare o no), non tecnica.

**La scorciatoia che non è stata presa**: servire le stagioni che il piano
gratuito copre. Sarebbero numeri veri del 2024 mostrati sotto il titolo del 2026.

**Alternativa esclusa**: l'API della Lega Serie A, già in uso per emittenti e
stadi, risponde `404` a `players`, `statistics`, `lineups`,
`matches/{id}/statistics` e `teams/{id}/squad`. Ha squadre, classifica e
partite, e nient'altro.

### Transfermarkt — **scartata: termini di servizio**

Valutata per i valori di mercato. Risponde `200` con HTML completo da un IP
domestico, e questo **non** basta: l'IP di una edge function Supabase è un IP
datacenter, cioè la categoria che questi siti bloccano per primi, e i termini
di servizio vietano lo scraping comunque.

Decisione del proprietario del progetto, l'11 settembre 2026: **non si fa**.
Non è un rinvio tecnico in attesa di uno sblocco.

### football-data.org — **scartata: add-on a pagamento**

La Serie A è nel piano gratuito, ma rose, formazioni e statistiche giocatore
stanno dietro un add-on a pagamento.

## Riferimenti

- Regole operative su fonti e tempo: [`agent-playbook/data-sources-and-time.md`](agent-playbook/data-sources-and-time.md).
- CORS, rate limit e segreti: [`SECURITY.md`](SECURITY.md).
- Contratto verso il frontend: [`ARCHITECTURE.md`](ARCHITECTURE.md).
