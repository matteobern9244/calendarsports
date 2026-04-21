

## Obiettivo

Rendere visibili in "Stasera in TV" anche i programmi che **iniziano prima delle 21:00** (es. Coppa Italia su Canale 5 alle 20:40, Premier League alle 20:55) ma che **sono ancora in onda durante la prima serata** (21:00-22:59). I programmi che iniziano alle 23:00 o dopo restano esclusi.

## Diagnosi

L'attuale filtro in `TonightTvList.tsx` (linee 136-142) controlla solo l'**istante di inizio** del programma:

```ts
const minutes = h.hourRome * 60 + h.minuteRome;
return minutes >= PRIME_TIME_START_MIN && minutes < PRIME_TIME_END_EXCLUSIVE_MIN;
```

Questo esclude erroneamente i kickoff anticipati lunghi (20:40 → 22:50, 20:30 → 23:15) che attraversano completamente la prima serata. La riga di Canale 5 con la Coppa Italia e' sparita per questo motivo.

## Algoritmo "intelligente" basato su overlap di intervalli

Sostituire il check puntuale con un classico **interval overlap test**: un programma e' rilevante per la prima serata se l'intervallo `[start, end)` interseca la finestra `[21:00, 23:00)`.

Per ogni programma calcoliamo i minuti dalla mezzanotte Europe/Rome di **inizio** e **fine** (clampando l'eventuale wrap dopo mezzanotte a 24:00 = 1440):

```text
overlaps(prog, window) :=
  prog.startMin < window.endMin   AND   prog.endMin > window.startMin
```

Casi coperti correttamente:

| Inizio | Fine  | Visibile? | Motivo |
|--------|-------|-----------|--------|
| 20:40  | 22:50 | si        | Attraversa la finestra (Coppa Italia Canale 5) |
| 20:30  | 23:15 | si        | Inizia prima ma copre tutta la prima serata |
| 21:30  | 22:25 | si        | Interamente nella finestra (Le Iene) |
| 22:55  | 23:50 | si        | Inizia in finestra, finisce dopo |
| 18:30  | 20:55 | no        | Finisce prima delle 21:00 |
| 23:00  | 00:30 | no        | Inizia dopo la fine finestra |
| 19:00  | 20:00 | no        | Completamente fuori |

## Refactor proposto

Modifica un solo file: `src/components/home/TonightTvList.tsx`.

### 1. Estendere `TvHighlight` con i minuti di fine

Aggiungere `endHourRome`, `endMinuteRome` (oppure piu' semplicemente `endMinutesFromMidnight`) calcolati con lo stesso `Intl.DateTimeFormat` Europe/Rome usato per `time` (linee 84-89). Per programmi che attraversano la mezzanotte (es. start 23:30, end 01:15), normalizziamo aggiungendo `+ 24*60` se `endMin <= startMin`.

### 2. Riscrivere `inPrimeWindow` come `overlapsPrimeWindow`

```ts
const overlapsPrimeWindow = (h: TvHighlight) => {
  const startMin = h.hourRome * 60 + h.minuteRome;
  // endMin gia' normalizzato per wrap mezzanotte in step 1
  return startMin < PRIME_TIME_END_EXCLUSIVE_MIN
      && h.endMinutesFromMidnight > PRIME_TIME_START_MIN;
};
```

### 3. Adeguare la selezione "main program per canale"

La logica esistente (linee 155-170) sceglie un solo programma per canale preferendo quello "main" (>=40 min) e quello che inizia prima. Va aggiornata per favorire il programma che **massimizza l'overlap con la finestra di prima serata**, in modo che:

- se Canale 5 ha Coppa Italia 20:40-22:50 (overlap 110 min) e un altro programma 22:55-23:30 (overlap 5 min), vince Coppa Italia;
- se RAI 1 ha TG1 20:30-21:00 (overlap 0 min, escluso) e Affari Tuoi 21:00-21:35 + Le Iene 21:35-23:15, vince quello che copre piu' prima serata.

Nuovo criterio di scelta (in ordine di priorita'):

1. piu' alto **overlap minutes** con `[21:00, 23:00)`;
2. tie-break: durata totale piu' alta (preferisce il "main");
3. tie-break finale: `startMs` piu' basso (stabilita').

### 4. UI: aggiornare il sottotitolo

Cambiare la riga 217 da `Prima serata (dalle 21:00) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery` a `Prima serata (21:00 - 23:00) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery`. Riflette correttamente che ora mostriamo qualunque programma in onda nella fascia, non solo quelli che iniziano alle 21:00 esatte.

### 5. Mostrare l'orario reale di inizio anche se anteriore alle 21:00

Il campo `time` (es. `20:40`) viene gia' renderizzato dal componente. Nessuna modifica necessaria: la cella ora mostrera' correttamente `20:40` per la Coppa Italia, rendendo evidente all'utente che il programma e' iniziato prima ma e' ancora in onda.

### 6. `MIN_DURATION` invariato a 40 min

Resta utile per scartare TG/promo quando ci sono piu' candidati per lo stesso canale. Non serve come filtro hard sul pool.

## Verifica

- Test esistente `TonightTvList.test.tsx` usa RAI 1 con start `21:30` → continua a passare (overlap > 0).
- Aggiungere mentalmente caso Canale 5 20:40 → 22:50 → deve apparire.
- Nessun impatto su `StreamingPage`, Edge Functions, hook React Query: cambia solo la logica di presentazione lato Home.

## File modificati

- `src/components/home/TonightTvList.tsx`:
  - estensione interfaccia `TvHighlight` con minuti di fine normalizzati;
  - sostituzione `inPrimeWindow` con `overlapsPrimeWindow`;
  - aggiornamento criterio di scelta "main program per canale" basato su overlap minutes;
  - aggiornamento commento + sottotitolo card.

## Comandi di verifica post-edit

`npm run lint`, `npm run test`, `npm run build`, `npm run check:italian`.

