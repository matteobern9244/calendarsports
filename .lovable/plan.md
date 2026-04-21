

## Spostare tema e preferenze fuori dal menu principale

### Obiettivo

1. Rimuovere la voce `PREF` dalla barra di navigazione principale (desktop e mobile).
2. Spostare il toggle tema chiaro/scuro dentro la pagina `/preferenze` (rimuoverlo dall'header).
3. Aggiungere un punto d'ingresso discreto a `/preferenze` accessibile ma non invadente.

### Nuovo layout header

Header desktop dopo la modifica:

```text
[LOGO] [HOME · STREAMING · SINNER · JUVE · F1 · MOTOGP]      [⚙ icona-preferenze] [☰ mobile]
```

- La nav-pill principale torna a 6 voci sportive (più pulita, simmetrica).
- A destra, **un solo pulsante icona** (ingranaggio `Settings`) che porta a `/preferenze`. Stile coerente con gli altri bottoni circolari attuali (border + hover oro).
- Tooltip / `aria-label`: "Preferenze".
- Stato attivo: quando si è su `/preferenze`, l'icona ingranaggio si illumina in oro (border oro pieno + bg oro/10) per dare feedback di "sei qui", senza occupare spazio nella nav-pill.
- Il toggle tema **viene rimosso dall'header** (sia desktop che mobile).

Header mobile:
- Menu hamburger mostra solo le 6 voci sportive.
- L'icona ingranaggio Preferenze resta visibile fuori dall'hamburger (accanto al burger), così è raggiungibile in 1 tap senza aprire il menu.

### Pagina Preferenze: nuova sezione "Aspetto"

Aggiungere in cima a `PreferencesPage.tsx`, **prima della griglia stagioni**, una nuova card "Aspetto" con il toggle tema:

```text
┌─────────────────────────────────────────────┐
│ 🎨  ASPETTO                                  │
├─────────────────────────────────────────────┤
│ Tema dell'interfaccia                        │
│ Scegli tra modalità chiara e scura.          │
│                                              │
│   [ ☀ Chiaro ]  [ 🌙 Scuro ]   ← segmented  │
└─────────────────────────────────────────────┘
```

- Componente: due pulsanti segmentati (stile gold quando attivo, outline quando non attivo), coerenti con il resto della pagina.
- Usa lo stesso hook `useTheme` già consumato dall'header (passato via prop da `Layout` → `PreferencesPage`, oppure consumato direttamente se l'hook è autonomo).
- Toast di conferma: "Tema aggiornato" + descrizione (es. "Ora stai usando il tema scuro.").

### Struttura visiva pagina Preferenze (dopo)

```text
SectionHeader: "Preferenze"
   subtitle: "Personalizza tema e stagioni predefinite delle tue sezioni preferite."

[Card Aspetto — tema chiaro/scuro]                     ← NUOVA, full-width

SectionHeader secondario inline: "Stagioni predefinite"
[Card Sinner] [Card Juventus] [Card F1] [Card MotoGP]   ← griglia esistente, invariata

[Footer info + bottone Ripristina]                      ← invariato
```

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/layout/Header.tsx` | EDIT | Rimuovere voce `PREFERENZE` da `navItems`. Rimuovere il bottone toggle tema (`Sun`/`Moon`). Aggiungere bottone icona `Settings` (rotondo, stesso stile attuale) come `Link` a `/preferenze` con stato attivo evidenziato in oro quando `location.pathname === "/preferenze"`. Aggiornare `aria-label` "Preferenze". Rimuovere props `theme`/`toggleTheme` se non più usate (o lasciarle inutilizzate solo se Layout le passa ancora — vedi sotto). |
| `src/components/layout/Layout.tsx` | EDIT (se necessario) | Smettere di passare `theme`/`toggleTheme` all'`Header` se non più richiesti. Continuare a fornire `useTheme` al contesto della pagina Preferenze. La modalità più semplice: lasciare che `PreferencesPage` consumi direttamente `useTheme` (l'hook esiste già e gestisce localStorage/classe `dark` sul `<html>`), senza prop drilling. |
| `src/pages/PreferencesPage.tsx` | EDIT | Importare `useTheme`. Aggiungere card "Aspetto" sopra la griglia stagioni con due pulsanti segmentati `Chiaro` / `Scuro` (icone `Sun` / `Moon` da `lucide-react`). Sotto la griglia stagioni mantenere tutto invariato. Aggiornare il subtitle del `SectionHeader` per riflettere che ora si gestisce anche il tema. |
| `changelog.md` | EDIT | `### Changed`: "Header — voce `PREFERENZE` rimossa dalla nav-pill principale, sostituita da icona ingranaggio (`Settings`) a destra. Toggle tema chiaro/scuro spostato dall'header alla pagina `/preferenze` (nuova sezione `Aspetto` con segmented control `Chiaro`/`Scuro`)." |

### Cosa NON cambia

- Route `/preferenze` invariata (path, componente, hook `useSeasonPreferences`).
- Hook `useTheme` invariato nel comportamento (continua a scrivere su `localStorage` e classe `dark` su `<html>`).
- Le 4 card stagioni sportive in `PreferencesPage` (Sinner, Juventus, F1, MotoGP) restano identiche.
- Footer "Ripristina valori predefiniti" invariato.
- Backend, dati, edge functions, versione `2.1.0` invariati.
- Nessuna nuova dipendenza (`Settings` già usato, `Sun`/`Moon` già in `lucide-react`).
- Lingua UI italiana mantenuta.
- Animazioni nav-pill (LayoutGroup, sparkle loop, burst su click) invariate per le 6 voci sportive rimanenti.

### Validazione

1. Desktop `/`: nav-pill mostra 6 voci sportive, a destra solo icona ingranaggio + (su mobile) hamburger. Nessun toggle tema visibile.
2. Click su icona ingranaggio → naviga a `/preferenze`. L'icona diventa dorata.
3. `/preferenze`: in cima nuova card "Aspetto" con due pulsanti `Chiaro` / `Scuro`. Il pulsante attivo riflette il tema corrente.
4. Click su `Chiaro`: tema cambia istantaneamente, toast "Tema aggiornato", classe `dark` rimossa da `<html>`. Refresh: tema persistito.
5. Mobile 375px: hamburger contiene solo le 6 voci sportive, icona ingranaggio resta visibile fuori dall'hamburger.
6. `npm run check:italian` → exit 0.
7. `npm run lint` + `npm run build` invariati.

### Checklist post-edit

1. `grep -rn "PREFERENZE\|Settings.*navItems" src/components/layout/Header.tsx` → solo riferimenti previsti (icona ingranaggio link).
2. `grep -rn "toggleTheme\|Sun\|Moon" src/components/layout/Header.tsx` → 0 occorrenze.
3. `useTheme` consumato in `PreferencesPage.tsx`.
4. `changelog.md` aggiornato.
5. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

