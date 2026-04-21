

## Preferenze: ingresso/uscita user friendly

### Problema

Cliccando l'icona ingranaggio in header si apre la rotta `/preferenze` come pagina piena. Una volta dentro non c'è un modo evidente di "chiudere" e tornare indietro: l'utente deve cliccare di nuovo l'ingranaggio (che sembra solo "vai a preferenze") o usare il back del browser. Non è chiaro che il pulsante in header funzioni anche da toggle, e su mobile l'esperienza è ancora più disorientante.

### Soluzione

Trasformare le Preferenze da **rotta dedicata** a **pannello laterale (Sheet)** che si apre sopra la pagina corrente. Questo risolve tutti i problemi di chiusura in modo nativo:

1. Tasto `X` in alto a destra del pannello.
2. Click fuori dal pannello (sull'overlay scuro).
3. Tasto `Esc` da tastiera.
4. Click di nuovo sull'icona ingranaggio in header → toggle.

L'utente resta visivamente sulla pagina su cui stava lavorando (Home, Sinner, F1...) e vede le preferenze "scivolare" da destra. Nessuna navigazione, nessuno stato perso.

### Layout pannello

Su desktop (≥768px) il pannello entra da destra, larghezza ~480-560px, full height, scroll interno.

Su mobile (<768px) il pannello entra dal basso (`Sheet side="bottom"`), altezza ~85vh, drag handle, scroll interno. Più naturale del laterale stretto su schermo piccolo.

```text
┌──────────────── overlay scuro ────────────────┐
│                                ┌────────────┐ │
│                                │ Preferenze │ │
│                                │         X  │ │
│                                ├────────────┤ │
│                                │ ASPETTO    │ │
│                                │ [☀][🌙]    │ │
│         (pagina sotto          │            │ │
│          ancora visibile,      │ STAGIONI   │ │
│          attenuata)            │ Sinner ▾   │ │
│                                │ Juventus ▾ │ │
│                                │ F1 ▾       │ │
│                                │ MotoGP ▾   │ │
│                                │            │ │
│                                │ [Reset]    │ │
│                                └────────────┘ │
└────────────────────────────────────────────────┘
```

Header del pannello: titolo "Preferenze" + sottotitolo breve + pulsante `X` (Sheet già include il close button nativo in alto a destra).

Footer sticky del pannello: bottone `Ripristina valori predefiniti` + nota "Le preferenze sono salvate sul tuo dispositivo." Sempre visibile durante lo scroll, così l'utente sa anche da lì che può chiudere e che le modifiche sono persistite localmente.

### Contenuto (invariato a livello funzionale)

Stesse 4 sezioni stagioni (Sinner, Juventus, F1, MotoGP) + sezione Aspetto (tema chiaro/scuro). Adatti per il formato pannello:

- **Aspetto**: segmented control `Chiaro` / `Scuro` (uguale ad oggi).
- **Stagioni**: invece di una griglia 2/4 colonne, layout verticale a lista compatta. Ogni sport è una riga: icona + nome + anno corrente grande in oro + selettore stagione inline. Più adatto alla larghezza ridotta del pannello, evita scroll orizzontale.

Esempio riga stagione:

```text
🎾  Jannik Sinner          2026   [ 2024 | 2025 | 2026 ]
🛡️  Juventus               2025   [ 2023 | 2024 | 2025 ]
🏎️  Formula 1              2026   [ 2024 | 2025 | 2026 ]
🏍️  MotoGP                 2026   [ 2024 | 2025 | 2026 ]
```

Toast "Salvato" e badge `Salvato` inline restano come oggi.

### Header: l'ingranaggio diventa toggle

L'icona `Settings` in `Header.tsx` non fa più `Link to="/preferenze"`, ma apre/chiude il pannello via stato globale (vedi sotto). Quando il pannello è aperto:
- icona dorata piena (stessa estetica "active" di prima);
- `aria-expanded="true"`, `aria-controls="preferences-panel"`;
- click la chiude.

### Stato globale del pannello

Per permettere all'header e a chiunque di aprire/chiudere il pannello da qualsiasi pagina, introdurre un piccolo `PreferencesContext` con `{ open, setOpen, toggle }`, montato in `Layout.tsx` insieme al `Sheet` che renderizza `<PreferencesPanel />`. L'header consuma il context per il pulsante toggle.

### Rotta `/preferenze`: cosa succede

Per non rompere link esistenti / bookmark, mantenere il path `/preferenze` ma trasformarlo in un piccolo redirect "smart": al mount apre il pannello e fa `navigate("/", { replace: true })` (o l'ultima rotta valida se disponibile via `location.state.from`). Così:

- chi arriva da link diretto `/preferenze` vede comunque il pannello aperto sopra la home;
- la URL non resta "incollata" su `/preferenze`, evitando ambiguità "sono in una pagina ma non posso uscire".

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/contexts/PreferencesPanelContext.tsx` | NEW | Context + provider con `open`, `setOpen(boolean)`, `toggle()`. Esporta hook `usePreferencesPanel()`. |
| `src/components/preferences/PreferencesPanel.tsx` | NEW | Componente pannello: usa `Sheet` (`@/components/ui/sheet`) con `side="right"` su desktop e `side="bottom"` su mobile (via `useIsMobile`). Contiene header (titolo + sottotitolo), sezione Aspetto (tema), sezione Stagioni (lista verticale con `SeasonSelector`), footer sticky con `Ripristina`. Riusa `useTheme`, `useSeasonPreferences`, toast, `BrandIcons`. Gestisce chiusura via `onOpenChange`. |
| `src/components/layout/Layout.tsx` | EDIT | Wrappare l'app con `PreferencesPanelProvider`. Montare `<PreferencesPanel />` una sola volta accanto a `<Outlet />` così è disponibile su ogni pagina. |
| `src/components/layout/Header.tsx` | EDIT | Sostituire `Button asChild` `Link to="/preferenze"` con `Button onClick={toggle}` che usa `usePreferencesPanel()`. Stato attivo (oro pieno) quando `open === true`. Aggiungere `aria-expanded`, `aria-controls`, `aria-label="Preferenze"`. |
| `src/pages/PreferencesPage.tsx` | EDIT | Sostituire il contenuto con un piccolo componente che, al mount, chiama `setOpen(true)` dal context e poi `navigate("/", { replace: true })`. Mantiene la compatibilità del path senza renderizzare UI duplicata. |
| `src/App.tsx` | unchanged | La rotta `/preferenze` resta mappata a `PreferencesPage` (ora redirect). Nessun cambio router necessario. |
| `changelog.md` | EDIT | `### Changed`: "Preferenze ora si aprono come pannello laterale (destra su desktop, in basso su mobile) sopra la pagina corrente. Chiusura via `X`, click fuori, tasto `Esc` o nuovo click sull'ingranaggio. Il path `/preferenze` resta valido e apre automaticamente il pannello sopra la home." |

### Cosa NON cambia

- Funzionalità preferenze: tema chiaro/scuro, stagioni per sport, ripristino default, persistenza locale, toast.
- Hook `useTheme`, `useSeasonPreferences`, `useIsMobile` invariati.
- Le 6 voci sportive nella nav-pill principale invariate.
- Posizione e stile dell'icona ingranaggio in header (cambia solo il comportamento click).
- Backend, dati, edge functions, versione `2.1.0`, lingua italiana.
- Nessuna nuova dipendenza (`Sheet` di shadcn già presente).

### Validazione

1. Click su ingranaggio in header da Home: pannello entra da destra, nav resta dietro attenuata.
2. Click su `X` / overlay / `Esc`: pannello si chiude, l'utente resta sulla home senza navigazione.
3. Click di nuovo su ingranaggio mentre pannello aperto: si chiude (toggle).
4. Cambio tema dentro il pannello: applicato istantaneamente alla pagina sotto, toast confermato, persistito.
5. Cambio stagione Sinner: badge `Salvato`, toast, persistito; navigando a `/sinner` la nuova stagione è già attiva.
6. Mobile 375px: pannello entra dal basso, altezza ~85vh, scroll interno OK, drag/close OK.
7. Apertura diretta `https://.../preferenze`: redirect a `/` con pannello aperto.
8. `npm run check:italian` exit 0; `npm run lint` + `npm run build` invariati.

### Checklist post-edit

1. `grep -rn "to=\"/preferenze\"" src/` → 0 occorrenze.
2. `grep -rn "PreferencesPanel" src/` → render in `Layout.tsx`, definizione + context.
3. Pannello accessibile da Home, Streaming, Sinner, Juventus, F1, MotoGP.
4. `changelog.md` aggiornato.
5. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

