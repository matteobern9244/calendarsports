

## Layout a griglia tabellare per "Stasera in TV" (desktop)

### Diagnosi

Lo screenshot mostra che, anche dopo l'ultima modifica, il chip genere e la durata appaiono disallineati riga-su-riga perché:

1. **Chip genere** ha larghezza variabile (`FICTION` ~52px, `TALK SHOW` ~78px, `NEWS` ~44px) → la sua estremità destra balla.
2. **Durata** ha larghezza variabile (`2h` ~22px, `1h 55 min` ~58px) → idem.
3. Con `flex-1` sul titolo + `shrink-0` sui chip, ogni riga calcola lo spazio in autonomia: nessuna colonna verticale stabile.

L'unico modo per avere **due colonne verticali realmente allineate** è passare da flexbox a **CSS Grid** sull'intera lista, condividendo lo stesso `grid-template-columns` su tutte le righe.

### Soluzione: CSS Grid condivisa

Trasformare il `<ul>` (desktop) in un grid container che applica le stesse 6 colonne a ogni riga `<li>`:

```text
[famiglia 8rem] [ora 3.5rem] [canale auto] [titolo 1fr] [genere 6rem] [durata 5rem]
```

Larghezze fisse per famiglia, ora, genere, durata → garantiscono colonne perfette. Chip genere e durata ricevono `text-align: right` e `justify-self: end` per ancorare il contenuto al bordo destro di ciascuna cella.

### Layout responsive (3 breakpoint)

**Mobile (`< sm`, < 640px)**: layout corrente a 2 righe stacked (durata top-right, titolo+genere sotto). Invariato — già leggibile su schermi stretti.

**Tablet (`sm` ≤ width < `lg`, 640-1023px)**: grid a 5 colonne (omette colonna famiglia, mostrata già nel divider sopra):
```text
[ora 3.5rem] [canale 7rem] [titolo 1fr] [genere 5.5rem] [durata 4.5rem]
```

**Desktop (`lg` ≥ 1024px)**: grid a 6 colonne completa con colonna famiglia 8rem.

Tutte le righe condividono `grid-template-columns` definito sull'`<ul>` (oppure su un wrapper `display: grid` con `grid-template-rows: auto` per ogni riga). Le `<li>` diventano `display: contents` per ereditare la griglia del padre, così le 6 celle di ogni riga si allineano verticalmente con le 6 celle delle altre righe. Questo è il pattern standard per "tabelle responsive con grid".

### Modifica precisa

In `src/components/home/TonightTvList.tsx`, sezione desktop:

1. **`<ul>` desktop**: aggiungere classi grid condizionali. Mantengo il `<ul>` corrente per mobile, ma su `sm:` lo trasformo in grid:
   ```tsx
   <ul className="
     divide-y divide-border/40 rounded-md border border-border/40 bg-card/40 overflow-hidden
     sm:grid sm:divide-y-0
     sm:[grid-template-columns:3.5rem_7rem_1fr_5.5rem_4.5rem]
     lg:[grid-template-columns:8rem_3.5rem_7rem_1fr_5.5rem_4.5rem]
   ">
   ```

2. **`<li>` riga programma**: su `sm:` diventa `display: contents` per dissolversi nella griglia padre; il bordo top viene applicato a ogni cella della riga via `[&>*]:border-t [&>*]:border-border/40`. Su mobile mantiene il flex stacked.
   ```tsx
   <li className="
     px-2.5 py-2.5 text-sm
     sm:contents sm:[&>*]:py-2 sm:[&>*]:border-t sm:[&>*]:border-border/40
   ">
   ```

3. **Celle desktop** (6 elementi figli diretti, ognuno con padding orizzontale dedicato):
   - **Famiglia** (solo `lg:`): icona + label, oppure spazio vuoto se `!showFamilyDivider`. Classi: `hidden lg:flex lg:items-center lg:gap-1.5 lg:pl-3 lg:pr-2`.
   - **Ora**: `hidden sm:flex sm:items-center sm:px-2 font-mono font-bold text-primary text-sm`.
   - **Canale**: `hidden sm:flex sm:items-center sm:px-2` con `<Badge>` interno.
   - **Titolo**: `hidden sm:flex sm:items-center sm:px-2 sm:min-w-0` con `<span class="truncate" title={row.title}>`.
   - **Genere**: `hidden sm:flex sm:items-center sm:justify-end sm:px-2`. Chip allineato a destra; se `g` assente, cella vuota (mantiene la colonna).
   - **Durata**: `hidden sm:flex sm:items-center sm:justify-end sm:pr-3 sm:pl-2 font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap`. Aggiungere `tabular-nums` per allineare le cifre. Se vuota, cella vuota.

4. **Riga famiglia (divider + label mobile)**: invariate per mobile. Su `sm:` la label famiglia non serve più separata: la colonna famiglia (su `lg:`) o il divider colorato (su `sm:` < `lg:`) fanno il lavoro. Il divider `<li>` corrente con `h-[3px] bg-primary` resta visibile su tutti i breakpoint sopra il primo programma di una nuova famiglia: lo wrappo con `sm:col-span-full` per attraversare tutte le colonne grid.

5. **Removed**: la colonna famiglia "fantasma" (`text-transparent` per le righe non-prima del gruppo) che oggi finge alignment su `sm:` viene rimossa: su `sm:`-`md:` non c'è colonna famiglia (basta il divider colorato + label mobile riusata anche qui), su `lg:` la colonna esiste solo nelle righe `showFamilyDivider`.

6. **Label famiglia su tablet** (`sm:` < `lg:`): rendere visibile la `<li data-testid="family-label-mobile">` fino a `lg:` (rinominandola eventualmente, ma mantengo il `data-testid` per compatibilità test). Cambio `sm:hidden` → `lg:hidden` e aggiungo `sm:col-span-full` quando dentro la grid.

### Risultato visivo

```text
Desktop (≥1024px):
┌──────────┬───────┬─────────┬──────────────────────────────┬─────────┬─────────┐
│ ◉ RAI    │ 21:30 │ RAI 1   │ Il Commissario Montalbano    │ FICTION │1h 55 min│
│          │ 21:00 │ RAI 2   │ Tg2 Post                     │ NEWS    │   20 min│
├──────────┼───────┼─────────┼──────────────────────────────┼─────────┼─────────┤
│ 📺 MEDIA │ 21:15 │ ITALIA1 │ Le Iene presentano           │TALK SHOW│3h 55 min│
└──────────┴───────┴─────────┴──────────────────────────────┴─────────┴─────────┘

Tablet (640-1023px):
┌───────┬─────────┬──────────────────────────────────────┬─────────┬─────────┐
│ 21:30 │ RAI 1   │ Il Commissario Montalbano            │ FICTION │1h 55 min│
└───────┴─────────┴──────────────────────────────────────┴─────────┴─────────┘
(label famiglia su riga sopra, full-width)

Mobile (<640px): layout 2 righe stacked invariato
```

Tutte le colonne genere e durata cadono sulla stessa X verticale grazie al grid condiviso.

### Cosa NON cambia

- Layout mobile (<640px): identico.
- Logica dati, filtri, paginazione, divider famiglia, header card.
- `inferGenre`, `formatDuration`, `STREAMING_FAMILIES`, hook React Query.
- `data-testid` esistenti (`family-divider`, `family-label-mobile`) preservati.
- Nessun nuovo import.

### Rischi e mitigazioni

- **`display: contents` accessibility**: storicamente alcuni screen reader ignoravano `<li>` con `display: contents`. Oggi (Chromium 105+, Firefox 102+, Safari 16+) il bug è risolto. Verifico mantenendo semantica `<ul><li>` e aggiungendo `role="row"` opzionale se necessario.
- **Titoli lunghi**: la cella titolo è `sm:min-w-0` con `truncate` interno, così la colonna `1fr` non si espande oltre lo spazio disponibile. Tooltip nativo `title` già presente.
- **Larghezza chip genere > 5.5rem**: i chip uppercase con generi più lunghi dell'app (`TALK SHOW`, `DOCUMENTARI`, `INTRATTENIMENTO`?) potrebbero superare 5.5rem. Verifico l'enum reale in `inferGenre`/`genreUtils.ts` prima di fissare il valore; se necessario, alzo a 6.5rem desktop (e 6rem tablet). Da decidere in implementazione leggendo `genreUtils.ts`.
- **`tabular-nums` su durata**: garantisce che `1h 55 min` e `1h 5 min` allineino le cifre (Inter ha tabular-nums).

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/home/TonightTvList.tsx` | EDIT | Trasformare `<ul>` desktop in CSS Grid con `grid-template-columns` definite per `sm:` e `lg:`. `<li>` programma diventa `sm:contents`. 6 celle figlie con padding/allineamento dedicato (genere + durata `justify-end`). Divider famiglia e label famiglia tablet con `sm:col-span-full`. Rimossa colonna famiglia "fantasma" trasparente. Verifica preliminare lunghezza max generi in `genreUtils.ts` per fissare colonna genere. |
| `changelog.md` | EDIT | `### Changed`: "Stasera in TV: layout desktop/tablet ricostruito con CSS Grid condivisa, genere e durata allineati in colonne verticali stabili su tutte le righe; tabular-nums per durate; mobile invariato." |

### Validazione

1. Viewport 1702px (desktop): aprire `/`, verificare che genere e durata di tutte le righe della scheda "Stasera in TV" cadano esattamente su due X verticali. Confronto visivo con screenshot allegato.
2. Viewport 768px (tablet): label famiglia full-width sopra le righe del gruppo, 5 colonne allineate.
3. Viewport 375px (mobile): layout 2 righe stacked invariato.
4. Hover titolo lungo: tooltip nativo mostra titolo completo.
5. Filtri famiglia, paginazione, divider colorato: invariati.
6. `npm run lint`, `npm run build`, `npm run check:italian` invariati.

### Checklist post-edit

1. `<ul>` desktop usa `sm:grid` con `grid-template-columns`.
2. `<li>` programma usa `sm:contents`.
3. Chip genere e durata visibilmente allineati su colonne verticali (verifica con screenshot post-edit).
4. Mobile invariato.
5. `data-testid` preservati.
6. `changelog.md` aggiornato.
7. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

