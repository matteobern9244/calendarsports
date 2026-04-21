

## Uniformare l'effetto hover su tutte le card dell'app

### Obiettivo
Estendere l'effetto hover premium delle card "Prossimi Eventi" della Home (`EventCard`) a **tutte** le schede/card cliccabili e visivamente equivalenti dell'applicazione, garantendo coerenza visiva su desktop e mobile.

### Effetto hover di riferimento (preso da `EventCard`)
Composto da 4 elementi:
1. **Lift verticale**: `whileHover={{ y: -4 }}` (Framer Motion) o `hover:-translate-y-1` (CSS).
2. **Glow oro nell'ombra**: `hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]`.
3. **Bordo oro più intenso**: `hover:border-[hsl(var(--gold))]/55` (default) o `/80` (highlight).
4. **Linea oro superiore + radial glow** già attivi su `group-hover` (li vedi solo su EventCard / JuventusPage / HighlightCard).
5. Transizione: `transition-[box-shadow,border-color,transform] duration-300 ease-out`.

### Inventario card da uniformare

| # | File | Componente / blocco | Stato attuale | Azione |
|---|------|---------------------|---------------|--------|
| 1 | `src/components/common/EventCard.tsx` | EventCard (riferimento) | Già OK | Nessuna modifica |
| 2 | `src/pages/JuventusPage.tsx` (riga 346) | Card calendario partita | Già coerente (hover oro + lift) | Nessuna modifica |
| 3 | `src/components/highlights/HighlightCard.tsx` | Card highlight YouTube | Già coerente | Nessuna modifica |
| 4 | `src/pages/SinnerPage.tsx` (riga 118) | Card torneo Sinner (`<div className="rounded-xl border ...">`) | Solo `hover:border-primary/30 transition-all` — **debole** | **Allineare al pattern EventCard** |
| 5 | `src/pages/StreamingPage.tsx` (riga 450) | Card release film/serie (`<Card>` shadcn) | Solo `group-hover:-translate-y-0.5 group-hover:shadow-lg` — **non coerente** | **Allineare al pattern EventCard** |
| 6 | `src/components/home/TonightTvList.tsx` (riga 309) | Righe TV (`<li>`) | Solo `hover:bg-primary/10` (riga di tabella) | **Lasciare invariato** — è una riga di tabella, non una card. Il pattern card non si applica. |
| 7 | Tabelle `Formula1Page` / `MotoGPPage` / `JuventusPage` (classifiche) | `TableRow` con `hover:bg-muted/50` (default shadcn) | Riga di tabella | **Lasciare invariato** — non sono card. |
| 8 | `src/pages/JuventusMatchPage.tsx` `InfoRow` (riga 434) | Riquadro info statico (label/valore) | Nessun hover | **Lasciare invariato** — non interattivo, non cliccabile. |
| 9 | `TonightTvList` Card contenitore (riga 197) | Card di sezione (non cliccabile) | Nessun hover | **Lasciare invariato** — wrapper di sezione, non un item. |

### Modifiche concrete

#### A. `src/pages/SinnerPage.tsx` — card tornei (riga 117-138)

Sostituire il `<div>` corrente con un `motion.div` che applica esattamente lo stesso pattern di `EventCard`:

```tsx
import { motion } from "framer-motion"; // già importato

<motion.div
  key={i}
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35 }}
  whileHover={{ y: -4 }}
  className={cn(
    "group relative rounded-2xl border bg-card p-4",
    "transition-[box-shadow,border-color,transform] duration-300 ease-out",
    "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
    "hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
    "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
  )}
>
  {/* Linea oro superiore + radial glow per coerenza con EventCard */}
  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
  <span aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]" />
  {/* contenuto esistente invariato, avvolto in relative z-[1] dove serve */}
</motion.div>
```

Cambia `rounded-xl` → `rounded-2xl` per allinearsi al pattern; nessun cambio di contenuto, dimensioni o spacing interno (`p-4` resta).

#### B. `src/pages/StreamingPage.tsx` — card release (riga 443-489)

Sostituire la `<Card>` shadcn con il pattern coerente, mantenendo il `<button>` esterno per accessibilità:

```tsx
<button
  key={`${item.type}-${item.tmdbId}`}
  type="button"
  onClick={() => setSelected(item)}
  className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
>
  <motion.div
    whileHover={{ y: -4 }}
    className={cn(
      "relative overflow-hidden rounded-2xl border bg-card",
      "transition-[box-shadow,border-color,transform] duration-300 ease-out",
      "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
      "hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
      "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
    )}
  >
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300 z-10" />
    {/* poster + CardContent invariati: solo sostituiamo <Card>/<CardContent> con <div> equivalenti */}
  </motion.div>
</button>
```

Sostituiamo `<Card>` con `<motion.div>` e `<CardContent className="p-3 space-y-1">` con `<div className="p-3 space-y-1">`. Layout, poster, badge e dimensioni grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`) **invariati** → nessun rischio di regressione layout.

### Cosa NON viene toccato (anti-regressione)

- **Tabelle classifiche** (F1, MotoGP, Serie A): mantengono `hover:bg-muted/50` di default — sono righe, non card.
- **Righe TonightTvList**: pattern row table-like, hover sottile su sfondo già appropriato.
- **InfoRow** in `JuventusMatchPage`: blocco informativo statico, non cliccabile.
- **Card di sezione** (TonightTvList wrapper, ErrorBoundary, OfflineFallback): contenitori top-level, non item.
- **Bottoni, ToggleGroup, badge, Header, Tabs**: già hanno pattern hover propri coerenti col tema oro.
- **Altri `<Card>` shadcn** non listati: non esistono altre card cliccabili visivamente "item-like" oltre alle 5 censite.

### File modificati

1. `src/pages/SinnerPage.tsx` — card tornei (sezione "Tornei").
2. `src/pages/StreamingPage.tsx` — card release film/serie (sezione "Nuove uscite").

### Verifica post-modifica

- `npm run lint` + `npm run build` per validare.
- Verifica visiva manuale su desktop (≥1024px) e mobile (375px) di:
  - Home → card "Prossimi Eventi" (riferimento).
  - Sinner → tab "Tornei" (deve avere hover identico).
  - Streaming → tab "Nuove uscite" (deve avere hover identico).
  - Juventus → tab "Calendario" (già OK, verifica regressione zero).
  - F1 / MotoGP → tab "Highlights" (HighlightCard già OK).
- Conferma che le tabelle classifiche **non** abbiano lift/glow oro (corretto: sono tabelle).

### Note tecniche

- Tutti gli stili usano i CSS token `--gold`, `--navy-dark` esistenti in `src/index.css` → nessun colore hardcoded.
- `whileHover` di Framer Motion rispetta `prefers-reduced-motion` automaticamente.
- Le linee oro top + radial glow sono già usate su EventCard, JuventusPage card e HighlightCard: coerenza totale.
- Nessun cambio di routing, hook, payload backend o struttura dati.

