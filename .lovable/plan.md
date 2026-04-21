

## Guard CI: blocco regressioni lingua UI

### Obiettivo

Workflow CI che **fallisce** se in `src/` (escluso `src/components/ui/`, `*.test.*`, `*.d.ts`) vengono introdotte stringhe utente in inglese oltre alle eccezioni autorizzate (`STREAMING`, `CALENDAR EVENTS`).

### Approccio

Script Node TypeScript-free in `scripts/check-italian-ui.mjs` che fa scansione AST-light (regex mirate su JSX text, attributi `aria-label`, `aria-description`, `placeholder`, `title`, `alt`, e contenuto di `<span className="sr-only">…</span>`). Eseguito da nuovo step `npm run check:italian` nei due workflow CI esistenti.

Niente AST parser pesante (no `@babel/parser` come nuova dep): regex mirate su pattern JSX limitati. Falsi positivi gestiti via:
1. **Allowlist di parole** (nomi propri, sigle, brand): `STREAMING`, `CALENDAR EVENTS`, `ATP`, `WTA`, `GP`, `PL1`, `PL2`, `PL3`, `TMDB`, `RAI`, `Sky`, `Netflix`, `Prime`, `Video`, `Disney`, `HBO`, `Max`, `Mediaset`, `Discovery`, `Juventus`, `Sinner`, `Jannik`, `Formula`, `MotoGP`, `Roland`, `Garros`, `Wimbledon`, `Open`, `Australian`, `US`, `Finals`, `Pos`, `Pts`, `Qual`, `Sprint`, `DR`, `JS`, `Info` (icone).
2. **Allowlist di file** (commento `// @lingua-ignore` su singola riga o `/* @lingua-ignore-file */` in testa).
3. **Dizionario euristico** di parole inglesi comuni che NON devono apparire: `Loading`, `Error`, `Close`, `Open`, `Next`, `Previous`, `Submit`, `Cancel`, `Save`, `Delete`, `Edit`, `Search`, `Home`, `Back`, `More`, `Less`, `Show`, `Hide`, `Toggle`, `Select`, `Choose`, `Page`, `Not`, `Found`, `Return`, `Go`, `to`, `Click`, `here`, `Settings`, `Profile`, `Logout`, `Login`, `Sign`, `Welcome`, `Best`, `ranking` (lower), `Live`, `Upcoming`, `Today`, `Tomorrow`, `Yesterday`, `Week`, `Month`, `Year`, `Date`, `Time`, `Yes`, `No`, `OK`, `Continue`, `Confirm`. Match case-insensitive su parole intere.

Logica: se in una stringa testuale UI compare ≥1 parola del dizionario inglese AND nessuna parola della allowlist copre l'intera stringa AND il file non è in allowlist → errore.

### Cosa NON viene controllato (limiti dichiarati)

- `src/components/ui/*` (shadcn rigenerabile — già tradotto manualmente, ma future rigenerazioni introdurranno EN: lo accettiamo come trade-off, lo annotiamo nel commento dello script).
- File `.test.ts(x)` e `.spec.ts(x)`.
- Commenti `//` e `/* */` (lo script li strippa prima del match).
- Identificatori di codice, query keys, route paths, `value="all"`.
- `supabase/functions/*` (lato server, non UI).

### File creati / modificati

| File | Tipo | Modifica |
|---|---|---|
| `scripts/check-italian-ui.mjs` | NUOVO | Script Node ESM. Glob su `src/**/*.{ts,tsx}` (escluse cartelle UI/test). Strip commenti. Estrae con regex: `>([^<{]+)<` per JSX text, `(?:aria-label\|aria-description\|placeholder\|title\|alt)="([^"]+)"`. Filtra contro allowlist e dizionario EN. Stampa lista violazioni con file:line. Exit 1 se trova match. |
| `package.json` | EDIT | Aggiunge script `"check:italian": "node scripts/check-italian-ui.mjs"`. |
| `.github/workflows/ci-pr-main.yml` | EDIT | Job `quality`: aggiunge step `- name: Italian UI guard` con `run: npm run check:italian` dopo `Lint`, prima di `Unit tests`. |
| `.github/workflows/ci-develop.yml` | EDIT | Stesso step nel job `quality`. |
| `AGENTS.md` | EDIT | Sezione "Regole di modifica" → aggiunto bullet: "Il workflow CI esegue `npm run check:italian`. Se devi introdurre intenzionalmente una stringa non italiana (es. brand non in allowlist), aggiorna l'allowlist in `scripts/check-italian-ui.mjs` nella stessa PR e dichiara il motivo nel changelog." |
| `.github/instructions/frontend.instructions.md` | EDIT | Stessa nota sintetica. |
| `README.md` | EDIT | Sezione "Sviluppo" → comando `npm run check:italian` documentato. |
| `changelog.md` | EDIT | `### Added`: "Guard CI lingua italiana — script `check-italian-ui` blocca PR con nuove stringhe utente in inglese non in allowlist. Eseguito in `ci-pr-main` e `ci-develop`." |

### Comportamento atteso

- **PR pulita**: step verde, niente output rilevante.
- **PR che reintroduce `Best ranking`**: step fallisce con
  ```
  scripts/check-italian-ui.mjs
  ✗ src/components/sinner/PlayerHeader.tsx:42 — testo JSX contiene parole EN: "Best ranking"
  → Traduci in italiano oppure aggiungi alla allowlist con motivo nel changelog.
  Trovate 1 violazioni. Build fallito.
  ```
- **Esecuzione locale**: `npm run check:italian` riproduce stesso output.

### Validazione manuale dello script

Lo script viene eseguito sul codice attuale dopo creazione: deve passare con 0 violazioni (l'app è già 100% italianizzata). Se trova falsi positivi residui, aggiorno allowlist nello stesso commit prima di chiudere.

### Cosa NON cambia

- Stack, dipendenze runtime, TypeScript config.
- Workflow `enable-pr-automerge`, `disable-pr-automerge-on-copilot-review`, `guard-main-source`.
- Branch policy GitHub <-> Lovable.
- Edge functions, hook React Query, UI esistente.
- Versione applicativa.

### Checklist post-edit

1. `npm run check:italian` localmente → exit 0 sul codice attuale.
2. Test negativo: cambio temporaneo `Miglior ranking` → `Best ranking`, lo script fallisce con file e riga corretti, poi rollback.
3. `npm run lint` + `npm run build` invariati.
4. PR su branch `develop`, assegnata `@matteobern9244`, label esistenti più adatte (es. `chore`, `ci`).

