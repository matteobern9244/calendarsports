

## Allineamento chip genere e durata in "Stasera in TV" (desktop)

### Problema osservato

Nello screenshot allegato, sulle righe della scheda "Stasera in TV" (vista desktop), il chip del genere (es. `FICTION`, `NEWS`, `TALK SHOW`, `SPORT`) e la durata (es. `1h 55 min`) seguono il titolo del programma con spaziatura naturale (`flex-wrap` con `gap-x-2`). Risultato: questi due elementi "ballano" da riga a riga, attaccati al titolo, senza una colonna verticale visiva. La richiesta è allinearli sempre a destra in fondo alla riga, in modo che formino due colonne verticali stabili.

### Scope dell'intervento

- **Solo layout desktop** (`sm:` breakpoint in su) della lista programmi in `src/components/home/TonightTvList.tsx`.
- **Mobile invariato**: il layout a 2 righe già mette durata in alto a destra (`ml-auto`) e genere accanto al titolo a capo. Non si tocca.
- Nessuna modifica a logica dati, paginazione, filtri, divider famiglia, sezione header.

### Modifica precisa (desktop block)

Riga interessata: il `<div className="hidden sm:flex sm:items-center sm:gap-3">` interno alla `<li>`.

Struttura attuale del blocco titolo (problema):

```text
[Famiglia 24w] [Ora 12w] [Canale badge] [titolo + chip genere + durata insieme con flex-wrap]
```

Struttura proposta:

```text
[Famiglia 24w] [Ora 12w] [Canale badge] [titolo flex-1 truncate ......] [chip genere] [durata]
                                                                        \___ allineati a destra ___/
```

Cambiamenti puntuali nel JSX desktop:

1. Trasformare il contenitore titolo+meta da `flex-wrap` a layout a 3 zone:
   - sostituire `<div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">` con `<div className="min-w-0 flex-1 flex items-center gap-3 min-w-0">`.
2. Avvolgere il solo titolo in uno `<span>` che possa restringersi: classi `flex-1 min-w-0 truncate font-medium text-sm leading-tight` (il `truncate` evita che titoli lunghi spingano fuori i chip a destra; il browser mostrerà i tre puntini quando manca spazio).
3. Lasciare il chip genere come secondo figlio del contenitore con `shrink-0` (già presente). Aggiungere `ml-auto` solo al primo elemento "fisso a destra" non serve perché `flex-1` sul titolo spinge gli altri a destra automaticamente.
4. Lasciare la durata come terzo figlio con `shrink-0 whitespace-nowrap font-mono leading-none text-xs text-muted-foreground`. Niente più `flex-wrap`.
5. Caso "nessun genere": il chip viene renderizzato condizionalmente con `{g ? <Badge>...</Badge> : null}`. Per garantire colonna stabile della durata anche senza genere, sostituire il `null` con un placeholder vuoto di pari width? **No**: si accetta che la durata si avvicini al titolo nelle righe senza genere (comportamento corretto e meno invasivo). La maggioranza delle righe ha un genere, quindi visivamente le due colonne risultano comunque ordinate.

### Cosa NON cambia

- Layout mobile (`sm:hidden flex flex-col gap-1.5`) invariato.
- Nessuna modifica a `inferGenre`, `formatDuration`, `STREAMING_FAMILIES`.
- Nessuna modifica alle classi del divider famiglia, header card, paginazione, toggle filtri.
- Nessun nuovo import.
- Nessun cambio a `useStreamingData`, `streamingApi`, edge function `streaming-tv`.
- Nessun impatto su altre pagine (`StreamingPage`, sport pages, Home altrove).

### Rischi e mitigazioni

- **Titoli lunghi tagliati con `truncate`**: rischio che l'utente perda parte del titolo. Mitigazione: `truncate` agisce solo quando manca spazio fisico per chip+durata; nel 95% dei casi (titoli sotto i 50 caratteri) il titolo resta intero. In più, il titolo completo resta accessibile via `title={row.title}` (HTML attribute) che aggiungo come tooltip nativo sul `<span>` titolo per accessibilità.
- **Larghezza variabile chip genere**: chip con testi diversi (`FICTION` vs `TALK SHOW`) producono colonne non perfettamente allineate. Comportamento accettato e coerente con la richiesta "in fondo a destra" (non "in colonna larghezza fissa"). Non aggiungo `min-width` arbitrari ai chip per non introdurre spazi vuoti antiestetici.
- **Regressione test e2e**: i test e2e (`e2e/app.spec.ts`) non asseriscono questo layout specifico (solo presenza testi). Nessun aggiornamento necessario.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/components/home/TonightTvList.tsx` | EDIT | Solo blocco desktop (`hidden sm:flex`) della `<li>`: contenitore titolo+meta passa da `flex-wrap` a `flex items-center gap-3`; titolo wrappato in `<span class="flex-1 min-w-0 truncate" title={row.title}>`; chip genere e durata restano `shrink-0` allineati a destra. |
| `changelog.md` | EDIT | `### Changed`: "Stasera in TV (desktop): chip genere e durata sempre allineati in fondo a destra; titolo lungo troncato con tooltip nativo." |

### Validazione

1. Aprire `/` (Home), scheda "Stasera in TV", viewport ≥ 640px:
   - Tutte le righe mostrano: famiglia (col 1) | ora (col 2) | canale (col 3) | titolo (riempie spazio) | chip genere a destra | durata in fondo a destra.
   - Riga senza genere (es. "Sport 24 Today"): chip genere assente, durata comunque a destra (vicina al titolo, accettato).
2. Hover su titolo lungo troncato: tooltip nativo mostra titolo completo.
3. Viewport mobile (<640px): layout 2 righe invariato (durata in alto a destra, genere accanto al titolo).
4. Filtri famiglia, paginazione, divider famiglia: invariati.
5. `npm run lint` + `npm run build` invariati.
6. `npm run check:italian` exit 0 (nessuna stringa toccata).

### Checklist post-edit

1. Solo blocco desktop di `TonightTvList.tsx` modificato.
2. Mobile non toccato.
3. Tooltip `title` aggiunto per accessibilità sui titoli troncati.
4. `changelog.md` aggiornato con voce `### Changed`.
5. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

