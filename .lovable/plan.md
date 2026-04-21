

## Fallback deterministico per placeholder EV-* con multipli rich title competitor

### Problema

Oggi in `supabase/functions/streaming-tv/index.ts` la funzione `enrichTitle`, quando il raw è un placeholder generico (`EV-SP`, `EV-CN`, `EV-FILM`, `EV-TV`) e il match per prefisso fallisce, applica due fallback in cascata:

1. **Match per orario esatto** (`hh:mm`): se trova un rich title con `hh/mm` identici al raw, lo sceglie. In caso di parità sceglie il **più lungo come stringa**.
2. **Match per genere atteso** (es. `EV-SP` → genere ∈ {Sport, Calcio, Tennis, ...}): se ci sono più rich title col genere giusto, sceglie il **più lungo come stringa**.

Limite osservato: "il più lungo come stringa" non è deterministico né corretto in scenari realistici. Esempio Canale 5 con doppia trasmissione sportiva sequenziale (es. `EV-SP` 20:40 partita + `EV-SP` 23:00 highlights). Se entrambi i rich title hanno genere "Sport", il fallback B seleziona il titolo lessicalmente più lungo, ignorando la **vicinanza temporale** col raw, e può associare gli highlights delle 23:00 alla riga delle 20:40.

Inoltre, il fallback per orario esatto (priorità 2) non considera il genere atteso del placeholder: se il rich title con `hh:mm` esatto è di genere sbagliato (es. una breve promo "Anteprima Tg5 (News)" alle 20:40 mentre il vero evento sportivo è "Calcio - Coppa Italia (Sport)"), può vincere quello sbagliato.

### Soluzione

Rendere il fallback **deterministico** combinando vincolo di genere e distanza temporale, in un'unica funzione di scoring.

#### A. Backend — `supabase/functions/streaming-tv/index.ts`

Refactor di `enrichTitle` mantenendo l'ordine di priorità ma sostituendo i due fallback B/C con un singolo passaggio di scoring quando il raw è un placeholder `EV-*`:

**Priorità 1 (invariata)**: match per prefisso di token (≥3 token comuni o ≥15 char).

**Priorità 2 (nuova logica per placeholder)**: se `rawUpper` è un placeholder noto in `PLACEHOLDER_TO_GENRE`, scorrere tutti i rich title e calcolare uno **score** per ognuno:
- **Filtro hard**: il genere del rich title (estratto dall'ultima `(...)`) deve appartenere al set `wanted` del placeholder. Se non appartiene, il rich title è scartato (score = -∞).
- **Score per i candidati validi**:
  - **+1000** se `cand.hh === rawHh && cand.mm === rawMm` (match orario esatto).
  - **-distanceMinutes** dove `distanceMinutes = |cand.hh*60 + cand.mm - rawHh*60 - rawMm|` (clamp a max 720 = 12h per evitare overflow su gap notte/mattina).
  - **+lengthBonus** = `min(cand.title.length, 100) * 0.01` come tiebreaker stabile (penalizza pochissimo i titoli corti, massimo +1.0 punti — molto meno della distanza temporale).
- Se `rawHh`/`rawMm` sono `undefined`, usare solo il filtro hard di genere + lengthBonus.
- Se nessun candidato passa il filtro genere, fallback al match per orario esatto **senza** vincolo di genere (priorità 3 attuale conservata come safety net), e infine alla cosmetizzazione del raw.

**Priorità 3 (invariata, non-placeholder)**: per raw che NON sono placeholder e non hanno match per prefisso, conservare l'attuale match per orario esatto (con preferenza per il più lungo) — comportamento corrente preservato per casi non-placeholder.

**Priorità 4 (invariata)**: cosmetizzazione del raw quando nessun match.

Questo garantisce:
- `EV-SP` 20:40 con candidati `Calcio - Coppa Italia (Sport)` 20:40 + `Calcio Highlights (Sport)` 23:00 → vince il primo (score 1000+0.x vs -140+0.x).
- `EV-SP` 20:40 con candidati `Anteprima Tg5 (News)` 20:40 + `Calcio - Coppa Italia (Sport)` 20:40 → vince Coppa Italia (Tg5 scartato dal filtro genere).
- `EV-CN` 21:15 con candidati `Il Padrino (Film)` 21:20 + `Promo (Film)` 23:50 → vince Padrino (distanza 5 min vs 155 min).

#### B. Test — `src/lib/streamingTitleEnrichment.test.ts`

Estendere il file esistente (copia tipata di `enrichTitle` per test puro, dato che la edge function gira su Deno e non è coperta dal runner Vitest del frontend) con i nuovi casi:

1. **Più rich title con stesso genere "Sport", orari diversi**: raw `EV-SP` `hh=20 mm=40`, candidati `Calcio - Coppa Italia (Sport)` 20:40 + `Calcio Highlights Notte (Sport)` 23:00 → atteso titolo `Calcio - Coppa Italia`.
2. **Più rich title con orario esatto, generi diversi**: raw `EV-SP` `hh=20 mm=40`, candidati `Anteprima Tg5 (News)` 20:40 + `Calcio - Coppa Italia (Sport)` 20:40 → atteso `Calcio - Coppa Italia` con genere `Sport`.
3. **Raw senza orario, solo filtro genere + lengthBonus**: raw `EV-SP` senza hh/mm, candidati `Calcio (Sport)` + `Calcio - Coppa Italia - Inter Vs Como (Sport)` → atteso il più lungo (lengthBonus tiebreaker).
4. **Nessun candidato del genere atteso, fallback safety net**: raw `EV-SP` 20:40, candidati solo `Tg5 - Notte (News)` 20:40 → atteso fallback al match per orario esatto senza genere → titolo `Tg5 - Notte` (preserva comportamento corrente come safety net).
5. **Test esistenti** (placeholder EV-CN, EV-SP single-match, prefisso normale, no-match cosmetico) → tutti devono restare verdi.

Aggiornare il file con la nuova versione tipata di `enrichTitle` mantenendo il commento di limite (divergenza copia/live non rilevata dal CI, validazione runtime via curl post-deploy).

#### C. Validazione manuale post-deploy

```bash
curl '.../streaming-tv?action=prime-time&family=mediaset' \
  | jq '.data.channels[] | select(.id=="canale-5") | .programs[] | {start, title, genre}'
```
Atteso: la riga delle 20:40 mostra il titolo dell'evento principale (non highlights tardo-notturni), genere `Sport`.

#### D. Documentazione

- `changelog.md`: voce `### Changed` — "Scraping TV: scoring deterministico per placeholder generici (EV-SP/EV-CN/EV-TV) — vince il rich title col genere atteso più vicino temporalmente al raw, evitando associazioni spurie tra eventi sequenziali sullo stesso canale".

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/streaming-tv/index.ts` | EDIT | Refactor di `enrichTitle`: per raw placeholder `EV-*` introdurre singola passata di scoring (filtro hard genere + bonus 1000 per orario esatto + penalità distanza minuti + lengthBonus tiebreaker). Safety net: se nessun candidato passa il filtro genere, fallback al match per orario esatto attuale. Comportamento per raw non-placeholder invariato. Nessun cambio firma, response JSON o lista canali. |
| `src/lib/streamingTitleEnrichment.test.ts` | EDIT | Aggiornare la copia tipata di `enrichTitle` con la nuova logica di scoring. Aggiungere 4 nuovi casi test (multipli candidati genere uguale orari diversi, multipli candidati orario uguale generi diversi, no-orario lengthBonus, safety net senza candidati di genere). Mantenere i 5 test esistenti verdi. |
| `changelog.md` | EDIT | `### Changed`: descrizione fallback deterministico per placeholder EV-*. |

### Cosa NON cambia

- Lista canali in `FAMILIES` (Canale 5 e tutti gli altri preservati).
- Comportamento per raw non-placeholder (match per prefisso e match per orario esatto attuali invariati).
- Firma `Program`, struttura JSON di risposta, `extractRichTitles` (già ritorna `RichTitle[]` con `hh/mm` opzionali).
- `parseStaseraintvHtml`, `enrichTitle` per casi normali, frontend `TonightTvList.tsx`, hook React Query.
- Layout, accessibilità, CSS Grid `display: contents`, mobile.
- Nessuna nuova dipendenza, segreto, env var, branch policy.

### Rischi e mitigazioni

- **Genere mappato male in `PLACEHOLDER_TO_GENRE`**: il set `wanted` per `EV-SP` include {Sport, Calcio, Tennis, Motori, Basket, Pallavolo, Pallacanestro, Rugby, Volley, Nuoto, Ciclismo}. Se la pagina staseraintv usa un genere fuori dal set (es. `Atletica`), il candidato viene scartato → safety net riporta al match orario esatto generico → titolo comunque sensato. Aggiunta nota nel codice per facile estensione del set.
- **lengthBonus troppo alto**: cappato a +1.0 punti totali (factor 0.01 × 100 char max), molto inferiore alla penalità distanza (1 minuto = -1 punto). Tiebreaker affidabile solo a parità sostanziale di orario.
- **Distanza notte/mattina** (es. raw 23:50, cand 00:10 = 20 min reali ma calcolo 1420 min): clamp a 720 min limita il danno; in pratica i palinsesti staseraintv sono sempre pre-mezzanotte per la prima serata, scenario non critico.
- **Backtracking regex / performance**: nessun cambio regex, solo logica di scoring O(n) sui rich title (tipicamente <50 per pagina). Nessun impatto.
- **Rollback semplice**: se osservato un peggioramento, rivertire il blocco `if (placeholder in PLACEHOLDER_TO_GENRE)` ripristina la logica precedente (codice già in stato testato).

### Validazione finale

1. `npm run lint`, `npm run build`, `npm run test` (incluso `streamingTitleEnrichment.test.ts` esteso).
2. `npm run check:italian` exit 0.
3. Deploy edge function `streaming-tv`.
4. `curl streaming-tv?action=prime-time&family=mediaset` → titolo Canale 5 20:40 corretto + genere `Sport`.
5. Apertura preview, scheda "Stasera in TV": Canale 5 mostra il main event corretto, non programmi tardo-serali spuri.

### Checklist post-edit

1. `streaming-tv/index.ts`: `enrichTitle` ha nuovo blocco di scoring per placeholder `EV-*` (filtro genere + scoring orario+lunghezza); safety net preservato; canali intatti.
2. `streamingTitleEnrichment.test.ts`: 9 casi totali (5 esistenti + 4 nuovi) tutti verdi; copia di `enrichTitle` aggiornata.
3. Edge function deployata e validata via curl.
4. Test verde in CI.
5. `changelog.md` aggiornato in `### Changed`.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

