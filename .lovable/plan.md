

## Rimuovere il contorno blu del logo header in dark mode

### Problema
Nell'header, il logo `logo-header.jpg` mostra un bordo/sfondo blu visibile in dark mode (vedi screenshot allegato). In light mode invece il contorno deve restare per garantire contrasto e leggibilità.

### Causa
Il logo è un `.jpg` (formato senza trasparenza) con sfondo blu navy incorporato nell'immagine stessa. Attualmente viene renderizzato in `src/components/layout/Header.tsx` con:

```tsx
className="h-10 md:h-14 w-auto rounded-md object-contain"
```

Non c'è alcun bordo CSS aggiunto: il "contorno blu" è il background del JPG stesso che, su sfondo scuro (`bg-card/80` dell'header), risulta visibile come un rettangolo blu attorno al testo dorato.

### Soluzione

Applicare un **blend mode CSS condizionale al tema** che rimuove lo sfondo blu del JPG solo in dark mode, lasciando il logo invariato in light mode.

L'approccio migliore (zero rischio di regressione, nessuna modifica al file immagine):

1. **Dark mode**: usare `mix-blend-mode: screen` (o `lighten`) sull'`<img>` tramite classe Tailwind `dark:mix-blend-screen`. Con `screen` un fondo blu navy scuro su un header blu navy scuro diventa praticamente trasparente, mentre il testo dorato chiaro resta perfettamente visibile (i pixel chiari dominano in `screen`).
2. **Light mode**: nessun blend mode → il logo viene renderizzato esattamente come ora, con il suo sfondo blu che funge da contorno/contrasto sullo sfondo chiaro.

### File da modificare

**`src/components/layout/Header.tsx`** (riga ~78, l'unico `<img>` del logo nell'app)

Modifica della sola `className` dell'`<img>`:

```tsx
// PRIMA
className="h-10 md:h-14 w-auto rounded-md object-contain"

// DOPO
className="h-10 md:h-14 w-auto rounded-md object-contain dark:mix-blend-screen"
```

Nessun'altra modifica necessaria. Il `rounded-md` resta (innocuo in dark perché il fondo viene fuso). Dimensioni, `width`, `height`, `fetchPriority`, `decoding`, `alt` e wrapper `<Link>` restano identici → **nessun impatto su layout, spacing o responsive (mobile/desktop)**.

### Verifica anti-regressione

- **Desktop dark**: logo senza contorno blu, testo "CALENDAR EVENTS" dorato visibile sull'header navy.
- **Desktop light**: logo identico ad oggi, con sfondo blu del JPG che fa da contrasto sullo sfondo chiaro.
- **Mobile dark/light**: stesso comportamento (la classe `h-10 md:h-14` non cambia, blend mode si applica a entrambi i breakpoint).
- **Layout**: dimensioni `h-10`/`md:h-14` `w-auto` invariate → nessuno shift, nessuna regressione su navbar o burger menu.
- Build verificata con `npm run build` dopo l'applicazione.

### Note tecniche

- `mix-blend-mode: screen` è supportato da tutti i browser moderni (Chrome, Safari, Firefox, Edge).
- Non viene toccato il file `public/logo-header.jpg`: nessuna alterazione binaria, rispettando il vincolo "solo CSS".
- Soluzione coerente con la policy "semantic tokens / no hardcoded color in components" perché non introduce colori, solo un blend mode condizionato dalla classe `dark` di Tailwind.

