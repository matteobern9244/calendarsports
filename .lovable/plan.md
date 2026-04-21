

## Theme-color PWA dinamico per tema light/dark

### Stato attuale

- `index.html` ha **due** `<meta name="theme-color">` con `media="(prefers-color-scheme: light|dark)"`. Questi seguono la **preferenza di sistema**, non il tema scelto dall'utente nell'app via toggle.
- `public/manifest.webmanifest` ha un singolo `theme_color: "#0B1A33"` (navy scuro): la chrome del browser/PWA usa sempre questo, anche in light mode.
- `useTheme.ts` aggiorna `class` e `colorScheme` su `<html>`, ma **non** aggiorna i `<meta theme-color>`, quindi se l'utente forza light mode mentre il sistema è dark (o viceversa), la barra di stato resta sbagliata.

### Obiettivo

La barra di stato del browser e la chrome PWA devono riflettere **il tema scelto dall'utente** (storage `cse-theme`), non solo la preferenza di sistema.

### Modifiche

**1. `index.html` — script anti-FOUC esteso**

Aggiungere al blocco inline esistente la sincronizzazione del `<meta theme-color>` attivo, in modo che al primo paint la barra mobile sia già del colore giusto:

```html
<script>
  (function() {
    try {
      var t = localStorage.getItem('cse-theme') || 'dark';
      document.documentElement.classList.add(t);
      document.documentElement.style.colorScheme = t;
      // Forza il theme-color corretto, indipendentemente da prefers-color-scheme
      var color = t === 'dark' ? '#0B1A33' : '#F5F7FA';
      var meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', color);
    } catch (e) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
</script>
```

I due `<meta theme-color>` con `media` restano come fallback per browser che ignorano il meta senza media query, ma il meta "neutro" senza `media` ha **priorità** e viene controllato dall'utente.

**2. `src/hooks/useTheme.ts` — sync runtime del meta**

Estendere l'`useEffect` per aggiornare il `<meta theme-color>` neutro ogni volta che il tema cambia, così il toggle sole/luna aggiorna anche la barra di stato senza reload:

```ts
useEffect(() => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  localStorage.setItem("cse-theme", theme);

  // Aggiorna theme-color dinamico per browser chrome / PWA
  const color = theme === "dark" ? "#0B1A33" : "#F5F7FA";
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])'
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}, [theme]);
```

**3. `public/manifest.webmanifest` — coerenza PWA installata**

Nessuna modifica al `theme_color` di base (`#0B1A33`): è il colore usato dalla splash screen all'avvio dell'app installata, ed è coerente con il tema dark di default. Il manifest non supporta nativamente theme-color dinamico per OS — la dinamicità avviene a runtime via meta tag (modifiche 1 e 2).

`background_color` resta `#0B1A33` per la splash screen, che è sempre dark per coerenza con il default.

### File modificati

| File | Modifica |
|---|---|
| `index.html` | Script inline aggiornato: scrive il `<meta theme-color>` neutro in base al tema salvato in `localStorage` prima del paint. |
| `src/hooks/useTheme.ts` | `useEffect` aggiorna anche il `<meta theme-color>` neutro al cambio tema runtime. |

### Cosa NON cambia

- `manifest.webmanifest`: invariato (splash PWA resta dark, scelta deliberata).
- I due `<meta theme-color media="...">` esistenti: restano come fallback per browser legacy.
- Palette oro/blu, toggle, storage key `cse-theme`, anti-FOUC: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Hard reload con `cse-theme=dark` → barra mobile navy `#0B1A33` immediatamente.
2. Hard reload con `cse-theme=light` → barra mobile chiara `#F5F7FA` immediatamente, anche se il sistema è in dark mode.
3. Toggle sole/luna in-app → la barra di stato cambia colore senza reload.
4. PWA installata: splash invariata (navy), una volta dentro l'app la chrome segue il tema utente.
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md` con voce: "Theme-color dinamico: meta tag aggiornato runtime in base al tema utente, indipendente da `prefers-color-scheme`."
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

