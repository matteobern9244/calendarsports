

## Obiettivo

Cambiare la finestra "Stasera in TV" della Home: mostrare solo i programmi che iniziano **dalle 21:00 (incluse) alle 22:59 (incluse)**. I programmi che iniziano alle **23:00 o dopo** non devono comparire. Anche i kickoff anticipati delle 20:30 / 20:40 / 20:45 vengono esclusi (richiesta esplicita: "dalle 21 in poi").

## Diagnosi del comportamento attuale

In `src/components/home/TonightTvList.tsx`, la funzione `inPrimeWindow` definisce la fascia di prima serata come:

```ts
const minutes = h.hourRome * 60 + h.minuteRome;
return minutes >= 20 * 60 + 30 && minutes <= 23 * 60;
```

Due problemi rispetto alla richiesta:

1. Lower bound a **20:30** invece di **21:00** -> entrano programmi che iniziano alle 20:35, 20:40, 20:45, 20:55 (visibili nello screenshot: Affari Tuoi 20:35, Coppa Italia 20:40, Premier League 20:55, Le Iene 21:15 ok).
2. Upper bound `<= 23 * 60` -> entrano anche i programmi che iniziano **esattamente alle 23:00** (visibili nello screenshot: "Serie A — St. 2025 - Ep. 99" alle 23:00 su Sky Sport Calcio).

## Refactor (no workaround)

Modifica un solo file: `src/components/home/TonightTvList.tsx`.

1. **Costanti di fascia esplicite** in cima al modulo (sostituiscono i numeri magici dentro `inPrimeWindow`):

   ```ts
   // Prima serata italiana: dalle 21:00 incluse alle 22:59 incluse.
   // I programmi che iniziano alle 23:00 o dopo appartengono alla
   // seconda serata e non devono comparire nella scheda Home.
   const PRIME_TIME_START_MIN = 21 * 60;       // 21:00
   const PRIME_TIME_END_EXCLUSIVE_MIN = 23 * 60; // 23:00 (escluso)
   ```

2. **`inPrimeWindow` riscritta** in modo dichiarativo, con confronto half-open `[21:00, 23:00)`:

   ```ts
   const inPrimeWindow = (h: TvHighlight) => {
     const minutes = h.hourRome * 60 + h.minuteRome;
     return (
       minutes >= PRIME_TIME_START_MIN &&
       minutes < PRIME_TIME_END_EXCLUSIVE_MIN
     );
   };
   ```

3. **Aggiornare il commento sopra `tonightHighlights`** e il sottotitolo della card per riflettere la nuova fascia, mantenendo lingua italiana e tono coerente:
   - Commento: "Prima serata italiana: 21:00 - 22:59 Europe/Rome. I kickoff anticipati (20:30/20:45) restano esclusi: per quelli c'e' la sezione Streaming."
   - Sottotitolo card (riga 209): da `Prima serata (dalle 20:30) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery` a `Prima serata (dalle 21:00) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery`.

4. **`MIN_DURATION` resta a 40 minuti**: con la finestra ridotta serve comunque tagliare TG/promo/filler che iniziano fra 21:00 e 22:59. Nessun altro cambiamento alla logica di selezione "main program per canale", ordinamento o paginazione.

## Verifica

- Il test esistente `TonightTvList.test.tsx` usa un programma RAI 1 con start `21:30` Europe/Rome -> rientra nella nuova finestra `[21:00, 23:00)`, quindi continua a passare senza modifiche.
- Nessun altro consumer importa `inPrimeWindow` o le costanti (logica privata al componente).
- Nessun impatto su `StreamingPage`, sulle Edge Functions o sugli hook React Query: la finestra di prima serata e' un filtro puramente di presentazione lato Home.

## File modificati

- `src/components/home/TonightTvList.tsx` (costanti + `inPrimeWindow` + 1 commento + 1 stringa sottotitolo).

## Comandi di verifica post-edit

`npm run lint`, `npm run test`, `npm run build`, `npm run check:italian`.

