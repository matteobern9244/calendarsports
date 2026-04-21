

## Pagina "Preferenze" — gestione stagioni salvate

### Obiettivo

Nuova pagina `/preferenze` dove l'utente vede in un colpo d'occhio le stagioni attualmente selezionate per Sinner, Juventus, Formula 1 e MotoGP, può modificarle e ricevere conferma visiva immediata. Le preferenze sono già persistite in `localStorage` (chiave `cse-seasons`) tramite `useSeasonPreferences`, quindi il lavoro è solo di UI + integrazione.

### Stato attuale (verificato)

- `src/hooks/useSeasonPreferences.ts` espone `{ seasons, setSeason }` con persistenza locale per `sinner | juventus | f1 | motogp`. Default: max(currentYear, 2026).
- `src/components/common/SeasonSelector.tsx` è un selettore a chip riutilizzabile.
- Le pagine sportive usano già l'hook ⇒ ogni cambio in `/preferenze` si riflette istantaneamente sulle pagine, perché entrambe leggono lo stesso `localStorage` (anche se l'hook non broadcast cross-tab, all'interno della stessa sessione lo state viene rilettuto al successivo mount; per garantire sync immediato anche tra componenti già montati si aggiunge un piccolo evento custom — vedi nota tecnica).
- `src/App.tsx`, `src/components/layout/Header.tsx`: route + nav esistenti.

### UX della pagina

Header con `SectionHeader title="Preferenze"` + sottotitolo "Gestisci le stagioni predefinite per le tue sezioni preferite. Le scelte vengono salvate sul tuo dispositivo."

4 card identiche, una per sport, in griglia responsive (1 col mobile, 2 col tablet, 4 col desktop):

```text
┌─────────────────────────────┐
│  [icona sport]  Sinner      │
│  Stagione attuale           │
│       2026                  │  ← grande, gold gradient
│  ─────────────────          │
│  [2026] [2025] [2024] ...   │  ← SeasonSelector
│                             │
│  ✓ Salvato (chip verde)     │  ← appare 2s dopo il cambio
└─────────────────────────────┘
```

Sotto le 4 card, una riga con due azioni secondarie:

- `Ripristina ai valori predefiniti` (resetta tutte le stagioni a `max(currentYear, 2026)`).
- Toast di conferma all'azione.

### Conferma visiva immediata

Per ogni card, quando l'utente clicca un anno diverso da quello salvato:

1. Lo stato si aggiorna istantaneamente (`setSeason(...)`).
2. Compare un chip verde "✓ Salvato" sotto il selettore con un'animazione fade-in (Framer Motion già usato altrove).
3. Il chip si dissolve dopo 1.8s.
4. In parallelo, un toast Sonner discreto: "Stagione Formula 1 aggiornata a 2025".

Implementazione: `useState<Set<keyof SeasonPreferences>>` per tenere traccia delle card "appena salvate", con `setTimeout` di 1800ms per rimuoverle. Niente librerie nuove.

### Sync cross-componente

`useSeasonPreferences` oggi tiene state locale per istanza dell'hook → due componenti montati che usano lo stesso hook hanno state separati, e il cambio in `/preferenze` non si propaga finché l'altra pagina non viene rimontata.

Soluzione minima e sicura: aggiungere un piccolo bus basato su `window.dispatchEvent(new CustomEvent("cse-seasons-changed", { detail: next }))` nello `setSeason`, e un `useEffect` nell'hook che ascolta l'evento e fa `setSeasons(detail)`. Niente Zustand, niente Context, niente refactor. Compatibile con tutto il codice esistente perché l'API dell'hook resta identica.

### Navigazione

- Aggiungere voce **Preferenze** nell'`Header.tsx` come ultimo link, con icona `Settings` di lucide-react. Stile coerente con gli altri `NavLink`.
- Aggiungere `Route` in `src/App.tsx`: `<Route path="/preferenze" element={<PreferencesPage />} />`. Lazy import non necessario (pagina leggera).

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `src/pages/PreferencesPage.tsx` | NUOVO | Pagina con 4 card + reset + chip "Salvato". |
| `src/hooks/useSeasonPreferences.ts` | EDIT | Aggiunge dispatch `CustomEvent` in `setSeason` + listener in `useEffect` per sync cross-componente. Aggiunge `resetSeasons()` ai valori di default. API esistente invariata. |
| `src/components/layout/Header.tsx` | EDIT | Aggiunge link `/preferenze` con icona `Settings`. |
| `src/App.tsx` | EDIT | Aggiunge `<Route path="/preferenze" .../>`. |
| `changelog.md` | EDIT | Voce sotto `### Added`: "Pagina Preferenze (`/preferenze`) per visualizzare e modificare le stagioni salvate di Sinner, Juventus, F1 e MotoGP, con conferma visiva immediata e reset ai valori predefiniti." |

### Cosa NON cambia

- Comportamento delle pagine sportive.
- Chiave `localStorage` (`cse-seasons`) e shape della struttura.
- Tema, palette, tipografia.
- Stack, routing, hook React Query.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/preferenze` mostra le 4 card con la stagione corrente in grande.
2. Click su un anno → chip verde "Salvato" + toast + `localStorage` aggiornato.
3. Aprire `/formula1` in un altro tab dopo aver cambiato in `/preferenze`: la stagione corretta viene letta al mount.
4. Navigare da `/preferenze` direttamente a `/formula1` (stessa sessione, senza reload): la stagione riflette la scelta appena fatta.
5. Pulsante "Ripristina" riporta tutte e 4 le stagioni al default e mostra toast.
6. Link "Preferenze" visibile e attivo nell'Header.
7. Light + dark: card leggibili, chip verde leggibile in entrambi.
8. `npm run lint` + `npm run build`.
9. Aggiornare `changelog.md`.
10. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

