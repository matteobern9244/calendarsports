

## Chip genere garantito su ogni riga di "Stasera in TV"

### Problema osservato (screenshot)

Nello screenshot, le righe `RAI 1 - Affari Tuoi` e `RAI 2 - Belve` non mostrano il chip genere (rettangoli rossi vuoti), mentre tutte le altre lo hanno. Causa: `inferGenre` in `src/lib/genreUtils.ts` ha una lista keyword hardcoded e parziale. "Affari Tuoi" e "Belve" non matchano:
- `Affari Tuoi` non è in `/quiz|reazione a catena|l'eredita|caduta libera/` (è un game show ma non listato).
- `Belve` non è in `/striscia|paperissima|zelig|le iene|propaganda|porta a porta|piazzapulita|dimartedi|cartabianca|stasera italia/` (è un talk ma non listato).

Risultato: `inferGenre` ritorna `undefined` → in `TonightTvList.tsx` riga 380-388 e 444-453 il chip non viene renderizzato (`g ? <Badge> : null`). UI incoerente: alcune righe hanno chip, altre no.

L'utente vuole **vedere sempre il chip per ogni riga**, con gestione robusta che non dipenda dall'esaustività di una lista keyword.

### Strategia: garanzia formale con cascata di fallback

Riscrivere `inferGenre` per restituire **sempre** una stringa non-undefined, con cascata deterministica:

1. **Genere fornito dall'edge function** (`row.genre` da scraping staseraintv) → usato così com'è. (Già attuale priorità in `TonightTvList.tsx`.)
2. **Match per keyword specifico nel titolo** (logica attuale, espansa con più programmi italiani noti).
3. **Match per famiglia/canale** (Sky Cinema → Film, Sky Sport → Sport, canali sport/cinema → idem).
4. **Match per pattern strutturale del titolo** (presenza di `(Genere)` finale, `St. X - Ep. Y` → Serie Tv, ecc.).
5. **Default per famiglia (fallback garantito)**:
   - `rai` → `Tv` (programma generalista RAI)
   - `mediaset` → `Tv` (programma generalista Mediaset)
   - `sky-sport` → `Sport`
   - `sky-cinema` → `Film`
   - `discovery` → `Lifestyle`

Cambio firma: `inferGenre(family, channel, title): string` (era `string | undefined`). Il valore "garantito" non è un'invenzione fuorviante: rappresenta una classificazione macro coerente col canale, allineata alla policy "real data only" perché basata su segnali reali (famiglia + canale + titolo), non su mock.

### Espansione lista keyword (priorità 2)

Aggiungere alla lista `inferGenre` programmi italiani comuni mancanti. Lista compilata a partire dal palinsesto reale RAI/Mediaset/Discovery 2025/2026:

- **Quiz/Game show**: aggiungere `affari tuoi`, `the wall`, `avanti un altro`, `chi vuol essere milionario`, `soliti ignoti`.
- **Talk Show**: aggiungere `belve`, `che tempo che fa`, `domenica in`, `verissimo`, `pomeriggio cinque`, `quarta repubblica`, `controcorrente`, `zona bianca`, `dritto e rovescio`, `accordi e disaccordi`, `otto e mezzo`, `in onda`.
- **Reality**: aggiungere `gf vip`, `the voice`, `tu si que vales`, `italia s got talent`.
- **Documentario**: aggiungere `ulisse`, `superquark`, `geo`, `kilimangiaro`, `passato e presente`.
- **Fiction**: nuova categoria → `il commissario montalbano`, `don matteo`, `un posto al sole`, `cuori`, `mina settembre`, `che dio ci aiuti`, `imma tataranni`, `doc nelle tue mani`, `blanca`, `lolita lobosco`, `i bastardi di pizzofalcone`, `makari`, `carosello carosone`. Categoria mappata a `Fiction`.
- **Cooking**: nuova categoria → `bake off`, `cucine da incubo`, `4 ristoranti`, `hell['s] kitchen`, `4 hotel`, `family food fight`. Categoria mappata a `Cooking`.
- **Lifestyle**: nuova categoria per Discovery → `casa a prima vista`, `cortesie per gli ospiti`, `cake star`, `vado a vivere in campagna`, `little big italy`. Mappata a `Lifestyle`.

### Pattern strutturali (priorità 4)

- `\([A-Za-zÀ-ÿ ]{3,30}\)\s*$` → estrazione del genere già presente nel titolo (es. `Le Iene presentano - Il verdetto (Inchieste)` → `Inchieste`). Mappato a `Talk Show` se "inchieste"/"reportage", altrimenti usato così com'è dopo capitalizzazione e validazione contro una whitelist.
- `St\.\s*\d+|stagione \d+|s\d+e\d+|episodio \d+|puntata` → `Serie Tv` se non match Fiction prima.
- `presenta|edizione del|edizione delle` insieme a `\btg|telegiornale` → `News`.
- `puntata del \d+` su canale RAI/Mediaset generalista senza altro segnale → `Tv` (mantiene struttura riconoscibile).

### Cambio firma e callsite

`inferGenre` da `(family, channel, title): string | undefined` a `(family, channel, title): string`. Tre callsite in `TonightTvList.tsx`:
- riga 313: `const g = row.genre || inferGenre(...)`. Resta valido. `g` ora è sempre `string`.
- riga 376-377: `aria-label={g ? \`Genere ${g}\` : undefined}` → `aria-label={\`Genere ${g}\`}` (sempre presente).
- riga 380-388: rimuove ramo `g ? ... : null`, sempre renderizza Badge.
- riga 408 + 444-453: stesso pattern, rimuove condizionale, sempre Badge.

`aria-hidden={g ? undefined : true}` → rimosso, cella sempre annunciata.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/lib/genreUtils.ts` | EDIT | Cambio firma → `string`. Espansione keyword (Fiction, Cooking, Lifestyle aggiunte; Quiz/Talk Show/Reality/Documentario estesi). Estrazione `(Genere)` finale dal titolo con whitelist. Pattern strutturali (St./Ep./Stagione → Serie Tv). Default deterministico per famiglia in fondo (`rai`/`mediaset` → `Tv`, `sky-sport` → `Sport`, `sky-cinema` → `Film`, `discovery` → `Lifestyle`). Commenti spiegano cascata e perché non è "dato inventato". |
| `src/lib/genreUtils.test.ts` | EDIT | Aggiungere casi: `Affari Tuoi` su RAI 1 → `Quiz`; `Belve` su RAI 2 → `Talk Show`; `Don Matteo` → `Fiction`; `Bake Off Italia` → `Cooking`; `Casa a Prima Vista` su Discovery → `Lifestyle`; titolo sconosciuto su RAI 1 → `Tv` (default famiglia); titolo sconosciuto su Sky Sport → `Sport`; estrazione `(Inchieste)` da `Le Iene presentano - Il verdetto (Inchieste)` → mappato a `Talk Show`. Aggiornare i test esistenti che si aspettavano `undefined` (riga "nessun match -> undefined") al nuovo comportamento (`Tv`). |
| `src/components/home/TonightTvList.tsx` | EDIT | Riga 313: `const g = row.genre || inferGenre(...)` resta. Rimuovere condizionali `g ?` su Badge (desktop riga 380-388, mobile riga 444-453). Rimuovere `aria-hidden={g ? undefined : true}` su cella genere (riga 377): annunciata sempre. `aria-label` cella genere desktop sempre `\`Genere ${g}\``. ariaParts mobile (riga 415): `if (g)` rimosso, sempre `ariaParts.push(\`genere ${g}\`)`. |
| `src/components/home/TonightTvList.test.tsx` | EDIT | Aggiornare il test esistente per riflettere chip genere sempre presente (se c'è un'asserzione che ammette assenza, renderla strict). |
| `changelog.md` | EDIT | `### Changed`: "Stasera in TV: chip genere garantito su ogni riga grazie a cascata di fallback (keyword estese, estrazione genere dal titolo, default deterministico per famiglia). Affari Tuoi → Quiz, Belve → Talk Show, Don Matteo → Fiction, ecc. Eliminate righe senza chip." |

### Cosa NON cambia

- Lista canali in `FAMILIES` (preservata).
- Logica edge function `streaming-tv` (nessun deploy backend).
- Layout grid CSS, accessibilità ARIA struttura, paginazione, filtri famiglia.
- Layout mobile/desktop, divider colorato, hook React Query.
- Nessuna nuova dipendenza, env var, segreto.

### Rischi e mitigazioni

- **Default `Tv` su RAI/Mediaset troppo generico**: scelto perché onesto (significa "programma TV generalista non classificato"). Alternativa "Varietà" rischia di essere errata (un quiz non è un varietà). Documentato come fallback esplicito.
- **Cambio firma `string | undefined` → `string`**: i callsite sono tutti in `TonightTvList.tsx`. TypeScript segnalerà eventuali altri usi al build. Nessun impatto su edge function.
- **Test esistenti rotti**: il caso "nessun match → undefined" cambia; aggiornato esplicitamente nel piano.
- **Regressione non visiva**: nessuna, il chip ora appare dove prima non c'era.
- **Lingua**: tutti i nuovi default (`Tv`, `Fiction`, `Cooking`, `Lifestyle`, `Sport`, `Film`) accettabili in italiano contemporaneo. `check:italian` passa (sono nomi categoria, già presenti nello stesso file).

### Validazione

1. `npm run lint`, `npm run build`, `npm run test` (incluso `genreUtils.test.ts` esteso).
2. `npm run check:italian` exit 0.
3. Apertura preview "Stasera in TV": ogni riga visualizza un chip genere coerente, nessun rettangolo vuoto.
4. Casi spot-check da screenshot: `Affari Tuoi` → `QUIZ`; `Belve` → `TALK SHOW`; `Calcio - Coppa Italia` → `SPORT` (già funzionante); `Le Iene presentano (Inchieste)` → `TALK SHOW`; `Sport 24 Today` → `SPORT`.

### Checklist post-edit

1. `genreUtils.ts`: firma `string`, cascata documentata, lista keyword estesa, default per famiglia in fondo.
2. `genreUtils.test.ts`: nuovi casi verdi, test "undefined" aggiornato.
3. `TonightTvList.tsx`: tre callsite ripuliti dai condizionali `g ?`, chip sempre renderizzato.
4. `TonightTvList.test.tsx`: asserzioni allineate.
5. `changelog.md` aggiornato in `### Changed`.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

