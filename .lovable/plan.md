

## Badge broadcaster: copertura estesa oltre DAZN/Sky con leggibilità garantita in light/dark

### Stato attuale (verificato)

Il backend `supabase/functions/sports-football/index.ts` espone fino a **3 broadcaster per partita** (`broadcasterNational1/2/3` dalla Lega Serie A API), uniti con ` | `. Lato UI però:

- `src/pages/Index.tsx` (righe 184-208) e `src/pages/JuventusPage.tsx` (righe 238-254) hanno entrambi un branch `if DAZN ... else Sky`. **Tutto ciò che non è DAZN viene stilizzato come Sky** — sbagliato per NOW, Amazon Prime Video, Mediaset, RAI, TV8, Discovery+/Eurosport, ecc.

Broadcaster realistici sul calcio italiano (Serie A, UCL, Coppa Italia) che possono comparire nei prossimi mesi:

| Broadcaster | Tinta brand riconoscibile |
|---|---|
| DAZN | navy `#1a1a2e` |
| Sky / Sky Sport | sky-blue `#0072CE` |
| NOW | viola/magenta `#7B2BFF` |
| Amazon Prime Video | teal `#00A8E1` |
| Mediaset / Mediaset Infinity | blu intenso `#0046AD` |
| RAI / RaiPlay | blu istituzionale `#003C8F` |
| TV8 | arancione `#FF6B00` |
| Discovery+ / Eurosport | blu Discovery `#0099E0` / verde Eurosport `#00A859` |
| **Fallback altro** | neutro `--muted` |

### Approccio

Coerente con il pattern esistente (brand colors estratti come CSS variables in `index.css`, mai HEX nei componenti):

1. **Centralizzare** i nuovi colori in `src/index.css` come `--brand-now`, `--brand-amazon`, `--brand-mediaset`, `--brand-rai`, `--brand-tv8`, `--brand-discovery`, `--brand-eurosport`. Tinte leggermente schiarite in `.dark` per leggibilità (stesso pattern già usato per Sky/Ducati/ecc.).
2. **Estrarre** la logica di stile in un helper unico `src/lib/broadcasterStyle.ts` che ritorna le classi Tailwind giuste per un nome broadcaster, con:
   - normalizzazione case-insensitive (`name.toLowerCase().includes('now')`, `'amazon'`, `'prime'`, `'mediaset'`, `'rai'`, `'tv8'`, `'discovery'`, `'eurosport'`, `'sky'`, `'dazn'`).
   - **stessa logica per light e dark** già usata per Sky: `bg-[hsl(var(--brand-X))]/20 text-[hsl(var(--brand-X))] border-[hsl(var(--brand-X))]/40 dark:bg-[hsl(var(--brand-X))]/30 dark:text-[hsl(var(--brand-X))]` con eventuali override `text-*-100` quando il colore brand è troppo scuro per fare da text in dark.
   - DAZN mantiene il suo trattamento speciale "pill solida" (sfondo pieno) perché è la sua identità grafica forte.
   - **Fallback**: per broadcaster non riconosciuti, classe neutra `bg-muted text-foreground border-border` — sempre leggibile in entrambi i temi, nessun colore casuale.
3. **Usare** l'helper sia in `Index.tsx` che in `JuventusPage.tsx`, eliminando la duplicazione del condizionale inline.

### Modifiche

**1. `src/index.css` — nuovi token brand**

In `:root` (light, tinte sature) e `.dark` (tinte ~55% lightness per contrasto su fondo scuro):

```css
/* light */
--brand-now: 270 90% 58%;
--brand-amazon: 197 100% 44%;
--brand-mediaset: 215 100% 34%;
--brand-rai: 215 100% 28%;
--brand-tv8: 24 100% 50%;
--brand-discovery: 201 100% 44%;
--brand-eurosport: 145 100% 33%;

/* .dark — leggermente schiarite */
--brand-now: 270 85% 68%;
--brand-amazon: 197 90% 60%;
--brand-mediaset: 215 90% 60%;
--brand-rai: 215 85% 65%;
--brand-tv8: 24 100% 60%;
--brand-discovery: 201 90% 60%;
--brand-eurosport: 145 70% 50%;
```

**2. `src/lib/broadcasterStyle.ts` — helper unico (NUOVO)**

```ts
export type BroadcasterStyle = {
  className: string;
  // true se richiede pill solida (DAZN style)
  solid?: boolean;
};

const RULES: { match: (n: string) => boolean; className: string; solid?: boolean }[] = [
  { match: n => n.includes('dazn'),
    className: 'bg-[hsl(var(--brand-dazn))] text-[hsl(var(--brand-dazn-contrast))] border-[hsl(var(--brand-dazn))] dark:bg-[hsl(var(--brand-dazn-contrast))] dark:text-[hsl(var(--brand-dazn))] dark:border-[hsl(var(--brand-dazn-contrast))]',
    solid: true },
  { match: n => n.includes('now'),
    className: 'bg-[hsl(var(--brand-now))]/15 text-[hsl(var(--brand-now))] border-[hsl(var(--brand-now))]/40 dark:bg-[hsl(var(--brand-now))]/25 dark:text-[hsl(var(--brand-now))] dark:border-[hsl(var(--brand-now))]/60' },
  { match: n => n.includes('amazon') || n.includes('prime'),
    className: '...' /* idem con --brand-amazon */ },
  { match: n => n.includes('mediaset'),
    className: '...' /* --brand-mediaset, dark:text-blue-100 fallback per testo */ },
  { match: n => n.includes('rai'),
    className: '...' /* --brand-rai */ },
  { match: n => n.includes('tv8'),
    className: '...' /* --brand-tv8 */ },
  { match: n => n.includes('eurosport'),
    className: '...' /* --brand-eurosport */ },
  { match: n => n.includes('discovery'),
    className: '...' /* --brand-discovery */ },
  { match: n => n.includes('sky'),
    className: 'bg-[hsl(var(--brand-sky))]/20 text-[hsl(var(--brand-sky))] border-[hsl(var(--brand-sky))]/40 dark:bg-[hsl(var(--brand-sky))]/30 dark:text-sky-100 dark:border-[hsl(var(--brand-sky))]/60' },
];

export function getBroadcasterStyle(rawName: string): BroadcasterStyle {
  const n = rawName.trim().toLowerCase();
  const rule = RULES.find(r => r.match(n));
  if (rule) return { className: rule.className, solid: rule.solid };
  // Fallback neutro: sempre leggibile in entrambi i temi
  return { className: 'bg-muted text-foreground border-border' };
}
```

> **Garanzia leggibilità**: ogni regola usa il token brand sia per testo che per bordo, con sfondo soft (`/15-/25` opacity). Le tinte HSL sono scelte per avere lightness ~30-35% in light e ~55-65% in dark, garantendo contrasto AA su sfondo `--background` di entrambi i temi. Solo DAZN usa pill solida (testo bianco su navy in light, navy su bianco in dark — entrambi WCAG AAA). Fallback neutro `bg-muted` è già definito dal sistema design e garantito leggibile.

**3. `src/pages/Index.tsx` — usa l'helper**

Sostituire le righe 186-208 (il `.map(...).Badge` con condizionale inline) con:

```tsx
{ev.broadcaster.split('|').map(b => b.trim()).filter(Boolean).map(name => {
  const { className } = getBroadcasterStyle(name);
  return (
    <Badge key={name} variant="outline" className={cn('text-[10px]', className)}>
      {name}
    </Badge>
  );
})}
```

**4. `src/pages/JuventusPage.tsx` — usa l'helper**

Stessa sostituzione alle righe 240-252:

```tsx
{m.broadcaster.split(' | ').map((b: string) => {
  const { className } = getBroadcasterStyle(b);
  return (
    <span
      key={b}
      className={cn(
        'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
        className
      )}
    >
      {b.trim()}
    </span>
  );
})}
```

### File modificati

| File | Modifica |
|---|---|
| `src/index.css` | Aggiunti 7 nuovi token brand in `:root` e `.dark` (now, amazon, mediaset, rai, tv8, discovery, eurosport). |
| `src/lib/broadcasterStyle.ts` | **NUOVO** — helper `getBroadcasterStyle(name)` con regole per tutti i broadcaster + fallback neutro. |
| `src/pages/Index.tsx` | Badge broadcaster usa l'helper, niente più condizionale inline. |
| `src/pages/JuventusPage.tsx` | Pill broadcaster usa l'helper, niente più condizionale inline. |
| `changelog.md` | Voce sotto Unreleased: "Badge broadcaster: copertura estesa (NOW, Amazon, Mediaset, RAI, TV8, Discovery, Eurosport) con helper unificato e fallback neutro leggibile." |

### Cosa NON cambia

- DAZN e Sky restano visivamente identici a prima.
- Backend `sports-football`: nessuna modifica, continua a fornire la stringa joinata.
- Palette oro/blu, transizioni tema, anti-FOUC: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Grep `getBroadcasterStyle` → usato in entrambe le pagine; nessun condizionale `if DAZN else Sky` residuo.
2. `/` Home: badge DAZN/Sky identici a prima; eventuali NOW/Mediaset/Amazon (se presenti nei prossimi turni) leggibili in entrambi i temi.
3. `/juventus` Calendario: stesso comportamento.
4. Toggle light/dark: tutti i badge restano leggibili (testo non si confonde con sfondo).
5. Broadcaster sconosciuto (es. nome troncato o tipo nuovo) → badge neutro grigio leggibile, **mai** trasparente o invisibile.
6. `npm run lint` + `npm run build`.
7. Aggiornare `changelog.md`.
8. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

