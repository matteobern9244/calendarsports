
## Piano: Rebrand "CALENDAR EVENTS" + bump versione 2.0.0 + aggiornamento docs

### 1. Rebrand UI → "CALENDAR EVENTS"

**`src/components/layout/Header.tsx`**
- Logo testo: cambiare `<span class="text-gold-gradient">Calendar</span> <span>Sports</span>` → `<span class="text-gold-gradient">Calendar</span> <span>Events</span>`.
- Icona logo: sostituire `Trophy` (lucide) con `CalendarDays` per coerenza col nome generico "Events" (mantenendo il box gold-gradient e dimensioni h-9 w-9).

**`src/components/layout/Layout.tsx`**
- Footer: testo `Calendar Sports Events` → `CALENDAR EVENTS · v{APP_VERSION}` mantenendo `font-heading tracking-wider uppercase`.
- Importare versione da costante centralizzata (vedi §2).

**`index.html`**
- `<title>`: `Calendar Events — Sinner, Juventus, F1, MotoGP, Streaming`
- `<meta name="description">`: aggiornare a "Segui eventi sportivi (Sinner, Juventus, F1, MotoGP) e palinsesti TV / nuove uscite streaming in un'unica app".
- `<meta name="author">`: `Calendar Events`
- `og:title`, `twitter:title`, `og:description`, `twitter:description`: stessa copy.

### 2. Versione 2.0.0 visibile

**`package.json`**
- `"version": "2.0.2"` → `"2.0.0"` (come richiesto esplicitamente dall'utente, anche se è un downgrade rispetto al 2.0.2 corrente — segnalare nel changelog come "rebrand reset").

**Nuovo file `src/lib/version.ts`**
```ts
export const APP_VERSION = "2.0.0";
export const APP_NAME = "Calendar Events";
```
Un'unica fonte di verità, importata da `Layout.tsx` (footer) ed eventualmente in futuro da `Header.tsx`.

### 3. Aggiornamento documentazione

**`README.md`**
- Titolo + intro: rinominare "Calendar Sports" → "Calendar Events".
- Versione applicativa: `2.0.2` → `2.0.0`.
- Sezione sezioni UI: già menziona Streaming, mantenere lista (Home, Streaming, Sinner, Juventus, F1, MotoGP).
- Aggiungere nota: "il footer mostra la versione corrente da `src/lib/version.ts`".

**`changelog.md`**
- Nuova sezione `## [2.0.0] - 2026-04-19` (sopra la 2.0.2 esistente, con nota esplicita "rebrand reset: la numerazione torna a 2.0.0 per marcare il cambio identità prodotto da 'Calendar Sports' a 'Calendar Events'; le voci 2.0.0/2.0.1/2.0.2 storiche restano come archivio sotto").
- Voci da consolidare nella nuova 2.0.0 (raccolte dall'`[Unreleased]` corrente + ultime modifiche di sessione non ancora registrate):
  - **Added**:
    - Rebrand applicazione: nome "Calendar Events", icona `CalendarDays` nell'header, footer "CALENDAR EVENTS · v2.0.0".
    - Costante `src/lib/version.ts` (`APP_VERSION`, `APP_NAME`).
    - Sezione **Streaming** completa (TV stasera + Nuove uscite) con edge functions `streaming-tv` e `streaming-releases`.
    - Componente dedicato `src/components/home/TonightTvList.tsx` (estratto da `Index.tsx` per ridurre complessità).
    - Badge genere + durata programma in "Stasera in TV" + utility `formatDuration` in `src/lib/dateUtils.ts` con test unitari (edge: 0, NaN, 1h esatta).
    - Etichette famiglia mobile sopra separatori oro nella scheda "Stasera in TV", con icone Lucide (`Radio`, `Tv`, `Trophy`, `Film`, `Compass`).
    - Test E2E Playwright per separatori e label famiglia mobile (mock `streaming-tv` in `e2e/support/mockSportsApi.ts`).
    - Sportitalia nella famiglia "Sport" e whitelist generi estesa.
    - Suite GitHub Copilot repo-local + dependabot + guardrail auto-merge vs Copilot review.
  - **Changed**:
    - Footer semplificato a "CALENDAR EVENTS · v2.0.0".
    - `package.json` version → 2.0.0 (rebrand reset).
    - Metadati `index.html` (title/description/OG/Twitter) aggiornati.
  - **Fixed**: copertura palinsesti famiglia Sport (audit 41 slug 2026-04-19), bundle prod env injection (riportare voce 2.0.2).
  - **Note operative**: rebrand puramente cosmetico, nessun impatto su routing, fonti dati, edge functions, secrets, branch policy o sync Lovable↔GitHub.
- Svuotare `[Unreleased]` (resta header vuoto pronto per prossime modifiche).

**`AGENTS.md`**
- Sezione "Contesto del progetto": sostituire "Applicazione web sportiva" → "Applicazione web di eventi sportivi e streaming". Nessuna altra modifica strutturale (le regole operative restano identiche).

**`.github/copilot-instructions.md`** (se contiene il nome prodotto)
- Verificare e aggiornare eventuali occorrenze "Calendar Sports" → "Calendar Events".

### 4. File NON toccati (esplicito)
- `supabase/functions/*`, `supabase/config.toml`, `.env*`, `src/integrations/supabase/*`, `src/lib/supabaseClient.ts`, lockfile, workflow GitHub, branch policy.
- Routing e nomi route invariati (`/sinner`, `/juventus`, ecc.).
- Nessuna modifica a fonti dati o edge functions.

### 5. Ordine di esecuzione
1. Crea `src/lib/version.ts`.
2. Aggiorna `Header.tsx` (logo + icona).
3. Aggiorna `Layout.tsx` (footer con versione).
4. Aggiorna `index.html` (title + meta).
5. Bump `package.json` → 2.0.0.
6. Aggiorna `README.md`.
7. Aggiorna `changelog.md` con sezione 2.0.0 consolidata.
8. Aggiorna `AGENTS.md` (una riga).
9. Verifica visiva header/footer desktop+mobile.

### Rischi e note
- **Downgrade versione 2.0.2 → 2.0.0**: tecnicamente è un downgrade SemVer; viene fatto solo perché l'utente lo richiede esplicitamente come "reset rebrand". Documentato chiaramente in changelog.
- Nessun rischio sync Lovable↔GitHub: solo file frontend + docs.
- `markdownlint` su `README.md`, `changelog.md`, `AGENTS.md` da rispettare.
