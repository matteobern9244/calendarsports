

## Limitare transizioni globali al solo istante del cambio tema

### Stato attuale (verificato)

In `src/index.css` righe 161-176 c'è una transizione globale **permanente** su 6 proprietà di colore applicata a `*, *::before, *::after`:

```css
*, *::before, *::after {
  transition:
    background-color 280ms ease,
    border-color 280ms ease,
    color 200ms ease,
    fill 280ms ease,
    stroke 280ms ease,
    box-shadow 280ms ease;
}
```

Esiste una classe escape `.theme-no-transition` ma **nessuno la usa** (zero match in `src/`, zero match in `useTheme.ts`).

### Problema

La transizione globale è attiva **sempre**, non solo durante il cambio tema:

- ogni `hover` su un `EventCard` o pill broadcaster anima `background-color`/`border-color` su 280ms anche quando dovrebbe essere immediato;
- componenti pesanti come `StreamingPage` (palinsesto con dozzine di `Accordion` e righe canale), `Formula1Page`/`MotoGPPage` (tabelle classifica piloti+costruttori), `JuventusPage` (calendario Serie A) hanno **centinaia di nodi** che pagano il costo di stylre recalc su ogni interazione;
- `box-shadow 280ms` su `*` è particolarmente costoso (forza repaint su elementi figli);
- componenti che hanno **già** la loro `transition-colors`/`transition-all` (Header navigation, SeasonSelector, Button, ecc.) ricevono **due transizioni in conflitto**: la regola `*` perde per specificità ma la composizione resta da risolvere ad ogni interazione.

I componenti che servono davvero animati al cambio tema sono pochi: lo sfondo (`body`), bordi globali (regola `* { @apply border-border }`), e gli elementi che usano token `--background`, `--foreground`, `--muted`, ecc. Tutti questi cambiano valore HSL quando `<html>` passa da `.dark` a `:root`.

### Soluzione

**Inversione della logica**: niente transizione permanente, transizione **solo nell'istante del toggle tema**.

1. **`src/index.css`**: rimuovere il blocco `*, *::before, *::after { transition: ... }` permanente. Sostituirlo con una regola attiva **solo** quando `<html>` ha la classe `theme-transitioning`:

```css
/* Transizione applicata SOLO durante il toggle tema (~300ms),
   gestita dall'hook useTheme. Evita costi di transizione su tutte
   le interazioni (hover, focus, mount) di componenti pesanti. */
html.theme-transitioning,
html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
  transition:
    background-color 280ms ease,
    border-color 280ms ease,
    color 200ms ease,
    fill 280ms ease,
    stroke 280ms ease,
    box-shadow 280ms ease;
}

@media (prefers-reduced-motion: reduce) {
  html.theme-transitioning,
  html.theme-transitioning *,
  html.theme-transitioning *::before,
  html.theme-transitioning *::after {
    transition: none !important;
  }
}
```

La classe `.theme-no-transition` esistente diventa obsoleta — la rimuovo.

2. **`src/hooks/useTheme.ts`**: nell'`useEffect` che applica il tema, **prima** di cambiare classe `light`/`dark`:
   - aggiungi `theme-transitioning` su `<html>`;
   - imposta un `setTimeout` a 320ms (28 0ms transizione + 40ms buffer) per rimuoverla.

Patch concettuale:

```ts
useEffect(() => {
  const root = document.documentElement;

  // Attiva transizioni globali solo per la durata del toggle.
  // Skip al primo mount (evita transizione su valori iniziali = noop visivo
  // ma costo reale su pagine pesanti).
  if (!isFirstMount.current) {
    root.classList.add("theme-transitioning");
    window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 320);
  }
  isFirstMount.current = false;

  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  localStorage.setItem("cse-theme", theme);

  // ...resto invariato (theme-color meta)
}, [theme]);
```

`isFirstMount` è un `useRef(true)` per evitare di attivare la transizione al primo render (tema già coerente con DOM grazie allo script anti-FOUC in `index.html`).

### File modificati

| File | Modifica |
|---|---|
| `src/index.css` | Rimuove la transizione globale `*` permanente. Sostituita con regola `html.theme-transitioning *` attiva solo durante il toggle. Rimossa la classe orfana `.theme-no-transition`. Mantenuto il rispetto di `prefers-reduced-motion`. |
| `src/hooks/useTheme.ts` | Aggiunge/rimuove la classe `theme-transitioning` su `<html>` per 320ms al cambio tema, esclusivo del primo mount. |
| `changelog.md` | Voce sotto Unreleased: "Performance: transizioni globali tema applicate solo durante il toggle (320ms), non più su ogni interazione hover/focus dei componenti pesanti." |

### Cosa NON cambia

- Cambio tema visivamente identico a prima (transizione 280ms ease su colore + sfondo + bordi).
- Componenti con `transition-colors`/`transition-all` locali (Header, Button, SeasonSelector, ecc.) continuano ad animarsi al hover come prima — **anzi meglio**, senza regola `*` in conflitto.
- Anti-FOUC, theme-color meta, palette, brand tokens: invariati.
- Versione resta **2.1.0**.

### Benefici attesi

- **Hover su `StreamingPage`/`Formula1Page`/`MotoGPPage`/`JuventusPage`**: niente più transizione di 280ms su `box-shadow` propagata a centinaia di nodi → riduzione style recalc + paint per interazione.
- **Mount/unmount di componenti** (es. apertura `Accordion` palinsesto, dialog `ReleaseDetailDialog`): nessuna transizione spuria sui figli.
- **`prefers-reduced-motion`**: comportamento invariato (nessuna transizione).
- **Cambio tema**: identico, percepito come prima.

### Checklist post-edit

1. Toggle sole/luna: transizione fluida 280ms come oggi, in light → dark e viceversa.
2. Hover su EventCard, badge, righe palinsesto: cambio colore istantaneo come da classi locali, nessuna animazione spuria di sfondo/ombra.
3. Apertura Accordion in `/streaming`: nessun "wave" di transizione sui canali.
4. `prefers-reduced-motion: reduce` in DevTools: cambio tema istantaneo, nessuna transizione.
5. Grep `theme-no-transition` → 0 occorrenze.
6. `npm run lint` + `npm run build`.
7. Aggiornare `changelog.md`.
8. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

