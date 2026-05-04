## Obiettivo

Aggiungere una pagina **Calendario** (vista mese tipo Google Calendar) con tutti gli eventi di **Juventus**, **F1** (FP1, FP2, FP3, Qualifiche, Sprint, Gara) e **MotoGP** (FP, Qualifiche, Sprint, Warmup, Gara), aggiornati in tempo reale e riallineati al click su **Sincronizza**.

## Architettura

```text
┌─────────────────┐   useCalendarEvents() ┌──────────────────────────┐
│  /calendario    │ ─────────────────────▶ │ React Query già esistenti│
│  CalendarPage   │                        │ - juventus calendar      │
│  (vista mese)   │                        │ - f1 calendar            │
└─────────────────┘                        │ - motogp calendar (esteso)│
        │                                  └──────────────────────────┘
        │                                                │
        └──── Sincronizza (useSyncAll) ──────────────────┘
```

Riuso degli **stessi `queryKey`** già usati dalle pagine sport: il click su "Sincronizza" già esistente in Home invalida e ripopola le stesse cache che la pagina Calendario consuma → real-time + sync coerente, zero duplicazione.

## Cosa cambia, in dettaglio

### 1. Backend: arricchire `sports-motogp` calendar con sessioni reali

Solo `sports-motogp/index.ts` viene esteso (F1 e Juventus già contengono il dato).

- Nuova funzione `fetchMotoGPSessions(eventId)` che chiama `https://api.motogp.pulselive.com/motogp/v1/results/events/{eventId}/sessions?categoryUuid=<MotoGP>` (categoria MotoGP). Pulselive espone per ogni evento la lista delle sessioni (FP1, P2, Q1, Q2, SPR, WUP, RAC) con `date` ISO e `type`.
- `fetchMotoGPCalendar` ora popola anche `sessions: MotoGPSession[]` per ciascun round, con tipo + datetime (lasciamo solo le sessioni della classe regina MotoGP, niente Moto2/Moto3).
- Mapping italiano per `type` → label UI: `FP1 → Prove libere 1`, `P2 → Prove libere 2`, `Q1 → Qualifiche 1`, `Q2 → Qualifiche 2`, `SPR → Sprint`, `WUP → Warmup`, `RAC → Gara`.
- Le chiamate sessioni sono parallelizzate (`Promise.all`) ma con cap (es. `Promise.allSettled` su tutti gli eventi della stagione, ~22 round). Se l'endpoint sessioni fallisce per un round, fallback "graceful": evento mantiene solo data_start/date_end senza sessioni (mai dati finti).
- Niente cambio shape per i consumer esistenti (campo `sessions` opzionale).

### 2. Hook aggregato: `useCalendarEvents()`

`src/hooks/useCalendarEvents.ts`:

- Compone `useF1Calendar(seasonF1)`, `useJuventusCalendar(seasonJ, page=1, pageSize=200)` (o tutte le pagine), `useMotoGPCalendar(seasonM)`.
- Per Juventus, prefetch di tutte le pagine come fa già `useSyncAll` (riusiamo la stessa logica `totalPages`).
- Normalizza in un tipo unificato:

```ts
type CalendarItem = {
  id: string;          // sport-roundOrId-sessionType
  sport: "juventus" | "f1" | "motogp";
  date: string;        // ISO datetime in TZ Europe/Rome
  endDate?: string;
  title: string;       // es. "F1: Qualifiche (Gran Premio del Canada)"
  shortTitle: string;  // es. "Qualifiche"
  context: string;     // es. "Gran Premio del Canada"
  color: "juventus" | "f1" | "motogp"; // → semantic token
};
```

- Espande F1 in N item per round (FP1/FP2/FP3/Sprint/Qualifying/Race) e MotoGP in N item da `sessions`.
- Juventus: 1 item per partita.

### 3. Pagina `/calendario` — vista mese

`src/pages/CalendarPage.tsx`:

- Header con: titolo mese (es. "Maggio 2026"), pulsanti Oggi / ◀ / ▶, già nello stile gold/navy.
- Griglia 7 colonne × 5–6 righe usando `date-fns` (già in deps tramite shadcn) per `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `startOfWeek({ weekStartsOn: 1 })`. **Niente shadcn `Calendar`** (DayPicker non supporta eventi multipli per cella in modo elegante): griglia custom Tailwind con celle scrollabili.
- Per ogni cella: numero giorno + lista compatta di max ~4 eventi (es. `● 15:00 MOTOGP: Sprint (Italy)`), restanti collassati come `+N altri`. Pallino colorato per sport (oro Juve, rosso F1, viola MotoGP via semantic tokens già nel design system).
- Click su un evento → Popover/Dialog con dettaglio (titolo completo, orario Rome, link alla pagina sport corrispondente).
- Tutte le date convertite con `Europe/Rome` (regola di progetto).
- Responsive: su mobile (md-) la vista mese diventa una **vista lista per giorno scrollabile** con sticky header data, perché la griglia 7 colonne non sta. Toggle non necessario ora.
- Pulsante **Sincronizza** in alto a destra (stesso `useSyncAll` della Home) con badge "Ultimo aggiornamento" + Progress, identico alla Home → real-time refresh dell'intero calendario.

### 4. Routing + menu

- `src/App.tsx`: aggiungere `<Route path="/calendario" element={<CalendarPage />} />`.
- `src/components/layout/Header.tsx`: nuova voce nav `{ label: "CALENDARIO", shortLabel: "AGENDA", path: "/calendario", Icon: CalendarBrandIcon }` inserita **tra HOME e STREAMING**.
- `src/components/layout/BrandIcons.tsx`: nuova icona `CalendarBrandIcon` (riuso stile delle altre, basata su lucide `CalendarDays` con gradient gold).

### 5. Sync allineato

`useSyncAll` già aggiorna F1/Juve/MotoGP calendar per la stagione corrente. Aggiungiamo:

- Estensione del prefetch Juventus a **tutte le pagine** (è già fatto, OK).
- Nessuna modifica al flusso: la nuova pagina consuma le stesse `queryKey`, quindi "Sincronizza" la aggiorna automaticamente.

### 6. Documentazione + versione

- `changelog.md`: nuova voce **v2.4.0** con la feature.
- `README.md`: aggiunta sezione "Calendario" alla mappa funzionale.
- `package.json` + `src/lib/version.ts`: bump a **v2.4.0**.
- `AGENTS.md` mappa funzionale: aggiunta `src/pages/CalendarPage.tsx`.
- `mem://features/structure`: aggiornata da 5 a 6 sezioni.

## Rischi e note

- **Endpoint sessioni Pulselive**: schema confermato in uso da motogp.com ma non documentato pubblicamente. Implementiamo con `Promise.allSettled` + fallback per round mancanti, mai dati statici.
- **Performance pagina**: ~22 GP × ~7 sessioni MotoGP + ~24 GP × 6 sessioni F1 + ~50 partite Juve = ~400 item/anno. Pre-filtraggio per mese visualizzato, render OK.
- **Lingua UI 100% italiana**: rispettato (header colonne LUN/MAR/…, "Oggi", "Mese", labels sessioni in italiano).
- **TZ Europe/Rome**: tutti i `date-fns` con `formatInTimeZone` o utility da `dateUtils.ts`.

## File toccati

- `supabase/functions/sports-motogp/index.ts` (estensione sessioni)
- `src/hooks/useCalendarEvents.ts` (nuovo)
- `src/pages/CalendarPage.tsx` (nuovo)
- `src/components/calendar/MonthGrid.tsx` (nuovo)
- `src/components/calendar/CalendarEventChip.tsx` (nuovo)
- `src/components/calendar/EventDetailPopover.tsx` (nuovo)
- `src/components/layout/Header.tsx`
- `src/components/layout/BrandIcons.tsx`
- `src/App.tsx`
- `src/lib/version.ts`, `package.json`, `changelog.md`, `README.md`
