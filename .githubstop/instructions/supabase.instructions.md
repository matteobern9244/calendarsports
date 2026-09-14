---
applyTo: "supabase/functions/**/*.ts"
---

# Istruzioni Supabase

- Tratta ogni funzione edge come adattatore fragile tra provider esterni e frontend.
- Non spacciare dati statici, mapping manuali o fallback come dati live o ufficiali.
- Quando usi scraping o parsing HTML, assumi che il provider possa cambiare
  markup o shape senza preavviso.
- Non rimuovere fallback o mapping statici senza verificare il formato reale
  dei dati e l'impatto stagionale.
- Se cambia il payload di una funzione, verifica il client in
  `src/lib/api/sportsApi.ts`, gli hook in `src/hooks/useSportsData.ts` e le
  pagine coinvolte.
- Non cambiare segreti, env, progetto Supabase, rate limiting o modalita' di
  deploy senza richiesta esplicita.
- Esplicita sempre se una sezione backend dipende da scraping, fallback o
  dataset hardcoded.
