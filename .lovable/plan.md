

## Stagione corrente automatica per ogni sport

### Obiettivo

Eliminare le preferenze stagione: ogni sport mostra sempre la sua **stagione attualmente in corso**, calcolata dinamicamente in base alla data odierna. Niente più selettori, niente più persistenza, niente più sezione "Stagioni predefinite" nel pannello Preferenze.

### Logica "stagione in corso" per sport

Tutto centralizzato in un nuovo helper `src/lib/currentSeason.ts`:

| Sport | Tipo calendario | Regola |
|---|---|---|
| **Sinner (tennis)** | Anno solare | Sempre `new Date().getFullYear()`. |
| **F1** | Anno solare | Sempre `new Date().getFullYear()`. |
| **MotoGP** | Anno solare | Sempre `new Date().getFullYear()`. |
| **Juventus (calcio)** | Stagione a cavallo | Se mese ≥ luglio (mese 6, 0-indexed) → stagione `anno/anno+1` → API key = `anno`. Altrimenti (gennaio-giugno) → stagione `anno-1/anno` → API key = `anno-1`. Esempio: aprile 2026 → `2025` (= Serie A 2025/26); agosto 2026 → `2026` (= 2026/27). |

API esposte:

```ts
export function getCurrentSinnerSeason(now?: Date): number;
export function getCurrentJuventusSeason(now?: Date): number;
export function getCurrentF1Season(now?: Date): number;
export function getCurrentMotoGPSeason(now?: Date): number;
```

L'argomento opzionale `now` serve solo per i test (default = `new Date()`).

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/lib/currentSeason.ts` | NEW | 4 funzioni pure documentate sopra. La regola Juventus usa cutoff luglio (consueto inizio stagione Serie A). |
| `src/lib/currentSeason.test.ts` | NEW | Casi: aprile 2026 Juve → 2025; agosto 2026 Juve → 2026; tennis/F1/MotoGP a varie date → sempre `getFullYear()`. |
| `src/hooks/useSeasonPreferences.ts` | DELETE | Hook non più necessario. |
| `src/components/common/SeasonSelector.tsx` | DELETE | Componente non più usato in nessuna pagina. |
| `src/pages/SinnerPage.tsx` | EDIT | Rimuovere `useSeasonPreferences` e `<SeasonSelector>`. Sostituire `seasons.sinner` con `getCurrentSinnerSeason()` (calcolato una volta in cima al componente). Rimuovere import `SeasonSelector`. |
| `src/pages/JuventusPage.tsx` | EDIT | Idem con `getCurrentJuventusSeason()`. Rimuovere `setSeason`, `<SeasonSelector>`, `useEffect` di reset pagina su cambio stagione (la stagione è ora costante per render). |
| `src/pages/Formula1Page.tsx` | EDIT | Idem con `getCurrentF1Season()`. |
| `src/pages/MotoGPPage.tsx` | EDIT | Idem con `getCurrentMotoGPSeason()`. |
| `src/pages/Index.tsx` | EDIT | Sostituire l'hard-coded `useJuventusCalendar(2025)` con `useJuventusCalendar(getCurrentJuventusSeason())`. Verificare che le chiamate next-event (`useSinnerNextEvent`, `useMotoGPNextEvent`, `useF1NextRace`) restino invariate (non dipendono da stagione). |
| `src/components/preferences/PreferencesPanel.tsx` | EDIT | Rimuovere completamente la sezione "Stagioni predefinite" (intera `<section aria-labelledby="pref-seasons">`). Rimuovere import `SeasonSelector`, `BrandIcons`, `useSeasonPreferences`, stato `savedKeys`, `flagSaved`, `handleSelect`, costante `SPORTS`. Mantenere solo la sezione "Aspetto" (toggle tema). Rimuovere il bottone footer "Ripristina" (non c'è più nulla da ripristinare). Aggiornare `SheetDescription` → "Personalizza il tema dell'interfaccia." |
| `src/pages/SinnerPage.test.tsx` | EDIT | Rimuovere `vi.mock("@/hooks/useSeasonPreferences", ...)` e relativi `mockSetSeason`. La pagina ora calcola la stagione da `currentSeason.ts`; eventualmente mockare quel modulo se necessario per stabilità del test (es. fissare l'anno). |
| `localStorage cleanup` | RUNTIME | Aggiungere in `src/main.tsx` (o early in `App.tsx`) una rimozione one-shot di `localStorage.removeItem("cse-seasons")` per pulire le preferenze obsolete degli utenti esistenti. |
| `changelog.md` | EDIT | `### Changed`: "Stagione automatica per ogni sport — Sinner/F1/MotoGP usano sempre l'anno solare corrente; Juventus usa la stagione Serie A in corso (cutoff luglio). Rimossi selettori stagione dalle pagine sportive e sezione 'Stagioni predefinite' dal pannello. Le preferenze stagione precedentemente salvate vengono pulite automaticamente." `### Removed`: "Hook `useSeasonPreferences`, componente `SeasonSelector`, sezione preferenze stagioni." |

### Cosa NON cambia

- API edge functions (continuano a ricevere il parametro `season` come prima, solo ora calcolato dinamicamente).
- Hook React Query (`useF1Calendar`, `useJuventusCalendar`, `useSinnerSchedule`, ecc.) e relative chiavi cache.
- Dataset, scraping, fallback statici lato Edge Functions.
- Pannello Preferenze come `Sheet`, toggle tema chiaro/scuro, icona ingranaggio in header.
- Tutte le route, navigazione, layout, branding.
- Versione app, lingua italiana, branch policy.

### Validazione

1. Apertura `/sinner` ad oggi (aprile 2026) → query con `season=2026`, nessun selettore visibile.
2. Apertura `/juventus` ad aprile 2026 → query con `season=2025` (Serie A 2025/26 in corso). Spostando l'orologio simulato a settembre 2026 → `season=2026`.
3. Apertura `/formula1` e `/motogp` → query con `season=2026`.
4. Apertura pannello Preferenze → solo sezione "Aspetto" con toggle tema. Niente stagioni, niente "Ripristina".
5. Home `/` → eventi Juventus calcolati con stagione corrente Serie A (non più hard-coded 2025).
6. Utente esistente con `localStorage["cse-seasons"]` valorizzato → al primo caricamento la chiave viene rimossa, nessun effetto sulla UI.
7. `npm run check:italian` exit 0; `npm run lint`, `npm run build`, `npm run test` invariati (test Sinner aggiornato).
8. `grep -rn "useSeasonPreferences\|SeasonSelector" src/` → 0 occorrenze.

### Checklist post-edit

1. Nessuna pagina sportiva mostra più il selettore stagione.
2. Pannello Preferenze contiene solo "Aspetto".
3. Helper `currentSeason.ts` coperto da test base.
4. `changelog.md` aggiornato con `Changed` + `Removed`.
5. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

