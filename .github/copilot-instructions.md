# GitHub Copilot per calendarsports

- Usa `AGENTS.md` in root come fonte normativa primaria del repository.
- Tratta `main` come branch sensibile per il possibile sync GitHub <-> Lovable.
- Non suggerire push diretti o workflow automatici su `main` come default.
- Per modifiche umane, assumi sempre flusso feature branch -> `develop` e PR
  separata `develop` -> `main`.
- Quando una PR verso `develop` o `main` e' eleggibile, mantieni `auto-merge`
  attivo con metodo `squash` invece di richiedere un merge manuale finale, ma
  non trattarla come mergiabile prima che i workflow PR pertinenti siano verdi.
- Non proporre il ripristino della Branch protection classica su `main` se la
  Ruleset moderna e' gia' la fonte unica di protezione.
- Non assumere che `main` debba avere gate di `pull_request` o
  `required_status_checks` nella Ruleset: su questo repository il sync diretto
  di Lovable ha precedenza e richiede una Ruleset minima compatibile.
- Prima di proporre modifiche, leggi almeno `src/App.tsx`, `src/pages/*`,
  `src/hooks/useSportsData.ts`, `src/lib/api/sportsApi.ts` e
  `supabase/functions/*`.
- Preserva stack e architettura reali: React, Vite, TypeScript, Tailwind,
  shadcn/ui, Radix, React Query, `BrowserRouter`, Supabase Edge Functions.
- Non migrare stack, router, React Query o integrazione Supabase senza una
  ragione forte e spiegata.
- Distingui sempre tra dati da API pubbliche, scraping, fallback statici e
  dataset hardcoded.
- Non presentare come fonte live cio' che nel codice e' statico o manuale.
- Quando una feature dipende da scraping, dichiaralo esplicitamente.
- Se cambi payload o shape backend, considera l'impatto su hook React Query,
  pagine sportive e Home aggregata.
- Tratta scraping, parsing HTML, mapping loghi e foto e fallback stagionali
  come aree fragili.
- Non cambiare segreti, file env, progetto Supabase, deploy o integrazione
  Lovable senza richiesta esplicita.
- Se modifichi documentazione, mantienila allineata a fonti dati reali,
  workflow Git e relazione con Lovable.
- Se rispondi o pianifichi lavoro, separa fatti verificati, ipotesi e raccomandazioni.
- Non dichiarare una modifica come completata o risolta senza verifica reale.
