
## Piano: fix palinsesti mancanti + verifica copertura canali + badge genere robusto + durata

Estende le richieste già aperte: badge genere su tutte le righe, durata `1h 25 min`, e ora **anche fix dei palinsesti vuoti** (Sky Sport in primis) con verifica reale di TUTTI i canali esposti nella scheda "Stasera in TV".

### 1. Audit reale di tutti i palinsesti

Prima di toccare codice, eseguo un audit live:
- Per ogni canale in `FAMILIES` (`supabase/functions/streaming-tv/index.ts`) con `staseraSlug` definito → curl a `https://www.staseraintv.com/programmi_stasera_<slug>.html` e verifica che il parser estragga ≥3 programmi nella fascia 19–24.
- Per i canali Sky Sport (oggi senza `staseraSlug` → `programs=[]`) cerco fonte alternativa pubblica:
  - Tentativo 1: `staseraintv.com` con slug alternativi (`skysport_uno`, `sky-sport-uno`, `sport_sky`, ecc.) tramite probe HTTP.
  - Tentativo 2: pagina indice `https://www.staseraintv.com/canali_sportivi.html` (se esiste) per scoprire gli slug reali.
  - Tentativo 3: fallback su `programmi-tv.cloud` o `tvzap.kataweb.it` (entrambi pubblici, scraping dichiarato fragile in README).
- Documento il risultato dell'audit nel changelog.

**Esito atteso e onesto**: per i canali dove nessuna fonte espone il palinsesto reale, **NON inventiamo dati**. La UI mostrerà "Palinsesto non disponibile" per quel canale specifico, e il filtro "Sky Sport" mostrerà solo i canali effettivamente coperti (o messaggio empty-state esplicito se nessuno è coperto). Questo rispetta `mem://constraints/data-policy`.

### 2. Fix edge function `streaming-tv`

In `supabase/functions/streaming-tv/index.ts`:
- Aggiungo gli slug Sky Sport scoperti durante l'audit (solo quelli verificati con HTTP 200 + parser ≥3 righe).
- Per i canali ancora scoperti, lascio `staseraSlug` undefined ma aggiungo un commento `// VERIFICATO 2026-04-19: nessuna fonte pubblica espone questo canale` per evitare future modifiche speculative.
- Rendo più robusta l'estrazione del genere (`enrichTitle`):
  - Fallback aggiuntivo: scan delle parentesi nel raw text grezzo della stessa riga `HH:MM - Titolo (Genere)` quando il rich block non c'è.
  - Allargo `GENRE_WHITELIST` con generi visti spesso ma mancanti (es. `Telefilm`, `Serie`, `Soap Opera`, `Magazine`, `Approfondimento`, `Meteo`, `Inchiesta`).

### 3. Frontend: durata + layout

In `src/pages/Index.tsx`:
- Helper `formatDuration(min: number): string` → `"45 min"` se <60, `"1h 25 min"` altrimenti, `""` se ≤0.
- Render dopo il badge genere: `<span className="text-xs text-muted-foreground whitespace-nowrap">{formatDuration(p.durationMin)}</span>`.
- Layout invariato (`flex-wrap items-baseline`), già responsive.
- Quando una famiglia selezionata ha tutti i canali scoperti → empty state "Palinsesto non disponibile per questa famiglia. Torna a 'Tutti'."

### 4. Documentazione

**`README.md`** — sezione Streaming:
- Tabella aggiornata "Copertura palinsesti per canale" con stato `coperto` / `non coperto` post-audit.
- Nota: badge genere mostrato solo quando la fonte lo espone; durata sempre calcolata da start/end.

**`changelog.md`** — sezione `[Unreleased]`:
- `Added`: badge genere reso più robusto (fallback parentesi nel titolo grezzo, whitelist estesa); durata programma `Xh Ym min` accanto al badge.
- `Fixed`: copertura palinsesti — audit completo di tutti i canali; aggiunti slug Sky Sport verificati; canali senza fonte pubblica dichiarati esplicitamente come "non coperti" invece di restare silenziosamente vuoti.
- `Note operative`: ribadita fragilità scraping; lista canali ancora scoperti.

### File toccati

- `supabase/functions/streaming-tv/index.ts` (slug aggiornati + genre extraction più robusta)
- `src/pages/Index.tsx` (durata + empty state per famiglia tutta scoperta)
- `README.md` (tabella copertura)
- `changelog.md` (Unreleased)

### Verifica end-to-end

1. Audit HTTP iniziale (curl su ogni slug candidato per Sky Sport e verifica righe parsate).
2. Redeploy `streaming-tv` + curl per `family=sky-sport` → almeno 1 canale con programmi reali, oppure tutti dichiarati esplicitamente vuoti.
3. Curl su tutte le 5 famiglie → conferma che ogni canale con `staseraSlug` ritorna ≥3 programmi prime time.
4. Home `/`: ogni riga mostra titolo + (genere se noto) + durata; filtro Sky Sport non vuoto se almeno un canale è coperto.
5. `npm run lint` + `npm run build`.

### Vincoli rispettati (AGENTS.md + memory)

- Nessun dato inventato: canali scoperti restano dichiaratamente vuoti.
- Fragilità scraping ribadita in README + changelog.
- Nessuna modifica a env, secrets, branch policy, file auto-generati, `supabase/config.toml`.
- Nessuna nuova dipendenza.
- Italian-only UI mantenuta.
