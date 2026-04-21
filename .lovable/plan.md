

## Fix UI Juventus + visibilità loghi F1/MotoGP + foto Pirro

### Diagnosi (verificata)

1. **Juventus — Card "Prossima Partita" mancante**: la pagina mostra direttamente i tab Calendario/Classifica. L'endpoint `/sports-football?action=next-match` (mal nominato) ritorna in realtà solo la classifica sintetica. Il vero "next match" è già disponibile nei dati calendario tramite `nextUpcomingIndex`. Soluzione: derivare la card sul frontend, zero modifiche backend.
2. **Juventus — Riga Juventus poco visibile in Classifica (dark mode)**: oggi `bg-primary/5` (5% opacity) e logo a 20×20px. Quasi invisibile sullo sfondo scuro.
3. **F1 Costruttori — Loghi non visibili**: il backend `sports-f1` ritorna correttamente `logoUrl` per tutte e 10 le scuderie (verificato via curl). Il problema è che la pagina **monta già `<img>` con `logoUrl`** ma le immagini Wikimedia spesso falliscono il caricamento (rate-limit, redirect, CORS), `onError` nasconde il `<img>` con `display:none` e **non rimane nessun fallback visivo**. Risultato: spazio vuoto.
4. **MotoGP — Foto Pirro 404**: l'URL `pulselive.com/.../pirro.png` è inventato (verificato 404). La foto reale di Michele Pirro su Wikipedia è `https://upload.wikimedia.org/wikipedia/commons/7/79/Michele_Pirro_at_the_2025_Malaysian_Grand_Prix.jpg`.
5. **MotoGP Costruttori — Loghi invisibili (chiaro e scuro)**: i bordi colorati appaiono ma il logo dentro è vuoto. Causa: stessa di F1 (Wikimedia rate-limit/blocco hotlink) + il logo Honda è bianco su sfondo bianco/scuro senza contrasto. Inoltre `Gresini Racing Motogp` ritorna `constructor: null` perché `getTeamConstructor` non include la keyword "gresini" (Gresini è team Ducati).

### Implementazione

#### A. `src/pages/JuventusPage.tsx` — Card "Prossima Partita"

Aggiungere un componente inline `<NextMatchCard>` sopra `<Tabs>`, derivando i dati dal `calendar` già fetchato (zero chiamate aggiuntive):

- Calcolare `nextMatch = calendar?.items[calendar.nextUpcomingIndex - pageStart]` quando l'indice cade nella pagina corrente; altrimenti fare una piccola query separata (action `calendar` con page = pagina che contiene `nextUpcomingIndex`) **oppure** più semplice: usare lo stesso hook `useJuventusCalendar(season, targetPage, 1)` derivato. Scelta finale: **fetch dedicato** `useJuventusCalendar(season, Math.floor(nextUpcomingIndex/PAGE_SIZE)+1, 1)` — minimal payload, garantisce di avere il next match anche se l'utente è su un'altra pagina.
- La card mostra: badge competizione colorato (Serie A/Coppa Italia/Champions), nome avversario con logo, "vs" / "@", data + ora in Italian, broadcaster pill (riusando `getBroadcasterStyle`), `<EventCountdown>`, badge "Prossima" gold gradient.
- Layout: card grande gradient gold/navy in stile premium, padding generoso, sopra i Tabs.
- Stato vuoto: se nessuna partita futura → card non renderizzata.
- Loading skeleton breve durante fetch.

#### B. `src/pages/JuventusPage.tsx` — Enfasi riga Juventus in Classifica

- Background: da `bg-primary/5` → `bg-gradient-to-r from-[hsl(var(--gold))]/15 via-[hsl(var(--gold))]/8 to-transparent` con `border-l-4 border-[hsl(var(--gold))]` per indicatore laterale.
- Logo Juve: da `h-5 w-5` → `h-7 w-7` con `ring-2 ring-[hsl(var(--gold))]/40 rounded-full`.
- Testo squadra: già `text-primary font-bold`, aggiungere `text-base` (era ereditato sm) per risaltare di più.
- Numero posizione: enfatizzato in oro (`text-[hsl(var(--gold))]`).
- Punti: `text-[hsl(var(--gold))]` + `font-heading text-base`.

#### C. Nuovo componente `src/components/common/TeamLogo.tsx` — Fallback robusto

Componente riutilizzabile per loghi che fallisce con grazia:

- Props: `src?: string | null`, `name: string`, `size?: number` (default 32), `shape?: "circle" | "rounded"`, `className?`.
- Render `<img>` con `onError`: invece di nascondere, **switcha a una badge testuale** con le iniziali del team (es. "Aprilia Racing" → "AR") su sfondo `bg-muted` con `text-foreground font-heading font-bold`. Garantisce contrasto sia in tema chiaro che scuro.
- `referrerPolicy="no-referrer"` sull'`<img>` per massimizzare la chance di successo con Wikimedia (alcuni domini bloccano hot-link con Referer specifici).
- Stato interno `failed: boolean` per gestire fallback.

Sostituire le `<img>` "logo" in:
- `Formula1Page.tsx` cella Costruttori (riga 165-173) → `<TeamLogo src={c.logoUrl} name={c.constructor} size={32} shape="rounded" />`.
- `MotoGPPage.tsx` cella Costruttori (riga 189-209) → `<TeamLogo src={c.logoUrl} name={c.team} size={40} shape="rounded" />` dentro il box colorato; il box colorato del costruttore resta come bordo decorativo.
- `JuventusPage.tsx` classifica (riga 135) → `<TeamLogo src={s.logoUrl} name={s.team} size={isJuve ? 28 : 20} shape="circle" />`.
- `JuventusPage.tsx` calendario (riga 231) → `<TeamLogo src={opponentLogo} name={opponent} size={24} shape="circle" />`.
- Card "Prossima Partita" (nuova) → stesso componente.

Aggiungere `loading="lazy"` su tutti i logo non above-the-fold.

#### D. `src/pages/MotoGPPage.tsx` — Foto piloti con fallback robusto

Stesso problema dei loghi: oggi `<img>` con `onError` nascosta che lascia gap. Sostituire con un componente analogo `<RiderPhoto>` (può vivere inline o riutilizzare `TeamLogo` con shape "circle"):

- Mostra foto.
- `onError` → fallback: cerchio con iniziali del pilota (es. "MP" per Michele Pirro) su `bg-muted text-foreground font-heading font-bold`, mantenendo dimensione e cerchio.

#### E. `supabase/functions/sports-motogp/index.ts` — Fix Pirro + Gresini

1. **Pirro photo URL**: sostituire l'URL fasullo (riga 146) con quello reale Wikipedia:
   ```
   'https://upload.wikimedia.org/wikipedia/commons/7/79/Michele_Pirro_at_the_2025_Malaysian_Grand_Prix.jpg'
   ```
   (verificato via Wikipedia REST API).
2. **Gresini → Ducati**: aggiungere `gresini` alla regex Ducati in `getTeamConstructor` (riga 390): `if (t.includes('ducati') || t.includes('vr46') || t.includes('pramac') || t.includes('gresini'))`.
3. **Logo Honda fix contrasto**: il logo Honda Wikimedia (`Honda.svg` colore rosso). In dark mode è ok. Lasciato invariato — il problema reale è il fallback dei loghi quando Wikimedia 429, gestito da `<TeamLogo>`.

#### F. `tailwind.config.ts` o `src/index.css` — Nessuna modifica

I token gold/navy esistono già. Riusiamo classi Tailwind esistenti.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/common/TeamLogo.tsx` | NEW | Componente immagine con fallback iniziali su errore. `referrerPolicy="no-referrer"`. Usa token semantici per contrasto chiaro/scuro. |
| `src/pages/JuventusPage.tsx` | EDIT | Aggiungere `<NextMatchCard>` derivata dal calendario sopra `<Tabs>` (con fetch dedicato pagina del next match). Sostituire `<img>` logo con `<TeamLogo>`. Enfatizzare riga Juventus: gradient gold + bordo sx + logo più grande con ring + testo gold. |
| `src/pages/Formula1Page.tsx` | EDIT | Sostituire `<img logoUrl>` cella Costruttori con `<TeamLogo>`. Nessun cambio backend. |
| `src/pages/MotoGPPage.tsx` | EDIT | Sostituire `<img>` foto pilota e `<img>` logo costruttore con `<TeamLogo>` (shape circle/rounded). Box colorato costruttore preservato come decorazione. |
| `supabase/functions/sports-motogp/index.ts` | EDIT | Fix URL foto Pirro (Wikipedia reale). Aggiungere "gresini" a `getTeamConstructor` → mappa a Ducati. |
| `changelog.md` | EDIT | `### Added`: card "Prossima Partita" Juventus. `### Fixed`: foto Pirro 404, riga Juve invisibile, loghi costruttori F1/MotoGP con fallback iniziali, Gresini ora mappato a Ducati. |

### Cosa NON cambia

- Endpoint backend (eccetto fix mirato URL Pirro + regex Gresini).
- Lista canali, scraping streaming, hooks React Query, struttura route.
- Layout generale, tab order, paginazione.
- Nessuna nuova dipendenza.

### Rischi e mitigazioni

- **Wikimedia rate-limit persistente**: il fallback iniziali garantisce sempre contenuto visibile e leggibile, indipendente dalla fonte immagine.
- **Pirro photo Wikipedia futura rimozione**: il fallback "MP" subentra automaticamente.
- **`<NextMatchCard>` con fetch separato**: se `nextUpcomingIndex` cade già nella pagina corrente del calendario principale, riusiamo l'item — niente fetch extra. Solo se cade fuori facciamo una micro-query da 1 elemento.
- **Riga Juve enfatizzata troppo aggressiva**: gradient gold a bassa opacity (15%→8%→0) + bordo laterale 4px è premium ma non invadente.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian` (tutti i nuovi label sono italiani: "Prossima Partita", "Avversario", ecc.).
2. Deploy `sports-motogp`.
3. `curl sports-motogp?action=standings` → Pirro ora deve avere `photoUrl` Wikipedia reale.
4. `curl sports-motogp?action=constructor-standings` → Gresini deve ora avere `constructor: "ducati"` e `logoUrl` Ducati.
5. Apertura preview:
   - Pagina Juve: card "Prossima Partita" gold sopra i tab con dettagli completi.
   - Tab Classifica: riga Juventus chiaramente evidenziata in oro, logo grande con ring.
   - Pagina F1 → Costruttori: ogni riga mostra logo o iniziali fallback (MCL, FER, MER, ecc.).
   - Pagina MotoGP → Piloti: Pirro mostra foto reale; gli altri restano invariati. Costruttori: ogni team mostra logo o fallback iniziali.

### Checklist post-edit

1. `TeamLogo.tsx` creato con fallback iniziali.
2. Card "Prossima Partita" Juventus visibile e funzionante.
3. Riga Juve enfatizzata in classifica (chiaro + scuro verificati).
4. Loghi F1 costruttori visibili (con fallback grazioso).
5. Loghi MotoGP costruttori visibili in entrambi i temi.
6. Foto Pirro caricata.
7. `changelog.md` aggiornato.
8. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

