# Fonti dati, tempo e lingua

## Scopo

Questa guida vale per tutto ciò che tocca le edge function, i dati sportivi e di
palinsesto, gli orari, le stagioni e i testi mostrati all'utente. È l'area dove
un errore produce **un'informazione plausibile ma falsa**: un orario sbagliato di
due ore, una partita mostrata come prossima quando è già iniziata, un dato
inventato spacciato per ufficiale. Difetti che nessuno segnala come bug perché
sembrano dati. Si applicano sempre anche le regole root in
[`AGENTS.md`](../../AGENTS.md).

## Regole

### Dire sempre da dove viene un dato

Questa app non ha un database di eventi sportivi. Ogni calendario, classifica e
palinsesto viene recuperato al volo da terzi, e le fonti non sono tutte della
stessa qualità:

- **API reale**: Jolpica/Ergast (F1), OpenF1 (foto piloti), Lega Serie A
  (emittenti), Pulselive/motogp.com (calendario MotoGP), TMDB (uscite streaming),
  RSS YouTube (highlights).
- **Scraping HTML**: Sky Sport (calendario e classifica Serie A, classifiche
  MotoGP), Wikipedia IT ed EN (profilo e stagione di Sinner), staseraintv.com e
  superguidatv.it (palinsesti TV).
- **Dataset statici nel codice**: il calendario tornei 2026 di Sinner quando
  Wikipedia non espone gare future, i numeri e le nazionalità dei piloti MotoGP,
  le foto dei piloti F1, i loghi costruttori, l'elenco dei canali per famiglia
  TV.

**Non presentare mai come fonte ufficiale ciò che è statico o scrapato.** Se una
sezione dipende da scraping, dillo nel resoconto. Il catalogo completo, funzione
per funzione e azione per azione, è in
[`docs/DATA_SOURCES.md`](../DATA_SOURCES.md), ed è il documento da aggiornare
quando una fonte cambia.

Il campo `meta.dataSource` porta questa distinzione fino alla UI: `live`,
`wikipedia`, `wikipedia+curated`, `static-fallback`, `fallback-previous-season`,
`mixed`, `unknown`. `src/hooks/syncWarning.ts` decide da lì se avvisare l'utente.

### Non togliere un fallback senza aver capito perché c'è

Ogni mappa statica e ogni ramo di fallback è nato da un guasto reale: un 429 di
Wikimedia, una stagione non ancora pubblicata su Sky, una sessione MotoGP senza
orario. Rimuoverli "perché ora l'API funziona" significa riportare il guasto la
prima volta che la fonte tossisce.

Vale anche al contrario: `sports-motogp` non inventa orari quando la sessione non
ne ha uno, e il commento nel codice lo dice. Meglio un dato assente che un dato
inventato.

### Gli ISO senza fuso valgono UTC, sempre e ovunque

Tutti i provider che usiamo pubblicano orari in UTC. Una stringa come
`2026-06-21T19:45:00`, senza `Z` e senza offset, va quindi letta come UTC.
JavaScript da solo fa il contrario: la interpreta come ora locale del client.

La conversione sta in `toRomeDate` (`src/lib/dateUtils.ts`) e vale per **due**
famiglie di operazioni, non una:

- **formattare**: `formatDateIT`, `formatTimeIT`, `formatJuventusDateTime`,
  `formatDateTimeIT`, tutte con `timeZone: "Europe/Rome"` esplicito;
- **confrontare e ordinare**: `getDateTimestamp`, e chiunque debba dire quale
  evento viene prima o quanto manca.

La seconda famiglia è quella che è costata di più: la formattazione rispettava la
policy e i confronti no, quindi il conto alla rovescia e l'orario stampato
accanto parlavano di due istanti diversi, a due ore di distanza in estate.

`new Date(stringa)` è vietato nelle pagine e nei componenti sorvegliati. Se
l'argomento è un timestamp numerico, e quindi non c'è nessun fuso da sbagliare,
serve un `// @tz-ignore` sulla riga precedente con la ragione scritta accanto.

Il controllo eseguibile è `bun run check:tz-juventus`
([`scripts/check-rome-tz.mjs`](../../scripts/check-rome-tz.mjs)).

### Le stagioni si calcolano, non si scrivono

`src/lib/currentSeason.ts` è l'unica fonte: F1, MotoGP e Sinner seguono l'anno
solare, la Juventus cambia stagione a luglio
(`getCurrentJuventusSeason`). L'argomento `now` di quelle funzioni esiste solo
per i test. Non introdurre costanti d'anno nelle pagine: il primo gennaio
qualcuno se ne accorgerà.

### L'interfaccia è in italiano

Tutti i testi rivolti all'utente sono in italiano: contenuti, `placeholder`,
`aria-label`, `sr-only`, toast, messaggi d'errore, titoli di pagina. Le uniche
eccezioni ammesse sono i due token `STREAMING` e `CALENDAR EVENTS`.

Non sono violazioni: i nomi propri (squadre, atleti, competizioni, emittenti,
provider) nella loro forma ufficiale, e gli acronimi tecnici (ATP, GP, PL1,
TMDB, RAI, Pos, Pts).

Il controllo eseguibile è `bun run check:italian`
([`scripts/check-italian-ui.mjs`](../../scripts/check-italian-ui.mjs)). Ha due
vie d'uscita, `// @lingua-ignore-file` e `// @lingua-ignore`, e allargare la sua
allowlist va motivato nel changelog dello stesso cambiamento.

## Verifiche

```bash
bun run check:tz-juventus   # fuso nei formati e nei confronti
bun run check:italian       # nessun testo inglese nella UI
bun run test                # include timezoneConsistency e currentSeason
```

Quando cambi la forma di un payload lato edge function, verifica **nello stesso
cambiamento** `src/lib/api/sportsApi.ts`, l'hook che lo consuma e la pagina che
lo mostra. E aggiorna le fixture in `e2e/support/mockSportsApi.ts`: se divergono
dal contratto reale, i test continuano a passare mentre l'app è rotta.

## Riferimenti

- Catalogo delle fonti per funzione: [`docs/DATA_SOURCES.md`](../DATA_SOURCES.md).
- Confini fra frontend ed edge function: [`architecture-and-boundaries.md`](architecture-and-boundaries.md).
- Segreti, CORS e rate limit: [`docs/SECURITY.md`](../SECURITY.md).
