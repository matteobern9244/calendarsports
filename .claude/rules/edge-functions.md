---
description: Fonti dati, cache e sicurezza delle edge function.
globs:
  - supabase/functions/**
  - supabase/migrations/**
---

# Edge function

Leggi [`docs/agent-playbook/data-sources-and-time.md`](../../docs/agent-playbook/data-sources-and-time.md)
e, per le migration, [`docs/SECURITY.md`](../../docs/SECURITY.md).

Promemoria: ogni funzione dichiara nel campo `meta.dataSource` se sta servendo
dati vivi o degradati, e non tutte le fonti sono API reali. Non togliere un
fallback senza aver capito da quale guasto e' nato, e non inventare dati quando
la fonte non li ha. Ogni parametro interpolato in una URL a monte va validato
prima. Le migration gia' applicate non si riscrivono: se ne aggiunge una
correttiva, e deve poter essere rieseguita su un database vuoto.

Il catalogo completo delle fonti e' in
[`docs/DATA_SOURCES.md`](../../docs/DATA_SOURCES.md).
