

## Accessibilità griglia "Stasera in TV" con `display: contents`

### Contesto

Il layout desktop/tablet di `src/components/home/TonightTvList.tsx` usa CSS Grid sul `<ul>` con `<li sm:contents>`. Su browser moderni `display: contents` è gestito correttamente per la semantica `<ul>/<li>`, ma per garantire una lettura affidabile da screen reader (NVDA, JAWS, VoiceOver) su una struttura che visivamente è una **tabella di palinsesto**, la soluzione robusta è esporre esplicitamente i ruoli ARIA da grid pattern (`role="table"` / `role="row"` / `role="cell"`) con header associati.

Il pattern scelto è **ARIA Grid/Table** (W3C ARIA APG "Table" pattern), non "treegrid" né "listbox": è la rappresentazione corretta di un palinsesto tabellare bidimensionale.

### Obiettivo

Rendere la lista programmi pienamente accessibile:

1. Annunciare la struttura come tabella semantica con intestazioni di colonna.
2. Annunciare il **gruppo famiglia** (RAI, Mediaset, ecc.) come `rowgroup` con etichetta accessibile, anche dove visivamente è solo un divider colorato.
3. Garantire che ogni cella sia leggibile in ordine: Famiglia → Ora → Canale → Titolo → Genere → Durata, su qualsiasi viewport.
4. Mantenere il layout visivo invariato (zero regressioni visive).

### Strategia tecnica

#### A. Ruoli ARIA espliciti

Override dei ruoli impliciti `<ul>/<li>` (che con `display: contents` su alcuni screen reader storici venivano persi) tramite attributi `role`:

- `<ul role="table" aria-label="Programmi in prima serata stasera">`
- Riga divider famiglia → wrapper invisibile `role="rowgroup" aria-label="RAI"` non funziona inline; uso pattern alternativo: la riga divider diventa `role="rowheader"` invisibile contenente etichetta famiglia per screen reader (sr-only) oltre alla barra colorata visiva.
- Riga programma `<li role="row">` (sostituisce semantica lista).
- Ogni cella `<div role="cell">` (o `role="rowheader"` per la cella famiglia che apre il gruppo).

Decisione: NON usare `role="rowgroup"` perché richiederebbe wrappare gruppi di righe in un ulteriore container, rompendo la grid CSS condivisa. Uso invece il pattern "header row per gruppo": una riga dedicata con `role="row"` contenente una sola cella `role="rowheader"` con `colspan` logico (`aria-colspan` o semplicemente cella full-width che annuncia "Famiglia: RAI"). Lo screen reader leggerà "RAI" prima delle righe del gruppo.

#### B. Riga di intestazione visivamente nascosta

Aggiungo come **prima riga** del grid una `<li role="row" className="sr-only sm:contents">` con 6 celle `role="columnheader"` per: Famiglia, Ora, Canale, Titolo, Genere, Durata. Le celle sono `sr-only` visivamente (hanno `class="sr-only"`) ma presenti nel DOM/grid: gli screen reader le annunciano come intestazioni di colonna ad ogni cella corrispondente nelle righe successive. Visivamente: zero impatto (utility `sr-only` con clip+absolute).

Tailwind ha già `.sr-only` di default. Per mantenere il `display: contents` della riga e nascondere visivamente solo le celle, applico `sr-only` direttamente alle 6 celle figlie, non alla `<li>`.

#### C. Etichetta famiglia leggibile (mobile e tablet)

La riga `family-label-mobile` (visibile su <lg) già contiene icona+testo famiglia. Aggiungo `role="rowheader"` alla cella interna così lo screen reader annuncia "Intestazione di riga: RAI" prima delle righe del gruppo. Il divider colorato 3px resta `aria-hidden="true"`.

Su `lg:` la cella famiglia inline (prima colonna del primo programma di un gruppo) riceve `role="rowheader"`; per le righe successive del gruppo la cella famiglia vuota riceve `role="cell" aria-hidden="true"` (così lo screen reader non legge celle vuote ripetute, ma la columnheader "Famiglia" della riga di intestazione la associa correttamente).

#### D. `aria-label` significativi sui contenuti

- Cella ora: `<div role="cell" aria-label="Inizio alle 21:30">21:30</div>`.
- Cella canale: contiene `<Badge>` con testo già leggibile, aggiungo `aria-label="Canale RAI 1"` sulla cella.
- Cella titolo: contenuto testuale, nessuna etichetta extra (già esplicito).
- Cella genere: `aria-label="Genere FICTION"` quando presente; quando assente, cella riceve `aria-hidden="true"` e nessun contenuto.
- Cella durata: `aria-label="Durata 1 ora e 55 minuti"` derivato da `formatDuration`. Aggiungo helper `formatDurationSpoken(min: number)` in `src/lib/dateUtils.ts` che ritorna stringa parlata italiana.

#### E. `aria-rowindex` / `aria-colindex` (opzionale)

Per griglie virtualizzate o paginate ARIA raccomanda `aria-rowindex`/`aria-colindex` quando l'indice DOM differisce dall'indice logico. Qui c'è paginazione (`TV_PAGE_SIZE = 8`), quindi aggiungo:

- Sul `<ul>`: `aria-rowcount={tonightHighlights.length + 1}` (+1 per header), `aria-colcount={6}`.
- Su ogni riga programma: `aria-rowindex={safePage * TV_PAGE_SIZE + i + 2}` (1-based, +1 per header).
- Su ogni cella: `aria-colindex={1..6}` corrispondente alla colonna.

Questo permette agli screen reader di annunciare "Riga 9 di 47, colonna 4 di 6: Il Commissario Montalbano".

#### F. Live region per paginazione

Aggiungo `aria-live="polite"` sul `<span>` "Pagina X / Y · N canali" per annunciare il cambio pagina senza interrompere la navigazione.

#### G. Mobile (<sm) — semantica alternativa

Su mobile il layout è stacked (2 righe per programma), non tabellare. Pattern proposto:

- `<ul>` rimane `role="table"` (su mobile gli screen reader navigano comunque per riga).
- `<li>` programma rimane `role="row"`.
- Le 4 informazioni (ora, canale, titolo, genere, durata) sono dentro 2 div visivi, ma applico `role="cell"` a ciascun elemento informativo individuale (ora, canale, durata, titolo, genere) → 5 celle role="cell" per riga, comunque associate alle columnheader della riga di intestazione.

In alternativa, usare `role="article" aria-label="Programma: 21:30 RAI 1 Il Commissario Montalbano"` semplificato: lo screen reader annuncia tutto in una frase. Decido per questa seconda strategia su mobile perché più naturale per audio lineare.

Implementazione: condizionale via classe `sm:hidden`/`sm:contents` non basta perché role è statico HTML. Soluzione: rendering doppio già esistente (mobile flex stacked + desktop grid celle) — applico ruoli appropriati a ciascuna versione.

Decisione finale: 
- Mobile (<sm): la `<li>` riceve `role="listitem"` (default `<ul>`/`<li>`) e contenuto in `<article aria-label="...">` con descrizione completa parlata.
- Desktop (≥sm): la `<li>` riceve `role="row"` e celle separate.

Per gestire ruoli condizionali in React: sempre usare doppio markup già presente (`hidden sm:contents` / `sm:hidden`), applicare `role` appropriato a ciascun blocco.

#### H. Test accessibilità

Aggiungo test in `src/components/home/TonightTvList.test.tsx` (nuovo file) con `@testing-library/react` e `vi`:

- Verifica presenza `role="table"` con `aria-label`.
- Verifica 6 `role="columnheader"` con testo corretto.
- Verifica almeno una `role="row"` con celle `role="cell"`.
- Verifica `aria-rowcount`, `aria-colcount` calcolati.
- Verifica `aria-label` su cella durata in formato parlato italiano.

Mock di `useQueries` per fornire dati TV deterministici (riusare struttura `TvFamilyPayload` da `STREAMING_FAMILIES`).

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/home/TonightTvList.tsx` | EDIT | Aggiunta `role="table"`, `aria-label`, `aria-rowcount`, `aria-colcount` su `<ul>`. Inserita riga sr-only di 6 `role="columnheader"`. Su `<li>` desktop: `role="row"` + `aria-rowindex`. Su celle desktop: `role="cell"` o `role="rowheader"` (cella famiglia prima riga gruppo) + `aria-colindex` + `aria-label` parlati. Su divider famiglia: `aria-hidden="true"` sulla barra, `role="rowheader"` sulla cella label. Su mobile blocco stacked: `<article>` interno con `aria-label` aggregato (ora, canale, titolo, genere, durata). Live region su paginazione status. Preservati `data-testid` esistenti. |
| `src/lib/dateUtils.ts` | EDIT | Aggiunta funzione `formatDurationSpoken(minutes: number): string` che ritorna `"1 ora e 55 minuti"`, `"45 minuti"`, `"2 ore"`, gestendo singolare/plurale italiano. |
| `src/lib/dateUtils.test.ts` | EDIT | Test per `formatDurationSpoken`: 0, 1, 60, 65, 90, 120, 125. |
| `src/components/home/TonightTvList.test.tsx` | NEW | Test accessibilità: ruoli, columnheader, rowcount, aria-label durata parlata. Mock `useQueries` con dataset minimo deterministico. |
| `changelog.md` | EDIT | `### Added`: "Accessibilità Stasera in TV: ruoli ARIA grid completi, etichette parlate per durata e intestazioni di colonna invisibili per screen reader. Indice riga/colonna esposto per navigazione assistita. Compatibile NVDA, JAWS, VoiceOver." |

### Cosa NON cambia

- Layout visivo desktop/tablet/mobile.
- Logica dati, paginazione, filtri famiglia, divider colorato.
- `inferGenre`, `STREAMING_FAMILIES`, hook React Query.
- `data-testid` esistenti (`family-divider`, `family-label-mobile`).
- Comportamento click, hover, tooltip nativo `title`.

### Rischi e mitigazioni

- **`display: contents` + ARIA roles su Safari < 16**: alcune versioni vecchie ignoravano i ruoli ereditati. Mitigazione: applico `role` esplicito sul `<li>` (non sul wrapper invisibile), così Safari lo rispetta. Test manuale su VoiceOver in fase di QA.
- **Doppio annuncio "RAI"** se sia divider che cella famiglia hanno label: mitigazione → divider barra `aria-hidden="true"`, label famiglia mobile `role="rowheader"` su <lg, su lg solo cella prima colonna ha `role="rowheader"`.
- **Paginazione e `aria-rowindex`**: alcuni screen reader non aggiornano in modo fluido. Aggiungo live region come fallback annuncio cambio pagina.
- **Test `useQueries` mock**: richiede setup React Query `QueryClientProvider` nel test. Riuso pattern già esistente in altri test? Verifico `src/test/setup.ts` durante implementazione; se assente, aggiungo wrapper minimo nel test stesso.

### Validazione

1. `npm run build` + `npm run lint` invariati.
2. `npm run test` include nuovo file test, tutti passano.
3. Ispezione manuale DevTools Accessibility tree:
   - Tabella riconosciuta con label "Programmi in prima serata stasera".
   - 6 colonne con header espliciti.
   - Righe numerate, celle annotate con colindex.
4. Lighthouse accessibility score: nessuna regressione (target ≥95).
5. Test manuale VoiceOver (macOS) e NVDA (se disponibile): annuncio corretto "Riga 3 di 47, colonna 4 di 6, Titolo: Il Commissario Montalbano".
6. `npm run check:italian` exit 0 (tutte le `aria-label` in italiano).
7. Layout visivo invariato: confronto screenshot pre/post a 375/768/1280/1920 px.

### Checklist post-edit

1. `<ul>` ha `role="table"`, `aria-label`, `aria-rowcount`, `aria-colcount`.
2. Riga sr-only di columnheader presente come prima riga del grid.
3. Ogni `<li>` programma desktop ha `role="row"` + `aria-rowindex`.
4. Ogni cella desktop ha `role="cell"` (o `rowheader` per famiglia) + `aria-colindex` + `aria-label` quando il contenuto non è auto-esplicativo.
5. Mobile usa `<article aria-label>` aggregato.
6. Helper `formatDurationSpoken` in italiano coperto da test.
7. Test accessibilità nuovo passa.
8. `changelog.md` aggiornato in `### Added`.
9. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

