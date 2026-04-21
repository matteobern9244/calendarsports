

## Fix countdown fermo + ottimizzazione EventCountdown

### Bug identificato

In `EventCountdown` la soglia `needsSeconds` scatta solo nell'ultima **ora** prima dell'evento (`diff <= 3600 * 1000`). Ma il rendering mostra i secondi (`!showDays`) per **tutte le ultime 24 ore** (quando `days === 0`). Risultato: tra T-24h e T-1h il chip mostra il valore "secondi" ma è abbonato a risoluzione `minute` → i secondi restano congelati sull'ultimo valore catturato al cambio minuto. Visivamente sembra che il countdown si sia fermato.

Esempio concreto in Home oggi: l'evento "Prossimi Eventi" più imminente è entro 24h e mostra `g/h/m/s` con `s` bloccato.

### Soluzione

Allineare `needsSeconds` alla **stessa condizione** che governa la visualizzazione dei secondi nel JSX:

```ts
// PRIMA (bug): seconds-tick solo nell'ultima ora
return diff > 0 && diff <= 3600 * 1000;

// DOPO (fix): seconds-tick ogni volta che mostriamo davvero i secondi,
// cioe' quando days === 0 (ultime 24h prima dell'evento)
const minuteParts = getPartsAt(target, minuteSnapshot);
return minuteParts.totalMs > 0 && minuteParts.days === 0;
```

Cosi' `needsSeconds` cambia stato solo ai cambi minuto (snapshot stabile) e diventa `true` non appena entriamo nelle ultime 24h, esattamente quando il JSX mostra il segmento `s`.

### Ottimizzazione aggiuntiva (richiesta utente)

Quando `needsSeconds === false`, sia `parts` che la decisione di rendering dipendono solo da `minuteSnapshot`. Per evitare che il `useMemo` di `parts` si ricalcoli quando il `secondSnapshot` "tickka" (in realtà in modalità minute non lo fa, ma per rendere esplicita la garanzia):

```ts
const activeSnapshot = needsSeconds ? secondSnapshot : minuteSnapshot;
const parts = useMemo(
  () => getPartsAt(target, activeSnapshot),
  [target, activeSnapshot],
);
```

Inoltre rimuovo `secondSnapshot` quando non serve, sottoscrivendo il secondo `useSyncExternalStore` solo se `needsSeconds`. Ma `useSyncExternalStore` deve essere chiamato in modo incondizionato (regola degli hook) → mantengo la chiamata, ma la sottoscrizione sceglie la giusta risoluzione (già fatto), e `parts` ignora il `secondSnapshot` quando in modalità minute → zero ricalcoli inutili.

### Cleanup minore

- Rimuovere la funzione helper `getParts(target)` non utilizzata (linea 24-26).
- Lasciare `getPartsAt` invariata (è la sola usata).

### Anti-regressione

- **Comportamento UI invariato** in tutti gli stati: pre-24h (g/h/m), pre-1h (g=0, h/m/s), live (chip rosso "Inizio imminente"), past (null).
- **Performance**: i chip in modalità "g/h/m" (la stragrande maggioranza) restano a risoluzione minute → tick globale 30s.
- **Ad almeno un chip nelle ultime 24h** il tick globale passa a 1s (necessario perché quel chip mostra `s`). Tutti gli altri chip "minute" non si ri-renderizzano grazie agli snapshot separati `nowMinute` / `nowSecond` già implementati in `countdownClock.ts`.
- `ReleaseCountdownBadge`: nessuna modifica, già corretto a risoluzione minute.
- `countdownClock.ts`: nessuna modifica, l'API è già adeguata.

### File modificati

Solo `src/components/common/EventCountdown.tsx`:
1. Fix soglia `needsSeconds` (1h → 24h, allineata a `days === 0`).
2. Memo di `parts` su `activeSnapshot` (snapshot effettivo in uso) per esplicitare zero-ricalcoli inutili.
3. Rimozione `getParts` morto.

### Verifica

- `npm run lint`, `npm run build`, `npm run test`.
- Smoke manuale Home: il chip dell'evento più imminente (entro 24h) deve mostrare i secondi che scorrono fluidi 1s alla volta. Gli altri chip (>24h) restano a g/h/m senza re-render.
- DevTools React Profiler: in modalità minute, zero commit dei chip durante i tick intra-minuto causati da un altro chip in modalità seconds.

### Note tecniche

- Nessun colore hardcoded, nessun cambio API/payload/routing/Lovable sync.
- Il `JuventusMatchPage` (singolo chip) e il calendario Juventus (12 chip simultanei) beneficiano automaticamente: solo i chip nelle ultime 24h pagano il costo del tick a 1s.
- Compatibile con la regola "tutti i countdown funzionanti": il fix garantisce che ogni segmento visibile (`g`, `h`, `m`, `s`) sia aggiornato alla frequenza corretta.

