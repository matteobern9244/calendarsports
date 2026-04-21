

## Estensione guard CI: titoli modali/dialog sempre in italiano

### Stato attuale

Lo script `scripts/check-italian-ui.mjs` già copre:
- `document.title = "..."` (kind `document-title`)
- testo JSX dentro `<DialogTitle>...</DialogTitle>` perché viene catturato dal pattern generico `>([^<>{}]+)<`

Gap rilevati:
1. **Title dinamici via template/concatenazione**: `document.title = \`Preferenze · ${app}\`` non viene catturato (regex accetta solo `"..."`).
2. **Prop `title=` su componenti dialog/modali**: già coperto in attributi generici (`title="..."`), ma nessuna verifica mirata che identifichi *quel* contesto come "titolo modale" → un fail risulta come generico `attr:title`.
3. **`AlertDialogTitle`, `SheetTitle`, `DrawerTitle`**: come `DialogTitle`, il testo figlio è già coperto, ma se passato come stringa via prop (raro) sfuggirebbe.
4. **Nessun pattern per `useEffect(() => { document.title = ... })`** con backtick template literal.

### Modifiche allo script `scripts/check-italian-ui.mjs`

**A. Pattern `document.title` esteso a template literals**

Aggiungere secondo pattern:
```js
const docTitleTemplatePattern = /\bdocument\.title\s*=\s*`([^`${]+)`/g;
```
Cattura solo la parte statica del template (frammenti di testo prima di interpolazioni `${...}`). Le porzioni interpolate vanno comunque controllate sull'interpolato originario altrove. Kind: `document-title`.

**B. Pattern dedicato per titoli di dialog/modali**

Aggiungere estrattore mirato per i tag titolo dei componenti modali (Radix/shadcn):
```js
const dialogTitleTagPattern =
  /<(DialogTitle|AlertDialogTitle|SheetTitle|DrawerTitle|SidebarTitle)\b[^>]*>([^<>{}]+)</g;
```
Estrai gruppo 2 come `value`, kind `dialog-title:<TagName>` (es. `dialog-title:DialogTitle`). Permette messaggi d'errore espliciti: "il titolo del modale contiene parole EN".

**C. Prop `title=` su componenti dialog**

Aggiungere pattern che cattura `title="..."` quando appare su tag che iniziano con maiuscola e contengono "Dialog"/"Modal"/"Sheet"/"Drawer" nel nome:
```js
const dialogTitlePropPattern =
  /<(\w*(?:Dialog|Modal|Sheet|Drawer)\w*)\b[^>]*\btitle\s*=\s*"([^"]+)"/g;
```
Kind: `dialog-title-prop:<TagName>`.

**D. Messaggio d'errore migliorato**

Quando `kind` inizia con `document-title` o `dialog-title`, aggiungere prefisso esplicito nel report:
```
✗ src/pages/Foo.tsx:42 — TITOLO PAGINA contiene parole EN [Settings]: "Settings"
✗ src/components/Bar.tsx:18 — TITOLO MODALE (DialogTitle) contiene parole EN [Close]: "Close window"
```

**E. Allowlist invariata**

Nessuna modifica all'allowlist o al `FORBIDDEN_WORDS`.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `scripts/check-italian-ui.mjs` | EDIT | Aggiunta pattern `document.title` con backtick template, estrattore mirato per `<DialogTitle>`/`<AlertDialogTitle>`/`<SheetTitle>`/`<DrawerTitle>`/`<SidebarTitle>` (kind `dialog-title:<Tag>`), pattern `title=` su tag che matchano `*Dialog*`/`*Modal*`/`*Sheet*`/`*Drawer*` (kind `dialog-title-prop:<Tag>`). Messaggio d'errore con prefisso esplicito "TITOLO PAGINA" / "TITOLO MODALE" per i kind dedicati. |
| `README.md` | EDIT | Sezione "Controllo lingua UI italiana": aggiunto elenco esplicito delle nuove superfici coperte (titoli pagina via template literal, titoli modali Radix/shadcn, prop `title` su componenti modali). |
| `changelog.md` | EDIT | `### Added`: "Estensione guard CI titoli: `check-italian-ui.mjs` ora cattura `document.title` con template literal, contenuto di `DialogTitle`/`AlertDialogTitle`/`SheetTitle`/`DrawerTitle`/`SidebarTitle` e prop `title` su componenti modali. Errori riportati con prefisso esplicito `TITOLO PAGINA` / `TITOLO MODALE`." |

### Validazione (4 test negativi obbligatori)

1. **`document.title` plain string EN** → `document.title = "Settings"` deve fallire con kind `document-title` e prefisso "TITOLO PAGINA".
2. **`document.title` template literal EN** → `document.title = \`Settings · ${app}\`` deve fallire (parte statica "Settings ·").
3. **`<DialogTitle>` con testo EN** → `<DialogTitle>Close window</DialogTitle>` deve fallire con kind `dialog-title:DialogTitle` e prefisso "TITOLO MODALE".
4. **Prop `title="..."` su componente modale** → `<ConfirmDialog title="Delete item">` deve fallire con kind `dialog-title-prop:ConfirmDialog`.

Tutti e 4 i test devono fallire con la versione aggiornata e passare con rollback.

Baseline post-modifica: `npm run check:italian` → exit 0 sul codice attuale (non sono presenti regressioni, l'audit precedente è confermato pulito).

### Cosa NON cambia

- Nessuna modifica al codice UI.
- Nessuna nuova dipendenza.
- Allowlist e `FORBIDDEN_WORDS` invariati.
- Workflow CI invariati: lo step `Italian UI guard` esegue già `npm run check:italian`, le nuove regole entrano automaticamente in vigore.
- Versione applicativa invariata `2.1.0`.

### Checklist post-edit

1. `npm run check:italian` → exit 0 sul codice attuale.
2. Quattro test negativi sopra → tutti falliscono come previsto, poi rollback.
3. `npm run lint` invariato.
4. `changelog.md` e `README.md` aggiornati.
5. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

