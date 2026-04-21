---
applyTo: "src/**/*.ts,src/**/*.tsx,tailwind.config.ts,vite.config.ts"
---

# Istruzioni Frontend

- Preserva la natura SPA React/Vite del progetto.
- **Lingua UI: italiano obbligatorio.** Tutta l'UI deve essere in italiano.
  Uniche eccezioni: `STREAMING` (nome sezione) e `CALENDAR EVENTS` (nome app).
  Nomi propri (squadre, atleti, competizioni, broadcaster, provider) restano
  nella forma ufficiale. Sigle tecniche (ATP, WTA, GP, PL1, TMDB, RAI, Pos,
  Pts, ecc.) non sono "inglese". Niente stringhe inglesi in placeholder,
  `aria-label`, `sr-only`, toast, error message o titoli pagina.
- Mantieni `BrowserRouter`, React Query e il data flow attuale salvo
  richiesta esplicita o motivazione tecnica forte.
- Non cambiare naming di route, struttura delle pagine sportive o UI generale
  senza richiesta esplicita.
- Se tocchi una sezione sportiva, valuta l'impatto sulla Home in `src/pages/Index.tsx`.
- Se cambia il contratto dati atteso dal frontend, verifica
  `src/hooks/useSportsData.ts` e `src/lib/api/sportsApi.ts`.
- Evita refactor che introducono un nuovo framework, un nuovo layer di stato
  o un diverso pattern di routing.
- Mantieni chiara la distinzione tra dati live, scraping, fallback e
  contenuti statici mostrati in UI.
