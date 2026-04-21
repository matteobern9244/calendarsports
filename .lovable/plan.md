

## Audit lingua UI: stato attuale e rafforzamento del guard

### Risultato dell'audit

**0 stringhe inglesi residue da tradurre.** Eseguito sweep completo su:

- `npm run check:italian` (script CI già attivo) → 0 violazioni
- `index.html` → italiano (solo nomi propri + `STREAMING` nel title)
- `public/manifest.webmanifest` → italiano (`lang: "it"`)
- Tutti i `toast.success/error` (Layout, useSyncAll, PreferencesPage) → italiano
- Tutti gli `aria-label` (18 occorrenze in 12 file) → italiano
- Tutti i `placeholder`/`title`/`alt` statici (12 occorrenze) → italiano
- Tutti i `sr-only` fuori da `src/components/ui/*` → italiano (1 occorrenza in `ReleaseDetailDialog`)
- Titoli pagina dinamici (`document.title` in `PreferencesPage`) → italiano
- Multi-line JSX text con frasi inglesi tipiche → 0 risultati

Le uniche occorrenze "inglesi" trovate sono **falsi positivi attesi**: identificatori TypeScript (`Error`, `Update`), nomi di componenti importati (`Settings` come icona Lucide), commenti `//`, label nav `HOME` (allowlistata), brand `STREAMING` (eccezione autorizzata), `Calendar Events` (nome app).

### Rafforzamento del guard CI esistente

Lo script `scripts/check-italian-ui.mjs` ha alcuni gap noti che voglio chiudere ora che siamo a baseline pulita, per evitare regressioni future:

1. **Attributi mancanti**: aggiungere `aria-roledescription`, `aria-valuetext`, `aria-description` (già presente ma non `aria-describedby` con string literal), `name` quando string literal su input.
2. **Toast/sonner**: aggiungere pattern dedicato `toast(.success|.error|.info|.warning)?\(\s*"([^"]+)"` per analizzare anche il primo argomento dei toast.
3. **`document.title = "..."`**: aggiungere pattern per controllare i titoli pagina assegnati programmaticamente.
4. **`description` come prop di componenti** (es. `<SectionHeader subtitle="...">`, `description="..."`): già coperto come JSX text figlio, ma non come stringa attributo. Aggiungere `subtitle` e `description` alla regex degli attributi.
5. **Allowlist chiarita**: aggiungere commento esplicito sul perché `Home`, `Open` (Australian Open / US Open), `Sport` sono allowlistati nonostante siano parole inglesi (uso accettato in italiano corrente o parte di nomi propri).
6. **Falsi positivi residui**: la regex JSX text scarta già identificatori; aggiungere scarto esplicito per stringhe contenenti solo `:` (es. `value="all"`, range labels) → già coperto da filtro `[;=()...]`.
7. **Documentazione del comando**: aggiungere a `README.md` una nota su come usare i marker `// @lingua-ignore` e `@lingua-ignore-file` quando un'eccezione è legittima ma non vuoi gonfiare la allowlist globale.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `scripts/check-italian-ui.mjs` | EDIT | Aggiungo pattern toast/sonner, `document.title`, attributi `subtitle`/`description`/`aria-roledescription`/`aria-valuetext`. Commento esplicativo sulle voci ambigue dell'allowlist (`Home`, `Sport`, `Open`). |
| `README.md` | EDIT | Sezione "Controllo lingua UI italiana": documento i marker `// @lingua-ignore` e `// @lingua-ignore-file` con esempio. |
| `changelog.md` | EDIT | `### Changed`: "Audit lingua UI completo: 0 stringhe inglesi residue. Rafforzato `check-italian-ui.mjs` con copertura toast/sonner, `document.title`, attributi `subtitle`/`description`/`aria-roledescription`/`aria-valuetext`. Nessuna regressione UI." |

### Comportamento atteso post-modifica

- `npm run check:italian` continua a passare con exit 0 sul codice attuale.
- Test negativo: introdurre `toast.success("Saved!")` → lo script fallisce con riga e file corretti.
- Test negativo 2: introdurre `document.title = "Preferences"` → lo script fallisce.
- Test negativo 3: introdurre `<SectionHeader subtitle="Loading..." />` → lo script fallisce.

### Cosa NON cambia

- Nessuna modifica al codice UI (l'audit conferma che è già 100% italiano).
- Nessuna nuova dipendenza.
- Allowlist parole rimane invariata (solo commenti esplicativi).
- Workflow CI invariati (lo step `Italian UI guard` esiste già in entrambi).
- Versione applicativa invariata `2.1.0`.

### Checklist post-edit

1. `npm run check:italian` → exit 0.
2. Test negativo toast: `toast.success("Saved!")` temporaneo → script fallisce con kind `toast-message` e riga corretta, poi rollback.
3. Test negativo title: `document.title = "Preferences"` temporaneo → script fallisce, poi rollback.
4. `npm run lint` invariato.
5. `changelog.md` aggiornato.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

