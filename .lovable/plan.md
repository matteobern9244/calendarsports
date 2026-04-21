

## Verifica anti-flicker tema all'avvio e al cambio

### Stato attuale (verificato nel codice)

Lo stack anti-FOUC è già completo. Riepilogo dei meccanismi presenti:

**1. `index.html` — script inline blocking, eseguito prima del paint**
- Legge `localStorage.getItem('cse-theme')` (default `'dark'`).
- Aggiunge la classe `light`/`dark` su `<html>` **prima** che React monti.
- Imposta `style.colorScheme` per evitare flash di scrollbar/inputs nativi.
- Aggiorna il `<meta name="theme-color">` neutro (`#0B1A33` dark / `#F5F7FA` light) prima del paint → barra mobile corretta da subito.
- Try/catch con fallback a `dark` se `localStorage` è bloccato.

**2. `src/index.css` — transizioni controllate**
- Transizione globale solo su proprietà di colore (`background-color`, `border-color`, `color`, `fill`, `stroke`, `box-shadow`) con durata 200-280ms ease.
- Classe escape `.theme-no-transition` per disattivare le transizioni in casi mirati.
- Rispetto di `prefers-reduced-motion: reduce` → `transition: none !important`.

**3. `src/hooks/useTheme.ts` — sync runtime**
- Inizializza state da `localStorage` (stesso valore dello script in `index.html`, quindi nessun mismatch React/DOM).
- `useEffect` aggiorna classe, `colorScheme`, `localStorage` e `<meta theme-color>` in modo sincrono al toggle.

### Cosa fare in questa verifica

Test manuale guidato in **6 scenari** sul preview, in entrambi i temi e a due viewport (desktop 1366x768, mobile 390x844). Per ogni scenario verifico:

- nessun flash di colore di sfondo opposto al primo paint;
- nessun flash di testo;
- transizione fluida (no scatto) al toggle;
- `<meta theme-color>` corretto subito dopo l'hard reload (verificato via DOM extract);
- nessun errore in console.

**Scenari**

| # | Viewport | `cse-theme` in storage | Azione |
|---|---|---|---|
| 1 | Desktop 1366x768 | `dark` | Hard reload `/`, osserva primo frame |
| 2 | Desktop 1366x768 | `light` | Hard reload `/`, osserva primo frame |
| 3 | Desktop 1366x768 | `dark` | Reload + click toggle sole, transizione fluida |
| 4 | Desktop 1366x768 | `light` | Reload + click toggle luna, transizione fluida |
| 5 | Mobile 390x844 | `dark` | Hard reload `/streaming`, primo frame + meta theme-color |
| 6 | Mobile 390x844 | `light` | Hard reload `/sinner`, primo frame + meta theme-color |

Per ogni scenario:
1. `navigate_to_sandbox` con viewport richiesto e `path` mirato.
2. `act` per impostare `localStorage.setItem('cse-theme', '<valore>')` se serve cambiare baseline, poi reload.
3. `screenshot` immediatamente dopo il caricamento.
4. `extract` del valore corrente di `<meta name="theme-color">:not([media])` dal DOM.
5. Per gli scenari 3-4: `act` sul toggle e screenshot prima/durante/dopo.
6. `read_console_logs` finale per intercettare warning/errori.

### Cosa NON faccio

- Nessuna modifica al codice (fase di sola verifica). Se emerge un bug verrà segnalato e proposto un fix in un piano separato.
- Non testo le PWA installate (fuori dallo scope del browser headless).
- Non tocco `prefers-color-scheme` di sistema: l'app usa `cse-theme` come fonte di verità, già verificato nel codice.

### Output finale

Tabella riepilogativa con esito per ciascuno dei 6 scenari (PASS / FAIL + dettaglio), screenshot allegati per i casi anomali, e — se tutto pulito — conferma esplicita che non c'è flicker né su avvio né su toggle, su entrambi i viewport e in entrambi i temi.

### Note operative

- Il browser è uno strumento costoso e usato qui solo perché la verifica richiede ispezione visiva del primo paint, non riproducibile via lettura codice.
- L'ordine degli scenari è ottimizzato per minimizzare `navigate_to_sandbox` (riuso sessione con `set_viewport_size` tra desktop e mobile).
- Nessuna scrittura su DB, nessuna azione distruttiva.

