---
description: Da dove si importa il client Supabase e come si parla alle edge function.
globs:
  - src/lib/**
  - src/hooks/**
  - src/integrations/**
---

# Client Supabase e confine con le edge function

Leggi [`docs/agent-playbook/architecture-and-boundaries.md`](../../docs/agent-playbook/architecture-and-boundaries.md)
prima di toccare il trasporto o gli hook di dati.

Promemoria: il client si importa solo da `@/lib/supabaseClient`. Il file
auto-generato, senza variabili d'ambiente iniettate, produce richieste che
rispondono HTML con stato 200 e lasciano React Query in caricamento per sempre.
Il retry vive in un livello solo, dentro `sportsApi.ts`.

Il controllo eseguibile e' la regola `no-restricted-imports` in
`eslint.config.js`, non questa sintesi.
