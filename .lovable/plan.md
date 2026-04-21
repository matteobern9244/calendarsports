

## Tema chiaro/scuro: transizioni fluide + palette oro/blu coerente in tutta l'app

### Obiettivo

Il toggle tema **esiste già** (icona sole/luna nell'header, hook `useTheme` con persistenza in `localStorage`), ma:

1. Mancano transizioni fluide al cambio tema → flash brusco.
2. C'è **FOUC** all'avvio: la pagina parte con `:root` (light) e poi React applica `.dark` → flicker.
3. La palette light è anonima (background grigio neutro 220 20% 97%) → identità oro/blu poco percepibile in light.
4. Alcuni componenti hanno colori hardcoded che **non adattano** correttamente light/dark (badge DAZN/Sky in `Index.tsx`, già OK in `JuventusPage.tsx`).

### Modifiche

**1. `index.html` — anti-FOUC**

Inline script nel `<head>` che applica la classe tema **prima** del render React, leggendo da `localStorage`:

```html
<script>
  (function() {
    try {
      var t = localStorage.getItem('cse-theme') || 'dark';
      document.documentElement.classList.add(t);
      document.documentElement.style.colorScheme = t;
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

Aggiornare anche `<meta name="theme-color">` con due varianti (media query light/dark) per la barra mobile.

**2. `src/index.css` — palette + transizioni**

A) **Light mode rifinito** con identità oro/blu più marcata:
- Background con tinta blu freddissima ma percepibile: `220 30% 96%` invece di `220 20% 97%`.
- Card leggermente più calda per contrasto: `220 25% 99%`.
- Border più visibile in tinta blu: `220 25% 84%`.
- Muted con tinta navy soft: `220 20% 90%`.
- `--secondary` light: passa da navy 20% a navy 25% per un blu più "premium".
- Mantenere oro `43 96% 56%` come `--primary` in entrambi i temi (è il fil rouge del brand).

B) **Dark mode**: lievi ritocchi per coerenza:
- Card un filo più "blu navy" (`220 35% 10%`) per accentuare identità.

C) **Transizioni globali fluide** dentro `@layer base`:

```css
html {
  color-scheme: light dark;
}
html.dark { color-scheme: dark; }
html:not(.dark) { color-scheme: light; }

/* Transizione fluida del cambio tema, solo sulle proprietà di colore */
*, *::before, *::after {
  transition:
    background-color 280ms ease,
    border-color 280ms ease,
    color 200ms ease,
    fill 280ms ease,
    stroke 280ms ease,
    box-shadow 280ms ease;
}

/* Disattiva la transizione globale durante il toggle iniziale per evitare effetti su animazioni di interazione (hover, motion) */
.theme-no-transition, .theme-no-transition *, .theme-no-transition *::before, .theme-no-transition *::after {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
```

> Nota importante: una transizione globale su `*` può rallentare hover su componenti pesanti (es. card con shadow). Limitiamo solo a proprietà colore/border/shadow (non a `transform` / `opacity` che sono già gestite da Tailwind/Framer Motion). Le animazioni Framer Motion non sono toccate.

**3. `src/hooks/useTheme.ts` — guard anti-flicker durante toggle**

Quando l'utente clicca il toggle, vogliamo la transizione fluida (lo desideriamo). Quando invece il valore viene letto la prima volta dall'init (già gestito da inline script), la classe `.theme-no-transition` viene rimossa al primo paint. Aggiunta minima:

```ts
useEffect(() => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  localStorage.setItem("cse-theme", theme);
}, [theme]);
```

(rispetto a oggi cambia solo l'aggiunta di `colorScheme` — gli scrollbar nativi e gli `<input>` adattano automaticamente il loro chrome al tema.)

**4. `src/pages/Index.tsx` — fix badge DAZN/Sky non adattivo**

Riga 190-194: i colori funzionano bene in dark ma in light il `bg-[#1a1a2e]` resta cupo e poco brand. Allinearli al pattern già usato in `JuventusPage.tsx` (variante light/dark con prefisso `dark:`):

```tsx
name.toLowerCase().includes('dazn')
  ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]/60 dark:bg-[#f5f5f5] dark:text-[#1a1a2e] dark:border-[#f5f5f5]/60 text-[10px]'
  : name.toLowerCase().includes('sky')
    ? 'bg-sky-600/20 text-sky-700 border-sky-600/40 dark:bg-sky-900/80 dark:text-sky-100 dark:border-sky-700/60 text-[10px]'
```

**5. Header — toggle già esistente, nessuna modifica strutturale**

Il pulsante sole/luna in `Header.tsx` (righe 196-204) già funziona, già ha icone corrette, già ha aria-label localizzato. Lasciato com'è.

### Verifica copertura tema in tutta l'app

Già verificato con grep:
- Tutti i componenti UI shadcn (`button`, `card`, `dialog`, `sheet`, ...) usano semantic tokens (`bg-background`, `text-foreground`, `border-border`, ecc.) → OK in entrambi i temi.
- Pagine sportive usano semantic tokens + classi gold/navy basate su CSS variables → OK.
- Loghi MotoGP brand colors (`#CC0000` ducati ecc.): sono colori brand di terzi, devono restare invariati in entrambi i temi → OK lasciarli hardcoded.
- Overlay dialog/sheet/drawer/alert-dialog usano `bg-black/80`: OK in entrambi i temi (overlay scuro è standard).
- Unico spot che rompe l'aspetto in light: badge DAZN/Sky in `Index.tsx` → fixato in modifica #4.

### File modificati

| File | Modifica |
|---|---|
| `index.html` | Script inline anti-FOUC + meta `theme-color` light/dark. |
| `src/index.css` | Light palette rifinita, dark palette lievi tweak, transizioni fluide globali, `color-scheme`. |
| `src/hooks/useTheme.ts` | Aggiunta `style.colorScheme` per allineare chrome nativo. |
| `src/pages/Index.tsx` | Badge DAZN/Sky con varianti light/dark. |
| `changelog.md` | Voce sotto Unreleased: "Tema: anti-FOUC con script inline, transizioni fluide oro/blu, palette light rifinita, badge broadcaster adattivi." |

### Cosa NON cambia

- Toggle sole/luna nell'header: funzionalità identica.
- Storage key `cse-theme` e default `dark`: invariati.
- Semantic tokens shadcn (`--primary`, `--secondary`, ecc.): nomi e ruoli invariati, solo i valori HSL della modalità light vengono ritoccati.
- Brand colors costruttori MotoGP, badge Juve, foto piloti: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Hard reload con tema dark → nessun flash bianco iniziale.
2. Hard reload con tema light → nessun flash scuro iniziale.
3. Toggle sole/luna → transizione fluida ~280ms su tutta l'app, senza scatti bruschi.
4. `prefers-reduced-motion: reduce` attivo → cambio tema istantaneo senza transizioni.
5. Tutte le pagine (`/`, `/streaming`, `/sinner`, `/juventus`, `/formula1`, `/motogp`) testate in entrambi i temi: leggibilità OK, identità oro/blu chiaramente percepita anche in light.
6. Badge DAZN/Sky in Home in light mode: leggibili e brandizzati.
7. `npm run lint` + `npm run build`.
8. Aggiornare `changelog.md`.
9. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

