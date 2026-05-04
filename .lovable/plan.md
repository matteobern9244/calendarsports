# Calendario: vista Agenda + filtri sport (v2.5.0)

Estendo `src/pages/CalendarPage.tsx` con due funzionalità coordinate, mantenendo invariati hook dati (`useCalendarEvents`), edge functions e routing.

## 1. Toggle vista Mese / Agenda

In toolbar, accanto al titolo del mese, aggiungo un piccolo segmented control (2 bottoni `Mese` / `Agenda`) coerente con lo stile gold/uppercase esistente. Stato locale `view: "month" | "agenda"`, default `month`. Persistenza opzionale in `localStorage` (`calendar.view`).

- **Mese**: griglia attuale (desktop) + lista mobile attuale, invariate.
- **Agenda**: nuova vista a tutta larghezza (sia desktop che mobile), elenco cronologico raggruppato per giorno.

## 2. Vista Agenda

Mostra **tutti gli eventi del mese visualizzato** (stesso `view.y/view.m` della navigazione mese, così i bottoni `‹ ›` e `Oggi` continuano a funzionare). Per ogni giorno con eventi:

- Header sticky con data lunga IT (es. `Sabato 7 Giugno`) + contatore eventi. Giorno odierno evidenziato in oro.
- Lista eventi ordinati per ora con: pallino sport, ora `HH:MM` mono, badge sport, label breve, contesto in muted, eventuale broadcaster.
- Click apre lo stesso `Dialog` dettaglio già esistente (riuso `setSelectedEvent`).

Se nessun evento nel mese (dopo filtri): messaggio "Nessun evento in {monthLabel}".

ASCII layout:

```text
┌──────────────────────────────────────────────┐
│ SAB 7 GIUGNO                       3 eventi │
├──────────────────────────────────────────────┤
│ ● 15:00  [F1]    Qualifiche · Canada        │
│ ● 18:30  [JUVE]  vs Inter · Serie A · G.38  │
│ ● 20:00  [MOTO]  Sprint · Mugello           │
└──────────────────────────────────────────────┘
```

## 3. Filtri sport (legenda cliccabile)

La legenda esistente diventa interattiva. Stato locale `enabled: Record<CalendarSport, boolean>` (default tutti `true`), persistito in `localStorage` (`calendar.filters`).

- Ogni voce è un `button` toggle: stato attivo = pieno colore, stato disattivo = opacità 40% + line-through leggero.
- Aggiungo bottone `Tutti` per resettare.
- I filtri si applicano a **entrambe** le viste (mese + agenda) tramite un singolo `filteredEvents = useMemo(...)` che sostituisce `events` come fonte per `eventsByDay`.
- `aria-pressed` per accessibilità; `title` "Mostra/Nascondi {sport}".

## 4. Dettagli tecnici

**File modificato**: solo `src/pages/CalendarPage.tsx`. Nessuna modifica a hook, edge functions, types, design system.

**Nuovi util locali nel file**:
- `formatDayHeader(ymd)`: usa `Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })`, capitalizzato.
- `monthEventsSorted(filteredEventsByDay, view)`: appiattisce solo i giorni del mese visualizzato in array `{ key, ymd, events }` ordinato.

**Persistenza**:
```ts
const [enabled, setEnabled] = useState<Record<CalendarSport, boolean>>(() => {
  try { return { juventus: true, f1: true, motogp: true, ...JSON.parse(localStorage.getItem("calendar.filters") ?? "{}") }; }
  catch { return { juventus: true, f1: true, motogp: true }; }
});
useEffect(() => { localStorage.setItem("calendar.filters", JSON.stringify(enabled)); }, [enabled]);
```
Stesso pattern per `view`.

**Token e stile**: continuo a usare `--sport-juventus/f1/motogp`, `--gold`, classi `font-heading uppercase tracking-wider` esistenti. Nessun colore hardcoded.

**i18n**: tutto in italiano (label `Mese`, `Agenda`, `Tutti`, header giorno IT). Conforme a `check:italian`.

**Timezone**: tutti i formatter usano `timeZone: "Europe/Rome"` (conforme a `check:tz-juventus`).

## 5. Documentazione

- `package.json` + `src/lib/version.ts`: bump a `2.5.0`.
- `changelog.md`: nuova entry `## [2.5.0]` con "Vista Agenda nel Calendario" e "Filtri sport cliccabili".
- `README.md`: aggiorno la sezione Calendario menzionando vista Agenda e filtri.

## 6. Verifica

- `npm run build`, `npm run lint`, `npm run check:italian`, `npm run check:tz-juventus`.
- Manuale via preview su `/calendario`: toggle vista, toggle filtri, persistenza dopo reload, navigazione mese, click evento → dialog.

## Fuori scopo

- Vista Settimana/Giorno.
- Filtri per competizione (es. solo Champions, solo Sprint).
- Ricerca testuale.
- Modifica edge functions o shape dati.
