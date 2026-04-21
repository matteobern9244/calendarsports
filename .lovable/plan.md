

## Real-time mode + verifica Europe/Rome + transizioni live + stati di errore countdown

### Obiettivi (4 richieste)

1. **Modalità "Tempo reale" vs "Risparmio"**: pannello Preferenze + persistenza + propagazione al clock globale.
2. **Verifica fuso Europe/Rome su tutti gli orari** mostrati (Streaming, Sinner, Juventus, F1, MotoGP).
3. **Transizione automatica `prossimo → in_corso → completato`** sui countdown, allineata ai timestamp reali di inizio/fine forniti dalle fonti (con fallback a finestra ±3h se manca `endDate`).
4. **Stato di errore + retry sui countdown** quando la `startDate` è invalida o mancante (mostra messaggio italiano invece di chip "fermo").

---

### 1. Modalità Real-time / Risparmio

**Nuovo file `src/hooks/useCountdownMode.ts`**
- Hook che legge/scrive `localStorage.getItem("cse-countdown-mode")` con valori `"realtime" | "saver"` (default `"realtime"`).
- Espone `{ mode, setMode }` + emette un evento `storage`-like custom per propagare cambi a tutti i tab/componenti senza reload.
- Esporta anche un `getCountdownModeSync()` letto direttamente dal modulo `countdownClock` (no hook React lì).

**Modifiche a `src/lib/countdownClock.ts`**
- Aggiungere variabile interna `globalMode: "realtime" | "saver" = "realtime"` + funzione esportata `setCountdownMode(mode)` che ricompone `computeDesiredTickMs`.
- Nuova logica tick:
  - `realtime`: come oggi (1s se almeno un subscriber chiede `"second"`, 30s altrimenti).
  - `saver`: forza tick a 60s indipendentemente dalla risoluzione richiesta. I chip che vorrebbero secondi mostreranno comunque l'ultimo valore aggiornato al minuto (vedi sotto).
- Init: legge `localStorage` al primo `subscribeCountdown` per applicare il modo persistito senza dipendere dal mount React.

**Modifiche a `src/components/preferences/PreferencesPanel.tsx`**
Nuova sezione "Countdown" sotto "Aspetto":
- Toggle pill-style coerente col toggle tema (Sun/Moon → usa icone `Zap` / `Battery`).
- Opzioni: **Tempo reale** (1s) e **Risparmio** (60s).
- Descrizione italiana: "Tempo reale: aggiornamenti al secondo. Risparmio: aggiornamenti al minuto, riduce il consumo CPU su dispositivi mobili."
- Toast `sonner` di conferma al cambio.

---

### 2. Verifica fuso Europe/Rome su tutti gli orari

**Audit completo (read-only, già eseguito):** tutti gli usi di `toLocaleDateString` / `toLocaleTimeString` nel codice sorgente passano già `timeZone: "Europe/Rome"`. Il workflow CI `npm run check:tz-juventus` (vedi `scripts/check-rome-tz.mjs`) lo verifica per le sezioni Juventus/Home.

**Estensione del controllo CI** (richiesta utente: "TUTTI gli eventi"):
- Aggiornare `scripts/check-rome-tz.mjs`:
  - Estendere `TARGET_DIRS` includendo `src/pages/Formula1Page.tsx`, `src/pages/MotoGPPage.tsx`, `src/pages/SinnerPage.tsx`, `src/pages/StreamingPage.tsx`, `src/components/streaming/**`, `src/components/highlights/**`, `src/components/home/**`.
  - Rinominare lo script in `check:tz-app` (alias `check:tz-juventus` mantenuto per backward compatibility nel CI).
- Documentare in `AGENTS.md` (se necessario) la nuova copertura.

**Fix puntuale in `src/lib/dateUtils.ts → formatTimeIT`** (allineamento policy):
- Garantire `timeZone: "Europe/Rome"` (già presente) **e** normalizzazione "naive = UTC" sul fallback `2026-01-01T${timeStr}`: se `timeStr` arriva come `HH:mm:ss` puro (senza `Z`/offset) aggiungere `Z` come fa già `toRomeDate`. Evita ambiguità DST quando `dateStr` non è fornito.
- Nessuna modifica visiva attesa (i provider F1/MotoGP/Juventus/Sinner inviano già o ISO completo o `HH:mm:ssZ`).

**Verifica payload Sinner**: la sorgente `sports-tennis` ritorna solo `date: "YYYY-MM-DD"` (senza `time`) per i tornei. Ciò è corretto: i tornei tennis non hanno orario d'inizio singolo. Nessuna azione richiesta.

---

### 3. Transizioni `prossimo → in_corso → completato` con dati reali

**Estendere props di `EventCountdown.tsx`:**
```ts
interface EventCountdownProps {
  startDate: string;
  /** Optional ISO end date. Se assente, finestra live = startDate + 3h */
  endDate?: string;
  className?: string;
  /** Callback opzionale per propagare cambi di stato al parent */
  onStatusChange?: (status: "upcoming" | "live" | "ended") => void;
}
```

**Nuova logica derivata dal `now` globale (no setState interno):**
- `upcoming`: `now < target` → mostra chip oro con g/h/m/s.
- `live`: `now >= target && now < endTarget` (dove `endTarget = endDate ?? target + 3*3600*1000`) → chip rosso pulsante "IN DIRETTA · da Xm" (mostra anche durata live trascorsa).
- `ended`: `now >= endTarget` → ritorna `null` (come oggi).

**`onStatusChange`**: chiamato in `useEffect` con dep `[currentStatus]`. Permette a `EventCard` di passare automaticamente la prop `status="in_corso"` al parent, sostituendo l'attuale calcolo statico `getEventStatus()` che non si aggiorna in tempo reale. Implementazione: `EventCard` mantiene uno stato locale `liveStatus` che, se ricevuto via callback, override `status` prop.

**Wiring nei consumer (zero breaking change):**
- `EventCard.tsx`: aggiunge `endDate` opzionale, lo passa a `EventCountdown` e usa `liveStatus` interno per il badge "IN DIRETTA".
- `MotoGPPage.tsx`: passa `endDate={endDate ? endDate + "T23:59:59Z" : undefined}` (i weekend MotoGP hanno `date_end` reale).
- `JuventusPage.tsx`, `JuventusMatchPage.tsx`: nessun `endDate` (singola partita ~2h, fallback ±3h già adeguato).
- `Formula1Page.tsx`, `Index.tsx`: nessun `endDate` (eventi singoli, fallback adeguato).

---

### 4. Stato di errore + retry sui countdown

**Caso "data invalida o mancante" in `EventCountdown`:**
Oggi: `if (!valid) return null` → silenzioso. Comportamento richiesto: messaggio italiano + retry quando i dati di startDate non sono parseabili.

**Nuovo branch errore:**
```tsx
if (!valid) {
  return (
    <div
      role="status"
      aria-label="Orario non disponibile"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted/40 px-2.5 py-1",
        "text-[10px] font-heading uppercase tracking-widest text-muted-foreground",
        className
      )}
    >
      <AlertCircle className="h-3 w-3" />
      Orario non disponibile
    </div>
  );
}
```

**Retry centralizzato a livello pagina (più solido di un retry per chip):**
- Le pagine già espongono `refetch()` da React Query.
- Aggiungere prop opzionale `EventCountdown.onRetry?: () => void` e mostrare un piccolo bottone "Riprova" accanto al testo se fornito.
- I consumer Home/F1/MotoGP/Juventus/Sinner passano la rispettiva `refetch` quando il countdown è in stato errore.

**Stato "loading" della startDate** (es. mentre la query sta ricaricando):
- Non aggiunto chip di loading (sarebbe intrusivo). Il chip semplicemente non si renderizza finché `startDate` non arriva. Coerente con il resto dell'app che usa `LoadingState` a livello pagina.

---

### File modificati / creati

**Creati:**
- `src/hooks/useCountdownMode.ts` (nuovo hook + helpers persistenza).

**Modificati:**
- `src/lib/countdownClock.ts` — supporto modalità `saver`, init da localStorage, export `setCountdownMode`.
- `src/components/common/EventCountdown.tsx` — supporto `endDate`, `onStatusChange`, `onRetry`, branch errore italiano, calcolo live derivato dal clock.
- `src/components/common/EventCard.tsx` — accetta `endDate` opzionale, override `status` da `liveStatus`.
- `src/components/preferences/PreferencesPanel.tsx` — sezione "Countdown" con toggle real-time/risparmio.
- `src/lib/dateUtils.ts` — normalizzazione "Z" su `formatTimeIT` quando `timeStr` è naive.
- `src/pages/MotoGPPage.tsx` — passa `endDate` a `EventCard` per i weekend di gara, passa `onRetry={calRefetch}`.
- `src/pages/Index.tsx`, `src/pages/Formula1Page.tsx`, `src/pages/JuventusPage.tsx`, `src/pages/JuventusMatchPage.tsx` — passano `onRetry` rispettiva.
- `scripts/check-rome-tz.mjs` — estensione TARGET_DIRS a tutte le pagine/componenti che mostrano date.

---

### Cosa NON cambia (anti-regressione)

- API React Query, query key, payload backend, edge functions, rotte, sync GitHub/Lovable.
- Aspetto visivo dei chip in modalità `realtime`: identico a oggi (g/h/m/s, oro).
- `ReleaseCountdownBadge` (streaming): già funziona a risoluzione minute, beneficia automaticamente della modalità saver senza modifiche.
- Italian-only UI: ogni nuova stringa in italiano (`"Tempo reale"`, `"Risparmio"`, `"Orario non disponibile"`, `"Riprova"`, `"da Xm"`).
- Token gold/destructive: nessun colore hardcoded.

### Verifica post-modifica

- `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-app`.
- Smoke manuale:
  1. Aprire Preferenze → toggle "Risparmio" → countdown Home aggiornano ogni minuto (osservabile via DevTools React Profiler).
  2. Tornare in "Tempo reale" → secondi scorrono fluidi.
  3. Forzare un `startDate` passato di pochi minuti su un evento test → chip diventa rosso "IN DIRETTA · da Xm" senza reload.
  4. Provider F1/MotoGP/Sinner: tutti gli orari coincidono con quelli pubblicati nei rispettivi siti ufficiali (Europe/Rome).
  5. Disconnettere rete → ricaricare → chip mostrano "Orario non disponibile" + bottone "Riprova" funzionante.

### Note tecniche

- Nessuna nuova dipendenza npm.
- `useSyncExternalStore` continua a garantire zero-flicker tra chip adiacenti.
- Modalità `saver`: i chip "second" mostrano comunque i secondi, ma il valore è quello dell'ultimo tick al minuto → coerente con la promessa "risparmio" e visivamente accettabile (refresh ogni 60s).
- Compatibile con SSR-less Vite SPA, persistenza via `localStorage`.

