

## Fix "Stasera in TV": Canale 5 mancante + titolo "Ev-Sp" → titolo reale

### Diagnosi (da edge function reale + screenshot staseraintv.com)

**Issue 1 — Canale 5 sembra "sparito" in home.**
NON è stato eliminato: è ancora presente in `supabase/functions/streaming-tv/index.ts` riga 108 e nella vista "Streaming". L'edge function lo ritorna correttamente (verificato via `curl streaming-tv?family=mediaset`: `canale-5` con 8 programmi).

Il vero problema è in `src/components/home/TonightTvList.tsx`:
- La finestra "prime time" è hard-coded `21:00 - 22:30` Europe/Rome (riga 127-131).
- Stasera Canale 5 trasmette **Calcio Coppa Italia Inter-Como alle 20:40** (140 min, finisce alle 23:00). Inizio `20:40` < `21:00` → **scartato dalla finestra**, quindi Canale 5 non appare con il suo evento principale (al massimo appare con "Tg5-Notte" alle 21:57, marginale).
- Stesso bug colpisce qualunque grande evento sportivo/film con inizio tipico **20:30/20:35/20:40/20:45** (kickoff calcio, prime serata RAI con anticipi, ecc.).

**Issue 2 — Titolo mostrato "Ev-Sp" invece del reale.**
Lo scraping `parseStaseraintvHtml` legge la riga compatta `20:40 - EV-SP` dal palinsesto giornaliero a destra (vedi screenshot lato destro arancione). La pagina contiene anche il blocco "scheda" in case-mista a sinistra: `Calcio - Coppa Italia - Inter Vs Como (Sport)` + descrizione "Coppa Italia - Semifinale ritorno - In diretta...".

`extractRichTitles` cattura correttamente il rich title (regex `re1` matcha il pattern `... (Sport)`). Ma `enrichTitle` cerca match per **prefisso comune di token** tra raw `EV-SP` (token: `ev`, `sp`) e rich `Calcio - Coppa Italia - Inter Vs Como (Sport)` (token: `calcio`, `coppa`, `italia`...). Nessun token coincide → `common=0`, `commonChars=0`, fallisce la condizione `(common>=3 || commonChars>=15)` → titolo NON arricchito → resta `Ev-Sp` (la versione cosmetizzata di `EV-SP`).

Il caso `EV-SP` (placeholder generico per "evento sportivo") è strutturalmente diverso da titoli normali: non condivide token col titolo reale. Stesso pattern colpirà altre sigle generiche (`SPECIALE TG`, `EV-CN` per cinema, ecc.).

### Soluzione

Due fix paralleli, uno backend (edge function) e uno frontend (selettore home).

#### A. Backend — `supabase/functions/streaming-tv/index.ts`

Aggiungere a `enrichTitle` un **secondo passaggio di matching basato sull'orario** quando il prefisso fallisce.

Il blocco "scheda" in staseraintv.com associa un orario al rich title. Esempio dalla pagina di Canale 5 oggi:
```
20:40 [LIVE]
Calcio - Coppa Italia - Inter Vs Como (Sport)
Coppa Italia - Semifinale ritorno - In diretta dallo stadio Meazza...
```

**Cambio puntuale:**

1. Sostituire `extractRichTitles(html: string): string[]` con `extractRichTitles(html: string): RichTitle[]` dove `type RichTitle = { title: string; hh?: number; mm?: number }`. Quando il rich pattern è preceduto entro ~200 char da un `HH:MM`, salviamo l'orario.

2. Aggiornare `enrichTitle(rawUpper, rich, hh, mm)`: passare anche l'orario della riga compatta. Se il match per prefisso fallisce, **cerca un rich title con stesso `hh:mm`** (tolleranza 0 minuti, esatto). Se trovato, lo usa come titolo arricchito ed estrae il genere.

3. Propagare `hh`, `mm` da `parseStaseraintvHtml` a `enrichTitle` (già disponibili nel loop).

4. Logica di priorità in `enrichTitle`:
   - **Priorità 1**: match per prefisso di token (comportamento attuale, casi normali tipo `RACCONTO ...` → `Racconto di una notte (Fiction)`).
   - **Priorità 2 (nuovo)**: match per orario esatto quando esiste rich title con `hh:mm` corrispondente alla riga grezza.
   - **Priorità 3**: fallback alla cosmetizzazione del raw (comportamento attuale).

5. Niente nuove dipendenze, niente cambio firma `Program`, niente cambio risposta JSON. Solo titolo più ricco e genere quando estraibile dalla scheda.

**Pattern di estrazione dell'orario nel rich block:**
- Cercare `(\d{1,2}):(\d{2})[^<]{0,300}?<rich-title-pattern>` con regex; in alternativa fare due passaggi: prima estrarre tutti i blocchi `HH:MM` con offset nel testo, poi per ogni rich title trovare l'orario più vicino *prima* di esso (entro 500 char).
- Implementazione semplice e robusta: regex unica `/(\d{1,2}):(\d{2})[\s\S]{0,400}?([A-Za-zÀ-ÿ0-9][^<>\r\n]{4,250}\([A-Za-zÀ-ÿ' ]{3,40}\))/g`. La presenza di un `<br>` o newline dentro `{0,400}` è tollerata da `[\s\S]`. Cattura `(hh, mm, rich)` per ogni occorrenza.

**Edge case considerati:**
- Stesso rich title appare 2 volte (slot 1 + slot 2 della partita): salviamo entrambi, ognuno col proprio `hh:mm`.
- Rich title senza orario nelle vicinanze: salvato con `hh/mm` undefined, accessibile solo via match-per-prefisso (comportamento attuale preservato).

#### B. Frontend — `src/components/home/TonightTvList.tsx`

**Allargare la finestra prime time per non escludere kickoff sportivi e prime serate anticipate.**

Cambio puntuale nelle righe 127-135:
- `inPrimeWindow`: estendere da `21:00 - 22:30` a `20:30 - 23:00` Europe/Rome. Copre: anticipo Coppa Italia 20:40, kickoff Champions/Serie A 20:45, prime serate Sky Cinema 21:15, finestra reale "stasera" italiana.
- `MIN_DURATION`: alzare da `20` a `40` minuti per la finestra estesa. Filtra ulteriormente sigle, anticipi tg, "in onda alle 21" promo brevi. Per la sezione home conta solo l'evento principale, quindi 40 min è sicuro (calcio = 100+ min, fiction = 90+, film = 100+, news show = 40+).
- Comportamento "primo programma per canale" (`byChannel` map) invariato. Con finestra più larga ogni canale può avere più candidati: la priorità "main program (>=40 min) prima" già implementata sceglie l'evento più rilevante.

Il filtro hard-coded `if (fam === "mediaset" && ch.id !== "canale-5" && ch.id !== "italia-1")` (riga 92) resta: home limita Mediaset a Canale 5 e Italia 1, vista Streaming completa mantiene tutti. Conferma assoluta: **non rimuovo nessun canale dalla griglia in `streaming-tv/index.ts`** (rispetto rigoroso del vincolo dell'utente).

**Aggiornare il sottotitolo della scheda** (riga 204-206) da "Prima serata (dalle 21:00)" a "Prima serata (dalle 20:30)" per coerenza con la nuova finestra.

#### C. Test e validazione

1. Aggiungere test in `supabase/functions/streaming-tv/index.test.ts` (creare se assente, altrimenti integrare): mock di un blocco HTML che contiene `20:40 - EV-SP` + scheda `20:40 [LIVE] Calcio - Coppa Italia - Inter Vs Como (Sport)` → atteso `title="Calcio - Coppa Italia - Inter Vs Como"`, `genre="Sport"`. Dato che la cartella `supabase/functions` ha tipicamente test Deno separati e il setup CI corrente non li esegue, **alternativa pragmatica**: estrarre `extractRichTitles` + `enrichTitle` in un modulo puro testabile da vitest, oppure aggiungere un test JSON-fixture in `src/test/` che fa il parse via copia delle funzioni. **Scelta**: aggiungere fixture + test unit per il solo path `enrichTitle` con time-based matching, in `src/test/` come test puro su una copia tipata della funzione (semplice, niente infra Deno). Dichiarata come limitazione di test parallel, validata anche manualmente via curl post-deploy.

2. Aggiornare `src/components/home/TonightTvList.test.tsx` esistente: aggiungere caso fixture "Canale 5 con Coppa Italia 20:40, durata 140 min" → atteso che la riga compaia in `tonightHighlights` con titolo reale e genre `Sport`.

3. Validazione manuale post-deploy:
   ```bash
   curl '.../streaming-tv?action=prime-time&family=mediaset' | jq '.data.channels[] | select(.id=="canale-5") | .programs[] | select(.title|test("Coppa Italia|Calcio"))'
   ```
   atteso: titolo esteso + genere `Sport`.

#### D. Documentazione

- `changelog.md`: voce `### Fixed` con descrizione dei due fix (finestra prime time + match per orario in scraping).
- Nessun cambio a `README.md` (le fonti dati restano le stesse).

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/streaming-tv/index.ts` | EDIT | `extractRichTitles` ora ritorna `{ title, hh?, mm? }[]`; nuova regex tempo+rich. `enrichTitle` accetta `hh, mm` e fa fallback per orario esatto. Propagazione di `hh, mm` dal loop di `parseStaseraintvHtml`. Zero modifiche alla lista canali (Canale 5 e tutti gli altri preservati). Zero modifiche a `Program`/risposta JSON. |
| `src/components/home/TonightTvList.tsx` | EDIT | `inPrimeWindow`: finestra `20:30 - 23:00` (era `21:00 - 22:30`). `MIN_DURATION`: 40 min (era 20). Sottotitolo scheda: "Prima serata (dalle 20:30)". Nessuna modifica al filtro Mediaset (`canale-5` + `italia-1`) né alla logica di selezione/paginazione. |
| `src/components/home/TonightTvList.test.tsx` | EDIT | Nuovo test: fixture Canale 5 con programma 20:40 (durata 140 min, titolo `Calcio - Coppa Italia - Inter Vs Como`) → verifica che appaia in `tonightHighlights` con titolo e genere corretti. |
| `src/lib/streamingTitleEnrichment.test.ts` | NEW | Test unit per la logica di matching `enrichTitle`: caso "raw `EV-SP` 20:40 + rich `Calcio - Coppa Italia - Inter Vs Como (Sport)` con hh=20 mm=40" → titolo arricchito + genere `Sport`. Implementato come test puro che ricopia (o importa via wrapper se opportuno) la sola funzione, dichiarando il limite (la edge function Deno non è coperta dal CI Vitest del frontend). |
| `changelog.md` | EDIT | `### Fixed` con descrizione: scraping TV ora arricchisce titoli sigla "EV-SP" via match per orario; finestra prime time home ampliata a 20:30-23:00 per non escludere kickoff sportivi e anticipi RAI. |

### Cosa NON cambia (rispetto vincolo utente)

- **Nessun canale eliminato** da `FAMILIES` in `streaming-tv/index.ts`. Canale 5 + tutti gli altri preservati.
- Vista "Streaming" piena (`StreamingPage.tsx`) invariata.
- Nessun cambio a Edge Function diverse da `streaming-tv`.
- Nessun cambio a hook `useStreamingData`, `streamingApi`, layout grid già fatto.
- Mobile/desktop layout invariati. Accessibilità ARIA invariata.
- Nessun nuovo segreto, dipendenza, env var, branch policy.

### Rischi e mitigazioni

- **Regex `[\s\S]{0,400}?` rischio backtracking**: usato `?` non-greedy + limite hard `{0,400}` + flag `g` deterministico. Performance accettabile su HTML staseraintv (~100 KB). Verifico via curl post-deploy.
- **Match per orario spurio** se la pagina contiene `HH:MM` non legati a programmi (es. orari nelle descrizioni "Orario di trasmissione 21:00"): il limite 400 char riduce il rischio; in caso peggiore otteniamo un titolo errato per *quella sola* riga, mai dati inventati. Se observed in produzione, restringere a `{0,250}`.
- **Finestra 20:30 - 23:00 potrebbe far entrare programmi minori delle 20:30** (es. tg regionali RAI 20:30): `MIN_DURATION=40` filtra. I tg regionali durano ~30 min → esclusi.
- **`Tg5 - Notte` (38 min)** ora viene escluso dalla nuova soglia 40: accettabile, è un programma marginale rispetto al main event di Canale 5 (la partita 140 min). La logica "preferisci main program" già implementata sceglie correttamente.
- **Edge function deployment**: dopo edit, verifica con curl reale prima di chiudere il task. Se lo scraping rich+time non produce match (es. struttura HTML cambiata), fallback al comportamento attuale (titolo cosmetizzato) → niente regressione.

### Validazione finale

1. `npm run lint`, `npm run build`, `npm run test` (incluso nuovo test enrichment).
2. `npm run check:italian` exit 0.
3. Deploy edge function `streaming-tv`.
4. `curl streaming-tv?family=mediaset` → atteso almeno un programma Canale 5 con titolo `Calcio - Coppa Italia - Inter Vs Como` (o equivalente attuale del giorno) + `genre: "Sport"`.
5. Apertura preview, scheda "Stasera in TV", filtro `Mediaset` o `Tutti`: verifica che Canale 5 sia presente con titolo esteso e badge genere `Sport`.

### Checklist post-edit

1. `streaming-tv/index.ts`: `extractRichTitles` ritorna `{title, hh?, mm?}[]`; `enrichTitle` ha fallback per orario; canali Mediaset (incluso Canale 5) intatti.
2. `TonightTvList.tsx`: finestra `20:30-23:00`, `MIN_DURATION=40`, sottotitolo aggiornato.
3. Edge function deployata e validata via curl.
4. Test verde in CI.
5. `changelog.md` aggiornato in `### Fixed`.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

