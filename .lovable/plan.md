

## Sostituzione colori hardcoded con token semantic

### Stato attuale (verificato)

Dopo grep su tutto `src/`, i colori hardcoded **non semantici** rimasti sono pochi e tutti ben localizzati:

| Posizione | Colore | Natura |
|---|---|---|
| `src/pages/MotoGPPage.tsx` righe 15-21 | HEX/rgba Ducati, Aprilia, KTM, Yamaha, Honda | **Brand di terzi** |
| `src/pages/Index.tsx` righe 191-195 | HEX DAZN `#1a1a2e`/`#f5f5f5` + Tailwind `sky-*` | **Brand di terzi** |
| `src/pages/JuventusPage.tsx` righe 49-53 | Tailwind `emerald-*`, `blue-*`, `amber-*` | **Differenziazione competizione** (non brand) |
| `src/pages/JuventusPage.tsx` righe 246-247 | HEX DAZN + Tailwind `sky-*` | **Brand di terzi** |

I `bg-[hsl(var(--gold))]` ecc. trovati in `Header`, `ReleaseCountdownBadge` e altri sono **già semantic** (sintassi arbitraria Tailwind che punta a CSS variables): nessuna modifica.

### Approccio

Distinguere due categorie e trattarle in modo diverso, in linea con `AGENTS.md` ("Brand colors costruttori MotoGP, badge Juve, foto piloti: invariati"):

1. **Colori brand di terzi** (DAZN, Sky, costruttori MotoGP): NON sostituirli con token oro/blu — perderebbero la riconoscibilità del marchio. Però **centralizzarli come CSS variables in `index.css`** così sono tunabili da un unico punto e non più sparsi come literal HEX nei componenti.
2. **Colori non-brand** (competizioni Juve): sostituirli con i **token semantici esistenti** (`--gold`, `--accent`, `--destructive`) così seguono la palette oro/blu in entrambi i temi.

### Modifiche

**1. `src/index.css` — nuovi CSS variables per colori brand terzi**

In `:root` e `.dark` (con eventuali tweak per leggibilità nei due temi):

```css
/* Brand di terzi — centralizzati ma non parte della palette oro/blu */
--brand-dazn: 240 27% 14%;        /* #1a1a2e */
--brand-dazn-contrast: 0 0% 96%;  /* #f5f5f5 */
--brand-sky: 201 96% 32%;         /* sky-600 */

/* MotoGP costruttori (Ducati, Aprilia, KTM, Yamaha, Honda) */
--brand-ducati: 0 100% 40%;
--brand-aprilia: 0 0% 0%;
--brand-ktm: 24 100% 50%;
--brand-yamaha: 215 100% 32%;
--brand-honda: 354 95% 46%;
```

Nessun cambio di palette oro/blu. Solo "estrazione" dei brand color hardcoded.

**2. `src/pages/MotoGPPage.tsx` — usa `hsl(var(--brand-*))`**

Sostituire la mappa con riferimenti a CSS variables:

```tsx
const MOTOGP_CONSTRUCTOR_COLORS: Record<string, { border: string; bg: string }> = {
  ducati:  { border: 'hsl(var(--brand-ducati))',  bg: 'hsl(var(--brand-ducati) / 0.08)' },
  aprilia: { border: 'hsl(var(--brand-aprilia))', bg: 'hsl(var(--brand-aprilia) / 0.06)' },
  ktm:     { border: 'hsl(var(--brand-ktm))',     bg: 'hsl(var(--brand-ktm) / 0.10)' },
  yamaha:  { border: 'hsl(var(--brand-yamaha))',  bg: 'hsl(var(--brand-yamaha) / 0.08)' },
  honda:   { border: 'hsl(var(--brand-honda))',   bg: 'hsl(var(--brand-honda) / 0.08)' },
};
```

Stessa identità visiva, ma nessun HEX/rgba inline.

**3. `src/pages/Index.tsx` e `src/pages/JuventusPage.tsx` — badge DAZN/Sky via token**

Pattern unificato basato sui nuovi token:

```tsx
// DAZN
'bg-[hsl(var(--brand-dazn-contrast))] text-[hsl(var(--brand-dazn))] border-[hsl(var(--brand-dazn))]/30 dark:bg-[hsl(var(--brand-dazn))] dark:text-[hsl(var(--brand-dazn-contrast))] dark:border-[hsl(var(--brand-dazn))]/60 text-[10px]'

// Sky
'bg-[hsl(var(--brand-sky))]/15 text-[hsl(var(--brand-sky))] border-[hsl(var(--brand-sky))]/40 dark:bg-[hsl(var(--brand-sky))]/30 dark:text-sky-100 dark:border-[hsl(var(--brand-sky))]/60 text-[10px]'
```

Rendering identico, nessun HEX literal nei componenti, modifica futura del brand color in **un solo punto** (`index.css`).

**4. `src/pages/JuventusPage.tsx` — `COMPETITION_COLORS` via token semantici**

Queste **non sono brand**, quindi le ri-mappiamo sulla palette oro/blu:

```tsx
const COMPETITION_COLORS: Record<string, string> = {
  // Serie A → oro (competizione principale, fil rouge brand)
  'Serie A': 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] border-[hsl(var(--gold))]/40',
  // Champions League → navy/accent
  'Champions League': 'bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] dark:text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))]/40',
  // Coppa Italia → secondary navy
  'Coppa Italia': 'bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))] dark:text-[hsl(var(--gold))] border-[hsl(var(--secondary))]/40',
};
```

Risultato: i tre badge si differenziano restando **dentro la palette oro/blu**, quindi seguono automaticamente light/dark.

### File modificati

| File | Modifica |
|---|---|
| `src/index.css` | Aggiunti CSS variables `--brand-dazn`, `--brand-dazn-contrast`, `--brand-sky`, `--brand-ducati`, `--brand-aprilia`, `--brand-ktm`, `--brand-yamaha`, `--brand-honda` in `:root` e `.dark` se serve. |
| `src/pages/MotoGPPage.tsx` | `MOTOGP_CONSTRUCTOR_COLORS` usa `hsl(var(--brand-*))` invece di HEX/rgba. |
| `src/pages/Index.tsx` | Badge DAZN/Sky con classi `bg-[hsl(var(--brand-*))]`. |
| `src/pages/JuventusPage.tsx` | `COMPETITION_COLORS` via token oro/accent/secondary; badge DAZN/Sky via token brand. |
| `changelog.md` | Voce sotto Unreleased: "Refactor: tutti i colori hardcoded estratti in CSS variables semantici (`--brand-*`); competizioni Juve rimappate sulla palette oro/blu." |

### Cosa NON cambia

- Identità visiva: i badge DAZN/Sky e i loghi MotoGP **restano visivamente identici** ai loro brand ufficiali (cambia solo dove sono definiti i colori).
- Palette oro/blu del progetto: invariata.
- API, hook, edge functions, layout, animazioni: invariati.
- Versione resta **2.1.0**.

### Vantaggi

- Zero HEX/rgba literal nei componenti React (verificabile con `grep -rE "#[0-9A-Fa-f]{3,6}|rgba?\(" src/`).
- Brand colors centralizzati: cambio futuro di un brand color = una riga in `index.css`.
- Competizioni Juve seguono ora automaticamente il cambio tema con identità oro/blu.

### Checklist post-edit

1. `grep -rE "#[0-9A-Fa-f]{3,6}|rgba?\(" src/ --include="*.tsx" --include="*.ts"` → zero match in componenti (solo eventualmente in `index.css` come definizioni token).
2. `/motogp` Classifica Costruttori: cornici brand identiche a prima.
3. `/` Home: badge DAZN/Sky identici a prima in light e dark.
4. `/juventus` Calendario: badge competizione (Serie A, Champions, Coppa Italia) ora in tinte oro/blu coerenti, leggibili in entrambi i temi.
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

