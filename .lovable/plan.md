

## Italianizzazione totale dell'app

### Direttiva da memorizzare

**Tutta l'interfaccia utente deve essere in lingua italiana. Le uniche eccezioni consentite sono:**
- `STREAMING` (nome di sezione di prodotto)
- `CALENDAR EVENTS` (nome dell'app)

Nomi propri (Jannik Sinner, Juventus, Formula 1, MotoGP, Sky Sport, Netflix, Prime Video, Disney+, HBO Max, Roland Garros, Wimbledon, US Open, Australian Open, ATP Finals, ecc.) restano nella loro forma ufficiale: non sono "inglese", sono nomi propri.

Termini tecnici universali del dominio (sigle: `ATP`, `WTA`, `GP`, `PL1/PL2/PL3`, `TMDB`, `RAI`) restano invariati: non sono testo "inglese da tradurre".

### Stringhe inglesi trovate da tradurre

Scansione completa di `src/`, `index.html`, `public/`. Risultati:

| File | Stringa attuale | Sostituzione |
|---|---|---|
| `src/pages/NotFound.tsx` | `Oops! Page not found` | `Pagina non trovata` |
| `src/pages/NotFound.tsx` | `Return to Home` | `Torna alla Home` |
| `src/pages/NotFound.tsx` (log) | `404 Error: User attempted...` | `Errore 404: tentativo di accedere a una rotta inesistente` |
| `src/components/ui/pagination.tsx` | aria `Go to previous page` + label `Previous` | `Vai alla pagina precedente` / `Precedente` |
| `src/components/ui/pagination.tsx` | aria `Go to next page` + label `Next` | `Vai alla pagina successiva` / `Successiva` |
| `src/components/ui/pagination.tsx` | aria `pagination` | `paginazione` |
| `src/components/ui/pagination.tsx` | sr-only `More pages` | `Altre pagine` |
| `src/components/ui/dialog.tsx` | sr-only `Close` | `Chiudi` |
| `src/components/ui/sheet.tsx` | sr-only `Close` | `Chiudi` |
| `src/components/ui/sidebar.tsx` | aria + sr-only `Toggle Sidebar` | `Apri/chiudi barra laterale` |
| `src/components/ui/sidebar.tsx` | title `Toggle Sidebar` | `Apri/chiudi barra laterale` |
| `src/components/ui/carousel.tsx` | sr-only `Previous slide` / `Next slide` | `Slide precedente` / `Slide successiva` |
| `src/components/ui/breadcrumb.tsx` | aria `breadcrumb`, sr-only `More` | `breadcrumb` (termine accettato in IT tecnico) → `percorso`, `Altro` |
| `src/components/sinner/PlayerHeader.tsx` | label `Best ranking` | `Miglior ranking` |
| `src/components/common/EventCard.tsx` | badge `LIVE` | `IN DIRETTA` |

Verificate e **già in italiano**: `Index.tsx`, `StreamingPage.tsx`, `SinnerPage.tsx`, `JuventusPage.tsx`, `Formula1Page.tsx`, `MotoGPPage.tsx`, `PreferencesPage.tsx`, `Header.tsx`, `TonightTvList.tsx`, `ReleaseDetailDialog.tsx`, `OfflineFallback.tsx`, `OfflineIndicator.tsx`, `ErrorBoundary.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx`, `TimezoneBadge.tsx`, `EventCountdown.tsx`, `useSyncAll.ts`, `manifest.webmanifest`, `index.html` (`<html lang="it">`, meta description in italiano, title contiene solo nomi propri di sezione).

### Cosa NON cambia

- Identificatori di codice (`type RangeId`, `value="all"`, query keys `streaming-tv`, ecc.): non sono UI, non si traducono.
- Commenti JSDoc in inglese nei file di codice: non visibili all'utente, fuori scope.
- Console.error / log tecnici (eccezione: `NotFound.tsx` lo traduco perché è un mock di onboarding evidente).
- Nomi di file, route paths (`/sinner`, `/preferenze`, `/streaming`, `/formula1`, `/motogp`).
- Alt text già in italiano e quelli che usano nomi propri/template literal (es. `Bandiera ${iso}`).
- Sigle tecniche (PL1/PL2/PL3, Qual, Sprint, GP, Pos, G/V/N/P/DR/Pts, ATP, WTA, TMDB, RAI).
- Brand: `STREAMING`, `CALENDAR EVENTS`, Sky Sport, Netflix, Prime Video, Disney+, HBO Max, Mediaset, Discovery, RAI, Juventus, Formula 1, MotoGP, Jannik Sinner.

### Memorizzazione della direttiva

1. **Aggiungo regola nuova nella memoria progetto** creando `mem://constraints/italian-only` con:

   ```
   ---
   name: Italian-only UI policy
   description: All user-facing UI must be in Italian, only "STREAMING" and "CALENDAR EVENTS" allowed in English
   type: constraint
   ---
   Tutta l'interfaccia utente deve essere in italiano.
   Eccezioni consentite: "STREAMING" (sezione), "CALENDAR EVENTS" (nome app).
   Nomi propri (squadre, atleti, competizioni, brand) restano invariati nella loro forma ufficiale.
   Sigle tecniche universali (ATP, WTA, GP, PL1, TMDB, RAI) non sono "inglese da tradurre".
   Quando aggiungi nuovo testo UI, usalo già in italiano: niente stringhe inglesi nemmeno in placeholder, aria-label, sr-only, toast, error message.
   ```

2. **Aggiorno `mem://index.md` Core**: aggiungo la riga
   `Italian-only UI: solo "STREAMING" e "CALENDAR EVENTS" in inglese; nomi propri/sigle restano invariati.`
   (la regola "Italian-only UI" già esiste in forma generica nel Core attuale come "Italian-only UI" — la rendo esplicita ed enforce).

3. **Aggiorno `AGENTS.md`** (sezione "Regole di modifica"): aggiungo punto
   `- Tutta l'UI dell'app e' in italiano. Le uniche eccezioni autorizzate sono i token "STREAMING" (nome sezione) e "CALENDAR EVENTS" (nome app). Nomi propri di squadre, atleti, competizioni, broadcaster e provider restano nella loro forma ufficiale. Sigle tecniche (ATP, WTA, GP, TMDB, RAI, Pos, Pts, ecc.) non sono considerate "inglese". Vietato introdurre testo inglese in stringhe utente, placeholder, aria-label, sr-only, toast, error message o titoli pagina.`

4. **Aggiorno `.github/instructions/frontend.instructions.md`** con lo stesso vincolo, così Copilot/Codex lo applicano in IDE.

5. **`changelog.md`** sezione `### Changed` con voce "Italianizzazione totale UI: tradotti residui inglesi nei componenti shadcn (pagination, dialog, sheet, sidebar, carousel, breadcrumb), in `NotFound.tsx`, `PlayerHeader.tsx` (Best ranking → Miglior ranking) ed `EventCard.tsx` (badge LIVE → IN DIRETTA). Memorizzata la policy nei file di documentazione (`AGENTS.md`, frontend instructions, memoria progetto)."

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `src/pages/NotFound.tsx` | EDIT | Traduzione testo + console.error in italiano |
| `src/components/ui/pagination.tsx` | EDIT | Traduzione `Previous`, `Next`, aria-label, sr-only |
| `src/components/ui/dialog.tsx` | EDIT | sr-only `Close` → `Chiudi` |
| `src/components/ui/sheet.tsx` | EDIT | sr-only `Close` → `Chiudi` |
| `src/components/ui/sidebar.tsx` | EDIT | `Toggle Sidebar` → `Apri/chiudi barra laterale` |
| `src/components/ui/carousel.tsx` | EDIT | `Previous/Next slide` → `Slide precedente/successiva` |
| `src/components/ui/breadcrumb.tsx` | EDIT | aria `breadcrumb` (lasciato, termine accettato) + sr-only `More` → `Altro` |
| `src/components/sinner/PlayerHeader.tsx` | EDIT | `Best ranking` → `Miglior ranking` |
| `src/components/common/EventCard.tsx` | EDIT | badge `LIVE` → `IN DIRETTA` |
| `mem://constraints/italian-only` | NUOVO | Memoria di vincolo |
| `mem://index.md` | EDIT | Aggiunta riga Core sull'Italian-only |
| `AGENTS.md` | EDIT | Aggiunta regola "Lingua UI" in "Regole di modifica" |
| `.github/instructions/frontend.instructions.md` | EDIT | Aggiunto vincolo lingua italiana |
| `changelog.md` | EDIT | Voce dedicata in `### Changed` |

### Checklist post-edit

1. `/non-esiste`: pagina 404 in italiano.
2. `/streaming` (tab Nuove uscite con paginazione): pulsanti `Precedente` / `Successiva`.
3. `/sinner`: card profilo mostra `Miglior ranking` (non `Best ranking`).
4. Home, qualsiasi card con evento iniziato: badge `IN DIRETTA` (non `LIVE`).
5. Dialog "Dettaglio uscita streaming": pulsante chiudi con sr-only `Chiudi`.
6. `grep -ri "Previous\|Best ranking\|Page not found\|Toggle Sidebar\|>LIVE<" src/` → 0 risultati.
7. `npm run lint` + `npm run build` + `npm run test`.
8. `changelog.md` aggiornato.
9. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

