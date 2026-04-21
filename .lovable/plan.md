

## Fix: ogni partita Juventus mostra i propri dati nel dettaglio

### Diagnosi (verificata)

Causa unica e chiara: **il payload del calendario non contiene un campo `id`**. Verificato con curl reale su `sports-football?action=calendar`: ogni elemento ha `homeTeam`, `awayTeam`, `date`, `link`, `competition`, `matchday`, ecc. — **nessun `id`**. Conseguenza:

1. In `JuventusPage.tsx` il link `to={\`/juventus/partite/${m.id}\`}` produce sempre `/juventus/partite/undefined` per tutte le card.
2. In `JuventusMatchPage.tsx` la funzione `findMatch` esegue `String(m?.id) === matchId` con `matchId = "undefined"` e `String(undefined) === "undefined"` → **true**: matcha il **primo** elemento del calendario, che è **Juventus–Parma giornata 1**.

Per questo l'utente vede sempre la stessa partita.

Il piano precedente assumeva l'esistenza di `match.id` (`"id":"2558520"`), ma questa assunzione era errata: il widget Sky espone l'id all'interno della HTML upstream, ma `extractJuventusMatches` non lo estrae nè lo restituisce.

### Soluzione

Introdurre uno **slug stabile e unico per partita** derivato dai dati reali già presenti nel payload (no nuovi endpoint, no nuovi scraping). Il candidato ideale è `match.link`: ogni partita Sky ha un URL univoco con squadra+squadra+giornata (es. `.../serie-a/partite/2025/giornata-1/juventus-parma/risultato-gol`). In assenza di `link`, fallback su una composizione deterministica `competition-matchday-home-away-yyyymmdd`.

#### A. Backend `supabase/functions/sports-football/index.ts`

In `extractJuventusMatches`, calcolare un campo `id` deterministico per ogni match e includerlo nel payload:

```ts
function buildMatchId(match: any, competitionName: string): string {
  // Priorità 1: slug dall'URL Sky (univoco, leggibile, stabile)
  if (match.link) {
    const m = String(match.link).match(/partite\/(\d{4})\/([^/]+)\/([^/]+)/);
    if (m) {
      // es: "2025-giornata-1-juventus-parma"
      return `${m[1]}-${m[2]}-${m[3]}`.toLowerCase();
    }
  }
  // Priorità 2: composizione deterministica
  const home = String(match.home?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const away = String(match.away?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dateKey = romeDateKeyOf(match.date) ?? 'unknown';
  const comp = competitionName.toLowerCase().replace(/\s+/g, '-');
  return `${comp}-${dateKey}-${home}-vs-${away}`;
}
```

Aggiungere `id: buildMatchId(match, competitionName)` nell'oggetto `matches.push({...})`. Nessun altro campo cambia, nessun client esistente si rompe (tutti i call site leggono per nome, non per ordine).

#### B. Frontend `src/pages/JuventusPage.tsx`

Sostituire `to={\`/juventus/partite/${m.id}\`}` con `to={\`/juventus/partite/${encodeURIComponent(m.id)}\`}` (lo slug può contenere caratteri "sicuri" ma `encodeURIComponent` è policy difensiva). Stessa modifica per la card "Prossima Partita" (riga 152).

Rimuovere il `key={i}` indice-based dei card calendario e usare `key={m.id}` (più stabile per React reconciliation).

#### C. Frontend `src/pages/JuventusMatchPage.tsx`

Modificare `findMatch` per:

1. Decodificare `matchId` con `decodeURIComponent`.
2. Confrontare `String(m?.id) === decodedId` come oggi.
3. **Guard contro id mancante**: se `m?.id == null` o `String(m?.id) === "undefined"`, escludere dal match (no più "primo elemento vince").

```ts
function findMatch(calendar: PaginatedCalendar | undefined, matchId: string) {
  if (!calendar) return null;
  return calendar.items.find((m: any) => {
    if (m?.id == null) return false;
    return String(m.id) === matchId;
  }) ?? null;
}
```

Nel componente, decodificare `matchId` una volta:
```ts
const decodedMatchId = useMemo(() => {
  try { return decodeURIComponent(matchId); } catch { return matchId; }
}, [matchId]);
```
e passarlo a `findMatch` invece di `matchId` grezzo.

#### D. Test edge function

Aggiornare/estendere `supabase/functions/sports-football/index.test.ts`:

- Mock di `match.link = "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-1/juventus-parma/risultato-gol"` → `id === "2025-giornata-1-juventus-parma"`.
- Mock senza `link` → `id` composto (`serie-a-2025-08-24-juventus-vs-parma`).
- Verifica che due partite diverse generino id diversi.

#### E. Documentazione

- `changelog.md` → `### Fixed`: il dettaglio partita Juventus mostrava sempre la stessa partita (Juventus–Parma) perché il payload non includeva `id`. Aggiunto slug deterministico per match.
- `AGENTS.md` (sezione `Mappa funzionale rapida` per `sports-football`) → menzionare che il payload include ora `id` slug derivato da `link` Sky.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/sports-football/index.ts` | EDIT | Helper `buildMatchId` + campo `id` aggiunto al payload di ogni match in `extractJuventusMatches`. |
| `supabase/functions/sports-football/index.test.ts` | EDIT | Test per `buildMatchId`: priorità `link`, fallback deterministico, unicità tra match diversi. |
| `src/pages/JuventusPage.tsx` | EDIT | Link card "Prossima" e calendario usano `encodeURIComponent(m.id)`. `key={m.id}` invece di `key={i}`. |
| `src/pages/JuventusMatchPage.tsx` | EDIT | `findMatch` ignora item senza `id`. `matchId` decodificato via `decodeURIComponent` prima del confronto. |
| `changelog.md` | EDIT | `### Fixed`: detail partita Juventus mostrava sempre la prima partita. |
| `AGENTS.md` | EDIT | Nota su `id` slug nel payload `sports-football`. |

### Cosa NON cambia

- Nessun nuovo endpoint, nessun nuovo scraping, nessuna nuova dipendenza.
- Schema risposta backretrocompatibile (campo aggiunto, mai rimosso/rinominato).
- UI, layout, route, hook React Query invariati.
- Nessun impatto su `Index.tsx`, F1, MotoGP, Sinner.
- Branch policy invariata: lavoro su `develop`, PR verso `develop`, assegnata `@matteobern9244`.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-juventus`.
2. Deploy `sports-football`.
3. `curl .../sports-football?action=calendar&season=2025` → ogni item include `id` non-null e univoco; due partite diverse hanno id diversi.
4. Apertura preview `/juventus`:
   - Click su Juventus–Parma → URL `/juventus/partite/2025-giornata-1-juventus-parma`, dettaglio mostra Juventus–Parma.
   - Click su Genoa–Juventus → URL diverso, dettaglio mostra Genoa–Juventus reale.
   - Click su Juventus–Borussia Dortmund (CL) → dettaglio mostra Juventus–Borussia Dortmund.
   - Click sulla card "Prossima Partita" → mostra la partita corretta (non più Juventus–Parma).
5. URL "vecchi" tipo `/juventus/partite/undefined` → mostrano correttamente "Partita non trovata" (grazie alla guard in `findMatch`), non più la prima partita.

### Checklist post-edit

1. Backend `sports-football` deploya e include `id` per ogni match.
2. Slug derivato da `link` Sky quando disponibile, fallback deterministico altrimenti.
3. `JuventusPage` linka correttamente alla pagina dettaglio per ogni partita.
4. `JuventusMatchPage` mostra i dati della partita selezionata, non più del primo elemento.
5. Guard contro `id` mancante: nessun "match-by-undefined" possibile.
6. Test edge verde.
7. `changelog.md` aggiornato con la fix.
8. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

