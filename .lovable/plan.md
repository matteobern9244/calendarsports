

## Title accessibile mini-card Slam: italiano completo

### Stato attuale

In `src/components/sinner/PlayerHeader.tsx` (riga ~234) ogni mini-card Slam ha:

```tsx
title={`${full}: ${r.raw}`}
```

dove `r.raw` è il valore grezzo restituito dal backend (es. `V`, `F`, `4T`, `RR`). Quindi il tooltip mostra `Australian Open: V` invece di `Australian Open: Vittoria`. Anche `full` contiene nomi propri ufficiali (`Australian Open`, `Roland Garros`, `Wimbledon`, `US Open`, `ATP Finals`) che restano invariati perché nomi propri di tornei.

### Modifica

**File**: `src/components/sinner/PlayerHeader.tsx` (solo questo).

Sostituire l'attributo `title` per usare l'etichetta italiana già calcolata + anni a 4 cifre, allineandolo a quanto già visibile nella card e all'`aria-label`:

```tsx
title={
  r.years.length > 0
    ? `${full}: ${label} (${r.years.join(", ")})`
    : `${full}: ${label}`
}
```

Risultato tooltip:
- Vittoria con anni: `Australian Open: Vittoria (2024, 2025)`
- Risultato senza anni: `ATP Finals: Round Robin`
- Codice ignoto (fallback): mostra il raw, ma `resultLabel()` già restituisce il raw quando manca il mapping → comportamento conservato senza inglese aggiuntivo (i raw correnti `V/F/SF/QF/4T/3T/2T/1T/RR` sono tutti già mappati).

### Cosa NON cambia

- Layout, colori, gradient oro, icona trofeo, grid responsive → invariati.
- `aria-label` già in italiano → invariato.
- Contenuto visibile della mini-card → invariato.
- `RESULT_LABELS` → invariato.
- Backend, dati, versione `2.1.0` → invariati.
- Nessuna nuova dipendenza.

### Validazione

1. Hover desktop su `AO` (vittoria 2024, 2025): tooltip mostra `Australian Open: Vittoria (2024, 2025)`.
2. Hover su `Finals` (Round Robin): tooltip mostra `ATP Finals: Round Robin`.
3. `npm run check:italian` → exit 0 (nessuna nuova parola inglese; `Round`/`Robin` già in allowlist).
4. `npm run lint` invariato.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/sinner/PlayerHeader.tsx` | EDIT | Sostituito `title={`${full}: ${r.raw}`}` con versione che usa `label` italiano (già calcolato via `resultLabel`) + anni a 4 cifre tra parentesi quando disponibili. |
| `changelog.md` | EDIT | `### Changed`: "Profilo Sinner — tooltip mini-card Grande Slam ora in italiano completo (es. `Australian Open: Vittoria (2024, 2025)`), allineato all'`aria-label` e al testo visibile." |

### Checklist post-edit

1. Hover su tutte le 5 mini-card: nessuna sigla EN nel tooltip.
2. `npm run check:italian` → exit 0.
3. `changelog.md` aggiornato.
4. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

