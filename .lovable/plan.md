

## Sezione "Grande Slam" del profilo Sinner: leggibilità

### Problema

Nei chip Slam attuali (`AO V ·24·25`, `RG F ·25`, …) il significato delle sigle non è esplicito e gli anni in formato a 2 cifre attaccati con `·` sono difficili da decifrare. Solo l'attributo `title` (tooltip al hover) contiene il dato grezzo, invisibile su mobile.

### Obiettivo

Rendere ogni chip auto-esplicativo a colpo d'occhio in italiano, senza perdere compattezza, senza regressioni desktop/mobile e mantenendo il trattamento "oro" sulle vittorie.

### Modifiche

**File**: `src/components/sinner/PlayerHeader.tsx` (solo questo).

1. **Header sezione**: cambia `Grande Slam` → `Grande Slam · Miglior risultato` (sottotitolo implicito che chiarisce cosa rappresentano i chip). Mantenuto come singolo `<p>` con stesso stile, parola "Grande Slam" in evidenza e " · Miglior risultato" in `text-muted-foreground/70` più piccolo.

2. **Mappatura sigle → etichette italiane** (nuova costante `RESULT_LABELS`):
   - `V` → `Vittoria`
   - `F` → `Finale`
   - `SF` → `Semifinale`
   - `QF` → `Quarti`
   - `4T` → `Ottavi` (4° turno = ottavi nei Slam)
   - `3T` → `3° turno`
   - `2T` → `2° turno`
   - `1T` → `1° turno`
   - `RR` → `Round Robin` (solo Finals)
   - fallback: mostra il valore raw

3. **Layout chip ridisegnato** (da inline pill compatta a "mini-card"):
   ```
   ┌──────────────────┐
   │ 🏆 AO            │   ← short tag in alto (font-heading bold)
   │ Vittoria         │   ← etichetta estesa (font-heading semibold)
   │ Australian Open  │   ← nome torneo full (text-xs muted)
   │ 2024 · 2025      │   ← anni full a 4 cifre, separati da " · "
   └──────────────────┘
   ```
   - Vittoria: `gold-gradient` con `text-primary-foreground`, icona `Trophy` da `lucide-react` accanto al short.
   - Non vittoria: `border border-border bg-secondary/30 text-foreground`, nessuna icona.
   - Card width minimo `min-w-[7.5rem]`, padding `px-3 py-2.5`, `rounded-lg`.
   - Container: passa da `flex flex-wrap gap-2` a `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5` per layout sempre allineato e leggibile su tutti i breakpoint (5 chip Slam → 5 colonne su desktop largo, 3 su sm, 2 su mobile).

4. **Anni a 4 cifre**: rimuovi `shortYears` per i chip; mostra `years.join(" · ")` (es. `2024 · 2025`). Rimuovi la funzione `shortYears` se non più referenziata altrove (verificato: usata solo qui).

5. **Tooltip `title` mantenuto**: `${full}: ${r.raw}` resta come fallback informativo desktop.

6. **`aria-label` esteso per accessibilità**: ogni `<li>` riceve `aria-label={`${full}: ${resultLabel}${years.length ? `, anni ${years.join(", ")}` : ""}`}`.

7. **Tema chiaro/scuro**: tutti i colori sono già token semantici (`primary`, `primary-foreground`, `border`, `secondary`, `muted-foreground`, `foreground`) → nessuna regressione attesa, contrasto preservato.

### Verifica regressioni

- **Desktop ≥ lg**: 5 colonne, 1 riga, allineamento perfetto.
- **sm-md**: 3 colonne, 2 righe (3+2), nessun overflow.
- **Mobile (375px)**: 2 colonne, 3 righe (2+2+1), card auto-fit con testo wrappato.
- **Vittorie**: gold gradient invariato + icona trofeo per enfasi.
- **Tema chiaro**: contrasto verificato via token (gold-gradient già in uso nello stesso componente per la KPI ranking).
- **Guard CI italiana**: tutte le nuove stringhe sono italiane (`Vittoria`, `Finale`, `Semifinale`, `Quarti`, `Ottavi`, `1° turno`, ecc.). `Round Robin` è terminologia ufficiale ATP Finals usata correntemente in italiano (analogo a `Sprint`, `Pole`); va aggiunta a `ALLOWLIST_WORDS` in `scripts/check-italian-ui.mjs` con commento esplicativo. `Grande Slam · Miglior risultato` interamente italiano.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/sinner/PlayerHeader.tsx` | EDIT | Nuova costante `RESULT_LABELS`, nuovo layout mini-card per chip Slam (short + etichetta italiana + nome torneo + anni 4 cifre), icona `Trophy` per vittorie, container `grid` responsive 2/3/5 colonne, `aria-label` esteso, header con sottotitolo "Miglior risultato". Rimossa `shortYears`. |
| `scripts/check-italian-ui.mjs` | EDIT | Aggiunta `Round` e `Robin` a `ALLOWLIST_WORDS` con commento (`// Round Robin: terminologia ufficiale ATP Finals usata in italiano`). |
| `changelog.md` | EDIT | `### Changed`: "Profilo Sinner — sezione Grande Slam ridisegnata con chip auto-esplicativi (sigla + etichetta italiana del risultato + nome torneo + anni a 4 cifre), grid responsive 2/3/5 colonne, icona trofeo per le vittorie. Vocabolario: Vittoria, Finale, Semifinale, Quarti, Ottavi, 3°/2°/1° turno, Round Robin. Nessuna regressione UI attesa, tema chiaro/scuro preservato. Allowlist guard italiano estesa con `Round`/`Robin`." |

### Cosa NON cambia

- Layout della foto, KPI ranking/stagione/miglior ranking, chip bio (Altezza/Peso/Nato a) → invariati.
- Dati dal backend (`sports-tennis/index.ts`) → invariati.
- Versione applicativa `2.1.0`.
- Nessuna nuova dipendenza (`Trophy` già disponibile in `lucide-react`).

### Checklist post-edit

1. `/sinner` desktop scuro: chip Slam in 1 riga, vittorie con trofeo dorato, etichette italiane leggibili.
2. `/sinner` desktop chiaro: stesso, contrasto OK.
3. `/sinner` mobile 375px: 2 colonne, nessun testo troncato.
4. `npm run check:italian` → exit 0.
5. `npm run lint` + `npm run build` invariati.
6. `changelog.md` aggiornato.
7. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

