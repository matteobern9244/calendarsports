# Fonti dati

Catalogo delle fonti di **Calendar Events v2.7.0**, funzione per funzione e
azione per azione.

Fonte di verità per questo documento: `supabase/functions/*/index.ts`. Quando il
codice e questo file divergono, vince il codice: aggiornare qui.

Esiste perché l'app non possiede nessuno dei dati che mostra. Non c'è una tabella
di partite, di gare o di programmi TV: ogni schermata è il risultato di una
richiesta fatta al momento verso qualcun altro. Sapere **quale** qualcun altro, e
quanto è affidabile, è la premessa di ogni intervento su questa parte.

## Le tre nature di un dato

| Natura              | Che cosa vuol dire                                                   | Come si rompe                                       |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| **API reale**       | un endpoint pubblico che restituisce JSON con un contratto dichiarato | cambia versione, va in rate limit, va giù            |
| **Scraping HTML**   | una pagina web pensata per essere letta da persone, non da programmi  | cambia il layout, e nessuno ce lo dice               |
| **Dataset statico** | valori scritti nel codice, aggiornati a mano                          | invecchia in silenzio al cambio di stagione          |

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

Azioni: `standings`, `calendar`, `next-match`.

- **Scraping HTML**: i widget di `sport.sky.it`, da cui si estrae un JSON
  incapsulato in `<script data-props="true">`, con un fallback all'attributo
  `model=` del formato precedente.
- **API reale**: Lega Serie A (`api-sdp.legaseriea.it`) per le emittenti. Gli id
  di stagione sono **hardcoded** e arrivano al 2026.
- **Dataset statico**: gli id competizione. Tre principali (Serie A, Champions,
  Coppa Italia) più ventiquattro sondati in modo opportunistico, ignorando i 404.
- **Cache**: nessuna. È l'unica funzione senza cache lato server.
- `meta.dataSource` vale `fallback-previous-season` quando la stagione richiesta
  non è ancora pubblicata e si ripiega su quella prima. `calendar` non lo fa di
  proposito: riempirebbe il calendario con le partite dell'anno scorso.

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

| Dove                                          | Cosa                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `sports-tennis`                               | elenco curato dei tornei 2026, gate sull'anno 2026 |
| `sports-football` → `LEGA_SEASON_IDS`         | id stagione fino al 2026                          |
| `sports-motogp`                               | numeri, nazionalità e foto della griglia 2026     |
| `sports-f1` → `F1_DRIVER_PHOTOS`              | percorsi CDN che citano `2025`                    |
| `streaming-tv`                                | slug dei canali, verificati a mano                |

## Riferimenti

- Regole operative su fonti e tempo: [`agent-playbook/data-sources-and-time.md`](agent-playbook/data-sources-and-time.md).
- CORS, rate limit e segreti: [`SECURITY.md`](SECURITY.md).
- Contratto verso il frontend: [`ARCHITECTURE.md`](ARCHITECTURE.md).
