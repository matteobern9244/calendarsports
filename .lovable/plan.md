

## Restyling premium del player header Sinner

### Problemi rilevati nella schermata attuale

1. **Foto tagliata in alto**: `object-cover` su contenitore quadrato 96×96 centra l'immagine landscape `Jannik_Sinner_US_Open_2025_(cropped).jpg` sul torso/braccia, tagliando la testa. Va usato `object-position: top` (o `object-top`) e l'aumento del contenitore.
2. **Gerarchia visiva piatta**: ranking #1 oro grande è ok, ma "Stagione 2026 24-2" e "Best ranking #1" hanno la stessa size del nome → si confondono.
3. **Densità bassa**: tre blocchi statistici allineati a `items-end` con grandi spazi vuoti a destra (vedi screenshot: tutto si addensa a sinistra, vuoto a destra).
4. **Chip Slam poco leggibili**: micro-pillole `border + bg/10` su sfondo card simile → contrasto basso, soprattutto in tema chiaro.
5. **`<dl>` Altezza/Peso/Nato a** orizzontali con label muted → in tema chiaro la label sparisce, leggibilità scarsa.
6. **Footer "Fonte..."** centrato a sinistra `text-[11px]` quasi invisibile.

### Soluzione visiva (entrambi i temi)

Layout a due colonne ben definite con superficie a doppio livello:

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐   JANNIK SINNER  🇮🇹 Italia              │
│  │          │   ┌────────────────────────────────────────┐ │
│  │  FOTO    │   │ #1  ATP SING.  │ 24-2  STAG.  │ #1 BEST│ │
│  │ 128×160  │   │ aggior. 12 apr │ 92.3% · 3 ti │ MIGLIOR│ │
│  │  ratio   │   └────────────────────────────────────────┘ │
│  │  4:5     │                                               │
│  │ object-  │   ⬢ Altezza  ⬢ Peso  ⬢ Mano  ⬢ Nato a       │
│  │ top      │     191 cm    77 kg   destra  San Candido    │
│  └──────────┘                                               │
│              GRANDE SLAM                                     │
│              [AO V·24·25] [RG F·25] [W V·25] [US V·24] ...  │
│  ─────────────────────────────────────────────────────────  │
│  Fonte: Wikipedia Italia · Statistiche aggiornate al ...    │
└─────────────────────────────────────────────────────────────┘
```

### Modifiche puntuali a `src/components/sinner/PlayerHeader.tsx`

**1. Foto risolta**
- Container ratio **4:5** (portrait), `w-28 h-36` mobile / `w-32 h-40` desktop, `rounded-2xl overflow-hidden`.
- `<img class="object-cover object-top">` → la testa di Sinner non viene più tagliata.
- Ring oro doppio: `ring-2 ring-primary/60 ring-offset-2 ring-offset-card` + sottile gradiente oro decorativo dietro (`absolute -inset-1 gold-gradient opacity-30 blur-md`) come accent premium.
- Fallback iniziali "JS" mantiene stesso ratio.

**2. Sezione header**
- Wrapper card promosso: `bg-card` + `bg-gradient-to-br from-card via-card to-secondary/10` per profondità in entrambi i temi.
- Bordo top oro sottile: `border-t-2 border-t-primary/60` come accento brand.
- Padding aumentato `p-5 sm:p-7`.

**3. Statistiche chiave (3 KPI cards)**
Sostituisco i tre blocchi flat con **3 mini-card** orizzontali:
- Ognuna: `rounded-xl bg-muted/50 border border-border/50 px-4 py-3`.
- Label uppercase oro `text-primary/80 text-[10px] tracking-widest`.
- Valore principale grande, sub-valore più piccolo sotto.
- Su desktop: `grid grid-cols-3 gap-3`. Su mobile: stack verticale.
- Ranking #1 resta protagonista con size `text-5xl` e gradiente oro via `text-gold-gradient` (esiste già in `index.css`).

**4. Bio facts (Altezza/Peso/Mano/Nato a)**
- Sostituisco `<dl>` flat con **chip orizzontali** in una riga flex-wrap.
- Ogni chip: `rounded-full bg-muted px-3 py-1.5` con icona Lucide (`Ruler`, `Weight`, `Hand`, `MapPin`).
- Label inline: `<icon> Altezza · 191 cm`.
- Funziona perfettamente sia desktop sia mobile (wrapping naturale).

**5. Sezione Grande Slam**
- Header sezione: `border-t border-border/50 pt-4 mt-5`.
- Chip vincitori (V) → fondo gradiente oro `gold-gradient text-primary-foreground` (più impatto, riconoscibili a colpo d'occhio).
- Chip non-vincitori → `bg-secondary/30 border border-border text-foreground`.
- Layout: chip leggermente più grandi `px-3 py-1.5 text-sm`, gap 2.
- Tooltip con risultato completo invariato (`title=...`).

**6. Footer source**
- Spostato in basso con `border-t border-border/30 pt-3 mt-5`.
- `text-xs text-muted-foreground` (non più 11px), con icona `Info` opzionale.

### Coerenza dual-theme

- Tutti i colori usano i token semantici esistenti (`bg-card`, `bg-muted`, `text-primary`, `border-border`, `text-foreground`, `text-muted-foreground`).
- Nessun colore hardcoded.
- I gradienti usano le utility già definite in `index.css` (`gold-gradient`, `text-gold-gradient`).
- Verificato che `--primary`, `--card`, `--muted`, `--border` siano definiti sia in `:root` (chiaro) sia in `.dark` (già nel CSS).

### Coerenza responsive

- Mobile (`< sm`): foto e info impilate verticalmente, KPI in stack, chip wrap automatico.
- Desktop (`>= sm`): foto a sinistra fissa 128px larghezza, info a destra che riempie. KPI a 3 colonne. Chip Slam in riga.
- Nessuna regressione su `useSinnerInfo` o `SinnerPage.tsx`: i prop del componente restano identici, solo il rendering interno cambia.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/sinner/PlayerHeader.tsx` | EDIT | Restyling completo: foto portrait 4:5 con `object-top`, glow oro decorativo, KPI in 3 mini-card, bio in chip con icone Lucide, Slam con chip premium oro per vincitori, footer separato. Nessun cambio API prop. |
| `changelog.md` | EDIT | Voce in `### Changed`: restyling premium player header Sinner (foto fix, KPI cards, chip bio, Slam chip oro). |

### Cosa NON cambia

- API e prop di `PlayerHeader` invariate → `SinnerPage.tsx` non tocca.
- Dati Wikipedia/edge function: invariati.
- Token CSS, palette, fonts: invariati (uso solo quelli già esistenti).
- Nessuna nuova dipendenza (icone già da `lucide-react` già nel progetto).
- Versione applicativa invariata `2.1.0`.

### Checklist post-edit

1. `/sinner` desktop, tema scuro: foto integra (testa visibile), 3 KPI ordinate, chip Slam oro per AO/W/US/Finals.
2. `/sinner` desktop, tema chiaro: tutto leggibile, nessun chip "fantasma".
3. `/sinner` mobile (375px): foto in alto, info sotto, chip Slam wrap su 2 righe pulito.
4. `npm run lint` + `npm run build`.
5. `changelog.md` aggiornato.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

