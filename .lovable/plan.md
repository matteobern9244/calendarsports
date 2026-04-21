

## Sinner: passaggio a Wikipedia italiana come fonte primaria

### Verifica preliminare

Ho fatto fetch di `https://it.wikipedia.org/wiki/Jannik_Sinner` e confermato:

- L'infobox è diverso da quello inglese: etichette in **italiano** (`Altezza`, `Peso`, `Vittorie/sconfitte`, `Titoli vinti`, `Miglior ranking`, `Ranking attuale`).
- Ranking attuale: **1º** (matcha realtà). Miglior ranking: **1º (10 giugno 2024)**.
- Record carriera singolare: **345–88 (79.68%)**. Titoli vinti carriera: **27**.
- Altezza: **191 cm**. Peso: **77 kg** (presente sulla IT, assente sulla EN).
- Risultati Grande Slam con stato attuale: AO **V** (2024, 2025), RG **F** (2025), Wimbledon **V** (2025), US Open **V** (2024). Tour Finals **V** (2024, 2025).
- Stato "Statistiche aggiornate al **12 aprile 2026**".
- Foto principale aggiornata (US Open 2025): `https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Jannik_Sinner_US_Open_2025_(cropped).jpg/500px-Jannik_Sinner_US_Open_2025_(cropped).jpg`.
- Luogo nascita: **San Candido**, data **16 agosto 2001** (dal primo paragrafo, non dall'infobox).
- Coach: non in infobox IT — va estratto dal testo carriera o lasciato vuoto.

La pagina stagione `2026_Jannik_Sinner_tennis_season` **non ha equivalente IT** stabile (esiste solo l'inglese). Quindi:

- **Player info, ranking, palmarès Slam** → da Wikipedia IT.
- **Calendario tornei 2026 + match risultati** → continuano da Wikipedia EN (`2026_Jannik_Sinner_tennis_season`), perché non esiste fonte IT equivalente affidabile. Etichetta dichiarata.

### Cosa cambia

**1. `supabase/functions/sports-tennis/index.ts` — modifica mirata**

- Action `player-info`: cambio URL da `en.wikipedia.org/wiki/Jannik_Sinner` a `it.wikipedia.org/wiki/Jannik_Sinner`. Riscrivo il parser infobox sulle etichette italiane:
  - `altezza` → `height` (es. "191 cm")
  - `peso` → nuovo campo `weight` (es. "77 kg")
  - `vittorie/sconfitte` (singolare) → `careerRecord`
  - `titoli vinti` (singolare) → `careerTitles`
  - `miglior ranking` (singolare) → `careerHigh` + `careerHighDate`
  - `ranking attuale` (singolare) → `ranking`
- Aggiungo parser per la sezione "Risultati nei tornei del Grande Slam": estraggo `{ australianOpen, rolandGarros, wimbledon, usOpen }` con `{ best: 'V'|'F'|'SF'|'QF'|...|null, years: number[] }` e analoga per `tourFinals`.
- Estraggo data nascita + luogo dal primo paragrafo (regex su "(San Candido), 16 agosto 2001").
- Coach: tentativo regex sul testo "allenat[oa] da [Nome Cognome]"; se non trovato → `null`.
- Foto: hardcode al nuovo URL US Open 2025 (più recente di quello attuale 2024). Mantengo fallback `JS` se 404.
- "Statistiche aggiornate al": estraggo data → nuovo campo `statsUpdatedAt` (ISO).
- Source string: `"Wikipedia Italia (it.wikipedia.org)"`.
- Cache 30 min: invariata.
- Action `schedule`, `results`, `next-event`: invariati, continuano a leggere da `en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season` (dichiarato nel commento di intestazione: due fonti, IT per profilo, EN per stagione 2026).

**2. `src/components/sinner/PlayerHeader.tsx` — estensione campi**

- Aggiungo prop `weight?: string` mostrato in `<dl>` accanto ad `Altezza`.
- Aggiungo prop `slamResults?: { australianOpen, rolandGarros, wimbledon, usOpen, tourFinals }` e renderizzo una sezione compatta "Grande Slam" sotto le statistiche, con 5 chip: AO V·24·25, RG F·25, W V·25, US V·24, Finals V·24·25 (chip dorate per V, neutre per altri esiti).
- Aggiungo prop `statsUpdatedAt?: string` → footer cambia da "Fonte dati: …" a "Fonte: Wikipedia Italia · Statistiche aggiornate al 12 aprile 2026".
- Foto: nessuna modifica logica, solo passa il nuovo URL via payload.

**3. `src/hooks/useSportsData.ts` — type update**

- Estendo l'interfaccia di ritorno `useSinnerInfo` con `weight`, `slamResults`, `statsUpdatedAt`. `careerTitles`, `careerRecord`, `careerHigh` restano (ma ora con valori IT corretti, es. record 345-88 invece dei numeri parziali EN).
- `staleTime` invariato (30 min).

**4. `src/pages/SinnerPage.tsx` — pass-through**

- Inoltro i nuovi campi al `PlayerHeader`. Nessuna ristrutturazione.

**5. Documentazione**

- `README.md` sezione "Fonti dati" → tennis: "Wikipedia Italia (profilo, ranking, palmarès Slam) + Wikipedia EN (stagione 2026 match-by-match)". Dichiarazione esplicita della doppia fonte.
- `changelog.md` `### Changed`: profilo Sinner ora da Wikipedia Italia, foto aggiornata a US Open 2025, aggiunto peso e palmarès Slam visualizzato.

### Cosa NON cambia

- Stack, routing, hook React Query: invariati.
- Pagine F1/MotoGP/Juventus: invariate.
- Logica match/calendario 2026: invariata (resta Wikipedia EN, non esiste IT).
- Versione resta **2.1.0**.

### Limiti dichiarati

- Wikipedia IT non ha pagina stagione 2026 di Sinner → il calendario e i match restano da fonte EN. Doppia fonte = doppia superficie di rottura.
- Coach non è in infobox IT: estrazione da testo è fragile, in caso di fallimento il campo sparisce dalla UI invece di crashare.
- Latenza editoriale Wikipedia (24-48h) e cache 30 min: invariate.

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `supabase/functions/sports-tennis/index.ts` | EDIT | Cambio URL player-info a Wikipedia IT, parser infobox italiano, parser palmarès Slam, foto US Open 2025, campo `statsUpdatedAt` e `weight`. |
| `src/components/sinner/PlayerHeader.tsx` | EDIT | Aggiunti `weight`, `slamResults` (chip), `statsUpdatedAt` in footer. |
| `src/hooks/useSportsData.ts` | EDIT | Estensione tipi `useSinnerInfo`. |
| `src/pages/SinnerPage.tsx` | EDIT | Pass-through nuovi campi al `PlayerHeader`. |
| `README.md` | EDIT | Aggiornata sezione Fonti dati con doppia fonte tennis (IT profilo + EN stagione). |
| `changelog.md` | EDIT | `### Changed` voce dedicata. |

### Checklist post-edit

1. `/sinner`: foto Sinner US Open 2025 in alto a sinistra, ranking **#1**, footer "Statistiche aggiornate al 12 aprile 2026 · Fonte: Wikipedia Italia".
2. Card profilo mostra: Altezza 191 cm, Peso 77 kg, Mano destra, Nato a San Candido.
3. Sezione palmarès: AO V (24·25), RG F (25), W V (25), US V (24), Finals V (24·25).
4. Tab Risultati e Tornei: dati 2026 invariati (provenienza EN).
5. DevTools Network: chiamata `sports-tennis?action=player-info` ritorna `source: "Wikipedia Italia (it.wikipedia.org)"`.
6. Cache hit entro 30 min.
7. `npm run lint` + `npm run build` + `npm run test`.
8. Aggiornare `changelog.md` + `README.md`.
9. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

