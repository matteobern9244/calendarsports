---
description: Fuso Europe/Rome e lingua italiana nelle pagine e nei componenti.
globs:
  - src/pages/**
  - src/components/**
  - src/lib/dateUtils.ts
---

# Tempo e lingua

Leggi [`docs/agent-playbook/data-sources-and-time.md`](../../docs/agent-playbook/data-sources-and-time.md)
prima di toccare date, orari o testi mostrati all'utente.

Promemoria: un ISO senza `Z` vale UTC, e questo deve valere sia quando formatti
sia quando confronti. `new Date(stringa)` legge l'orario come ora locale e sfasa
il conto alla rovescia rispetto a quello che l'utente vede scritto accanto. La
UI e' in italiano, tranne `STREAMING` e `CALENDAR EVENTS`.

I controlli eseguibili sono `bun run check:tz-juventus` e
`bun run check:italian`, non questa sintesi.
