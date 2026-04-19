

User wants to add to the previous staseraintv.com plan:
1. Quick channel/family filters in the Home "Stasera in TV" banner
2. Full responsive behavior
3. README + changelog updates (already in plan, reconfirm)

Keep the plan concise and additive.

## Piano: estensione "Stasera in TV" Home + responsive + docs

Estende il piano già approvato (switch a `staseraintv.com` per scraping completo di tutte le famiglie). Aggiunge filtri rapidi user-friendly nella home e responsive verificato.

### 1. Filtri rapidi nella card "Stasera in TV" (Home)

In `src/pages/Index.tsx`:

- Sopra la lista degli highlights aggiungo una **toggle bar** orizzontale con chip selezionabili:
  - `Tutti` (default)
  - `Sky Sport`
  - `Sky Cinema`
  - `RAI`
  - `Mediaset`
  - `Discovery`
- Componente: riuso `ToggleGroup` shadcn (`src/components/ui/toggle-group.tsx`) con `type="single"`, default `"all"`.
- Stato locale `selectedFamily: "all" | StreamingFamilyId` (no URL state per la Home, è un widget compatto).
- I dati vengono già fetchati con `useQueries` su tutte e 5 le famiglie (dal piano precedente). Il filtro è puramente client-side: se `selectedFamily === "all"` mescolo tutto e mostro top 6 per orario; altrimenti filtro le righe della famiglia selezionata e mostro top 6.
- Ogni riga mantiene il badge canale per chiarezza.
- Empty state per famiglia: se la famiglia selezionata non ha dati → messaggio inline "Palinsesto non disponibile per <famiglia>" + suggerimento di tornare a "Tutti".

### 2. Responsive

Verifica esplicita su 3 viewport:
- **Mobile** (<640px): chip filtri scrollabili orizzontalmente con `overflow-x-auto` + `scrollbar-hide`, nessun wrap, tap target ≥ 40px. Righe highlights: orario + canale badge + titolo truncato a 1 riga.
- **Tablet** (640–1024px): chip su singola riga con wrap se necessario.
- **Desktop** (≥1024px): chip inline accanto al titolo "Stasera in TV" se c'è spazio, altrimenti sotto.

Layout righe highlights resta `flex items-center gap-3` con `min-w-0` + `truncate` sul titolo (già presente). Nessun nuovo breakpoint custom: solo classi Tailwind standard (`sm:`, `md:`, `lg:`).

### 3. Resto del piano (invariato, già approvato)

- Edge function `streaming-tv` riscritta con slug `staseraintv.com` per tutte le 5 famiglie.
- Parser regex `/^(\d{1,2}):(\d{2}) - (.+?)$/gm`.
- Cache 1h per `(slug, date)`.
- `StreamingPage.tsx`: rimozione disclaimer "solo Discovery", nuovo disclaimer "Fonte: staseraintv.com".

### 4. Documentazione

- **`README.md`**: aggiorno la sezione Streaming dichiarando:
  - Fonte reale: `staseraintv.com` (scraping pubblico, fragile per definizione).
  - Copertura: tutte e 5 le famiglie (Sky Sport, Sky Cinema, RAI, Mediaset, Discovery).
  - Home "Stasera in TV": filtri rapidi per famiglia, responsive.
- **`changelog.md`** sotto `[Unreleased]`:
  - `Added`: filtri rapidi per famiglia nella card "Stasera in TV" della Home.
  - `Changed`: scraping TV esteso a tutte le famiglie via `staseraintv.com` (sostituisce `guida.tv`).
  - `Note operative`: fonte di terze parti, può cambiare struttura senza preavviso.

### File toccati

- `supabase/functions/streaming-tv/index.ts` (slug staseraintv + parser nuovo)
- `src/pages/Index.tsx` (multi-famiglia + filtri rapidi + responsive)
- `src/pages/StreamingPage.tsx` (disclaimer)
- `README.md`
- `changelog.md`

### Verifica end-to-end

1. Deploy `streaming-tv` + curl su tutte e 5 le famiglie.
2. Home: chip "Tutti" mostra mix realistico; ogni chip famiglia filtra correttamente.
3. Resize 360px / 768px / 1280px: chip scrollabili su mobile, layout pulito.
4. `npm run lint` + `npm run build`.

### Vincoli rispettati

- Nessuna modifica a `src/integrations/supabase/*`, `supabase/config.toml`, env, secrets, branch policy.
- Nessuna nuova dipendenza.
- Fragilità dichiarata in UI, README, changelog.
- Nessun dato inventato: famiglie senza dati → empty state esplicito.

