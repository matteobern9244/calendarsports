

## Conversione robusta in ora italiana per tutte le date Juventus

### Diagnosi

Nel codice attuale tutte le date Juventus passano per `formatDateIT` / `toLocaleTimeString("it-IT", { timeZone: "Europe/Rome" })`, ma ci sono **tre punti fragili**:

1. **Stringhe ISO senza offset** (`"2026-04-21T19:45:00"` senza `Z` o `+HH:MM`): `new Date(...)` le interpreta come **ora locale del client**. Per un utente in fuso diverso o per un device con orologio sbagliato, l'orario mostrato deriva quindi non da UTC ma dal locale del browser. Sky/Lega in genere ritornano sempre con offset, ma non c'è alcuna garanzia. Una stringa naive bypassa silenziosamente la conversione `Europe/Rome`.
2. **Backend `sports-football`** riga 175: `new Date(match.date).toISOString().substring(0, 10)` calcola la `dateKey` per il lookup broadcaster in **UTC**, non in Europe/Rome. Una partita 22:00 italiana di sabato in inverno (= 21:00 UTC sabato) funziona, ma una 01:30 italiana di domenica diventa 00:30 UTC domenica → mismatch con la chiave generata da `m.matchDateUtc.substring(0,10)` lato Lega (che è anch'essa UTC, quindi qui è coerente — verifica OK). Ma se Lega in futuro cambiasse a `matchDateLocal`, ci sarebbe drift. Decisione: standardizzare entrambe le chiavi su **data Roma** per essere semanticamente corrette ("partita di sabato sera" = sabato indipendentemente dall'UTC).
3. **Nessun guard test**: non c'è verifica automatica che impedisca a futuri callsite di chiamare direttamente `new Date(...).toLocaleTimeString(...)` senza `timeZone: "Europe/Rome"`.

### Implementazione

#### A. Nuovo helper `src/lib/dateUtils.ts`

Aggiungere due funzioni pure, esportate, dedicate alla normalizzazione:

- `toRomeDate(input: string | Date): Date | null`
  - Accetta stringhe ISO, oggetti `Date` o stringhe naive.
  - Se la stringa **non** ha offset (`Z` né `[+-]HH:MM` finale), assume **UTC** (politica conservativa: tutti i nostri provider — Sky, Lega Serie A, Pulselive, Jolpica, motogp.com — pubblicano gli orari in UTC; la convenzione UTC-by-default è più sicura del fallback su locale del client).
  - Ritorna `Date` valido o `null`.
  - Detect offset via regex: `/(Z|[+-]\d{2}:?\d{2})$/i` sulla parte time della stringa.

- `formatJuventusDateTime(input: string | Date | null | undefined, opts?: { withSeconds?: boolean }): { date: string; time: string; full: string }`
  - Wrapper specializzato per Juventus che usa `toRomeDate` + `Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', ... })`.
  - Ritorna `{ date: "21/04/2026", time: "20:45", full: "21/04/2026 20:45" }` oppure `{ date: "—", time: "", full: "—" }` se input nullo/invalido.
  - Sostituisce le chiamate dirette `new Date(m.date).toLocaleTimeString(...)` sparse in `JuventusPage.tsx` (3 callsite) e `Index.tsx` (1 callsite Juventus).

Refactor minimale di `formatDateIT` esistente per usare internamente `toRomeDate` (mantiene firma e comportamento, garantisce naive→UTC).

#### B. Patch `src/pages/JuventusPage.tsx`

Sostituire i 3 callsite hand-rolled con `formatJuventusDateTime`:

- Card "Prossima Partita" (riga 136-139): un'unica chiamata `const { date, time } = formatJuventusDateTime(nextMatch.date)`.
- Calendario card (riga 335-336): idem `const { date, time } = formatJuventusDateTime(m.date)`.
- (Cerco eventuali altri callsite con `new Date(...).toLocaleTimeString` o `formatDateIT` nelle pagine Juventus.)

#### C. Patch `src/pages/Index.tsx` (sezione Juventus, riga 78-89)

Stessa sostituzione: la stringa orario del prossimo match Juventus passa da `new Date(nextMatch.date).toLocaleTimeString(...)` a `formatJuventusDateTime(nextMatch.date)`.

#### D. Patch `supabase/functions/sports-football/index.ts`

`extractJuventusMatches` riga 175: la `dateKey` per lookup broadcaster diventa la **data nel fuso Europe/Rome**, non UTC.

```
const romeDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(match.date));
broadcaster = broadcasterMap[`date:${romeDateKey}`] || broadcasterMap[String(roundNum)] || null;
```

Coerentemente, la chiave costruita lato `fetchBroadcasterMap` riga 138-141 da `m.matchDateUtc` viene anch'essa convertita in data Roma. Risultato: i due lati usano la stessa nozione di "giorno della partita" (Roma), eliminando potenziali drift se Sky/Lega cambiassero schema.

#### E. Test

Nuovo file `src/lib/dateUtils.juventus.test.ts` (estende `dateUtils.test.ts` esistente):

1. `toRomeDate` accetta ISO con `Z` → `Date` valido.
2. `toRomeDate` accetta ISO con offset `+01:00` → `Date` valido equivalente.
3. `toRomeDate` accetta ISO **naive senza offset** → trattato come UTC (verificato confrontando con la versione `Z`).
4. `toRomeDate` rifiuta input invalidi → `null`.
5. `formatJuventusDateTime` per `2026-04-21T19:45:00Z` → `{ date: "21/04/2026", time: "21:45", full: "21/04/2026 21:45" }` (Roma è UTC+2 in aprile).
6. `formatJuventusDateTime` per stringa naive `2026-04-21T19:45:00` → stesso risultato del caso `Z` (proof della normalizzazione).
7. `formatJuventusDateTime` per `2026-01-15T19:45:00Z` (inverno, UTC+1) → `time: "20:45"`.
8. `formatJuventusDateTime(null)` → `{ date: "—", time: "", full: "—" }`.
9. Edge case mezzanotte: `2026-04-21T23:30:00Z` (= 22 aprile 01:30 Roma) → `date: "22/04/2026"`, `time: "01:30"` (verifica conversione data + ora).

Edge function `supabase/functions/sports-football/index.test.ts` (nuovo): mock `extractJuventusMatches` con un `match.date` `2026-04-21T23:30:00Z` e un `broadcasterMap` con chiave `date:2026-04-22` → broadcaster trovato. Senza il fix, la chiave UTC sarebbe `2026-04-21` e il match fallirebbe.

#### F. Lint guard (opzionale, non bloccante)

Estensione minima di `scripts/check-italian-ui.mjs` (oppure nuovo `scripts/check-rome-tz.mjs` invocato in CI). Cerca pattern fragili nelle pagine Juventus:

- `toLocaleTimeString(` o `toLocaleDateString(` su variabili tipiche (`m.date`, `nextMatch.date`) **senza** `timeZone: "Europe/Rome"` nell'argomento options.
- Suggerisce: "Usa `formatJuventusDateTime` da `@/lib/dateUtils`."
- Whitelist le helper centralizzate (`dateUtils.ts`).

Implementazione: regex semplice scan su `src/pages/JuventusPage.tsx`, `src/pages/Index.tsx`, `src/components/home/**`. Se ne trova, exit 1 con messaggio. Aggiunto come step `npm run check:tz-juventus` nel workflow CI esistente accanto a `check:italian`.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/lib/dateUtils.ts` | EDIT | Aggiungere `toRomeDate(input)` (naive→UTC), `formatJuventusDateTime(input)`. Refactor interno `formatDateIT` per usare `toRomeDate`. Comportamento esterno invariato per call esistenti. |
| `src/lib/dateUtils.test.ts` | EDIT | Aggiungere blocchi di test per `toRomeDate` e `formatJuventusDateTime` (9 casi: Z/offset/naive/null/invalido/inverno/estate/mezzanotte). |
| `src/pages/JuventusPage.tsx` | EDIT | 2 callsite (card "Prossima Partita" + card calendario) sostituiti da `formatJuventusDateTime`. |
| `src/pages/Index.tsx` | EDIT | Sezione Juventus prossimo match → `formatJuventusDateTime`. |
| `supabase/functions/sports-football/index.ts` | EDIT | `dateKey` broadcaster calcolata in Europe/Rome (sia in `extractJuventusMatches` sia in `fetchBroadcasterMap`). Garantisce coerenza semantica "giorno = giorno italiano". |
| `supabase/functions/sports-football/index.test.ts` | NEW | Test Deno: lookup broadcaster con match a cavallo mezzanotte UTC trova la chiave Roma corretta. |
| `scripts/check-rome-tz.mjs` | NEW | Lint guard: vieta `toLocaleTimeString/toLocaleDateString` senza `timeZone: "Europe/Rome"` nei file Juventus/Home; suggerisce helper. |
| `package.json` | EDIT | Nuovo script `"check:tz-juventus": "node scripts/check-rome-tz.mjs"`. |
| `.github/workflows/ci-pr-main.yml` (e/o `ci-develop.yml`) | EDIT | Step `npm run check:tz-juventus` accanto a `npm run check:italian`. |
| `changelog.md` | EDIT | `### Changed`: tutte le date Juventus normalizzate a Europe/Rome con helper centralizzato `formatJuventusDateTime`. `### Fixed`: data broadcaster lookup ora basata su data Roma (no più drift mezzanotte UTC). `### Added`: lint guard `check:tz-juventus`. |
| `AGENTS.md` | EDIT | Aggiungere sezione "Fuso orario": tutte le date sportive devono essere visualizzate in Europe/Rome; usare gli helper di `dateUtils.ts`. |

### Cosa NON cambia

- Schema risposta backend `sports-football`: campi e formato date invariati (continuiamo a forwardare la stringa originale Sky).
- Componenti UI esistenti, layout, route, hook React Query.
- Altre pagine sport (F1, MotoGP, Sinner): l'helper resta a portata se in futuro vorremo estenderlo lì, ma in questo ticket interveniamo solo su Juventus come richiesto.
- `EventCountdown` (già usa `Date.now()` vs ISO, indipendente dal fuso visualizzato).
- Nessuna nuova dipendenza npm.

### Rischi e mitigazioni

- **Politica naive→UTC potenzialmente sbagliata** se un provider sconosciuto pubblicasse mai naive in ora locale italiana: tutti i nostri provider attuali (Sky, Lega Serie A, Jolpica, Pulselive, motogp.com) usano UTC con `Z` esplicito (verificato curl precedenti). La policy UTC-by-default è quella standard ISO 8601 quando manca offset.
- **Refactor `formatDateIT` interno**: copertura test esistente garantisce no-regression sui call F1/MotoGP/Sinner.
- **Lint guard troppo aggressivo**: scope ristretto a 3 file/dir specifici; whitelisted `dateUtils.ts`.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-juventus` (nuovo).
2. Deploy `sports-football`.
3. `curl sports-football?action=calendar&season=2025` → schema risposta invariata; broadcaster ancora correttamente popolato.
4. Apertura preview con orologio device su fuso non-Europe (test manuale: dev tools → Sensors → location New York): orari Juventus restano Europe/Rome (es. 20:45 inverno per match `19:45:00Z`), non si convertono a EST.
5. Test cassa mezzanotte: match Sky con `date: 2026-04-21T23:30:00Z` → UI Juventus mostra `22/04/2026 · 01:30`, broadcaster lookup trova la chiave corretta.

### Checklist post-edit

1. `toRomeDate` e `formatJuventusDateTime` esportati da `dateUtils.ts`.
2. Tutti i callsite date Juventus nel frontend usano l'helper centralizzato.
3. Backend `sports-football` calcola `dateKey` broadcaster in Europe/Rome.
4. Test Vitest e Deno verdi (9 nuovi casi unit + 1 integration).
5. Lint guard `check:tz-juventus` integrata in CI.
6. `changelog.md`, `AGENTS.md` aggiornati.
7. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

