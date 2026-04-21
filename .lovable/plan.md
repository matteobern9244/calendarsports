

## Countdown chips: tick globale ottimizzato senza flicker

### Problema attuale

`EventCountdown` (usato in Home, Juventus, JuventusMatchPage) crea **un `setInterval` da 1s per ogni istanza**. Con 12 card visibili contemporaneamente (calendario Juventus, Prossimi Eventi) si hanno 12 timer non sincronizzati che aggiornano lo stato a frequenze leggermente sfalsate → micro-flicker dei chip, render React duplicati ogni secondo, lavoro inutile quando il chip mostra solo "g/h/m" (cambia al massimo ogni minuto).

`ReleaseCountdownBadge` invece **non si aggiorna mai** dopo il mount: se il browser resta aperto a cavallo della mezzanotte di Roma il chip resta su "Tra 2 giorni" anche quando dovrebbe diventare "Domani".

### Soluzione: clock store globale + tick adattivo

Introdurre un **tick store condiviso** (zero dipendenze, plain module) che emette un singolo timer a livello app e notifica tutti i subscriber. I componenti countdown si abbonano via `useSyncExternalStore`, quindi React batcha automaticamente e ogni chip riceve lo stesso istante di riferimento → niente più sfasamenti visivi.

Il timer adatta la frequenza alla "risoluzione necessaria":
- Se almeno un subscriber chiede risoluzione "secondi" → tick a 1000ms.
- Se tutti chiedono solo "minuti" → tick a 30000ms (30s, sufficiente per UI al minuto).
- Si ferma del tutto quando `document.visibilityState === "hidden"` (e ri-tick + ricalcolo immediato al ritorno in foreground).

### File nuovo

**`src/lib/countdownClock.ts`**

API minima:
```ts
type Resolution = "second" | "minute";
export function subscribeCountdown(cb: () => void, res: Resolution): () => void;
export function getNow(): number; // snapshot stabile dell'ultimo tick
```

Implementazione:
- Set di subscriber con risoluzione per ognuno.
- Un solo `setInterval` ricreato quando cambia la risoluzione richiesta più alta.
- Listener `visibilitychange`: pausa quando hidden, refresh + tick immediato + reschedule quando visible.
- Cleanup totale quando l'ultimo subscriber si disiscrive.
- `getNow()` ritorna un timestamp aggiornato solo ai tick → tutti i componenti vedono lo stesso istante nello stesso commit React (no sfasamenti).

### File modificati

**`src/components/common/EventCountdown.tsx`**
- Rimuovere `useState` + `useEffect` con `setInterval` interno.
- Sottoscriversi al clock con `useSyncExternalStore(subscribeCountdown, getNow)`.
- Risoluzione: `"second"` solo quando `parts.days === 0 && parts.hours === 0` (ultima ora prima dell'evento, dove i secondi servono); altrimenti `"minute"`.
- Memoizzare `target = useMemo(() => new Date(startDate).getTime(), [startDate])`.
- Chiusura con `if (!Number.isFinite(target)) return null;` early.
- Output identico (stessi class, stessi token gold, stesso layout) → **zero regressione visiva**.

**`src/components/streaming/ReleaseCountdownBadge.tsx`**
- Sottoscriversi al clock con risoluzione `"minute"` (basta un refresh ogni 30s per cogliere il cambio di giorno a Roma).
- `daysUntilRome` chiamato dentro il render, ricalcolato ad ogni tick → corregge il bug del cambio giorno a mezzanotte senza altri costi.

### Cosa NON cambia

- Markup, classi Tailwind, token semantici, varianti `today/soon/future/past`, `aria-label`, dimensioni icone → identici.
- `EventCard`, `JuventusPage`, `JuventusMatchPage`, `StreamingPage`, `ReleaseDetailDialog` → **nessuna modifica**, l'API dei due componenti countdown resta identica.
- `SparkleLoop` (altro `setInterval` non countdown) → non toccato.
- Logica `isLive` (finestra ±3h), logica `isPast`, logica `daysUntilRome` → invariate.

### Anti-flicker / anti-regressione

- Tutti i chip nello stesso commit usano lo stesso `now` → zero sfasamento visivo tra card adiacenti.
- `useSyncExternalStore` evita re-render se il valore restituito da `getNow` è uguale al precedente (riferimento numerico stabile tra i tick → no commit inutile dei chip in modalità "minute" durante i 1000ms tra tick "seconds" richiesti da altri).
  - Nota implementativa: per garantire l'invarianza referenziale ai subscriber "minute" durante un tick "second", lo store esporrà due snapshot separati (`getNowSecond`, `getNowMinute`) aggiornati indipendentemente. Il subscriber "minute" riceve un nuovo numero solo ai tick al minuto → il suo componente non si re-renderizza ogni secondo.
- `tabular-nums` già presente → niente layout shift sui numeri che cambiano.
- Tab in background: timer fermo → niente burst CPU al ritorno; al `visible` viene calcolato subito un nuovo snapshot e notificati tutti.
- 12 card → 1 timer + 12 callback leggere invece di 12 timer + 12 setState.

### Verifica post-modifica

- `npm run lint`, `npm run build`, `npm run test`.
- Smoke manuale: Home → osservare i chip "Prossimo evento" che scorrono in sincronia perfetta tra card adiacenti, niente flicker, niente jitter dei numeri.
- Juventus calendario (12 chip simultanei) → CPU stabile, animazioni Framer Motion fluide.
- Streaming → lasciare aperta la pagina su un titolo "Domani" alla mezzanotte di Roma: il chip deve passare a "Oggi" senza reload.
- Cambio tab → nessuna fiammata di setState al ritorno.

### Note tecniche

- Nessuna nuova dipendenza npm.
- `useSyncExternalStore` è API stabile React 18 (già usata implicitamente da React Query, supportata dallo stack).
- Nessun colore hardcoded, nessun cambio routing/payload/Lovable sync.
- Compatibile con SSR-less (Vite SPA) — il check `typeof document !== "undefined"` viene aggiunto comunque per robustezza.

