-- Tutte le voci del menu' diventano nascondibili, non solo le tre sportive.
--
-- `show_sinner`, `show_f1` e `show_motogp` esistevano gia'. Si aggiungono le
-- quattro che mancavano — Home, Calendario, STREAMING e Squadra di calcio —
-- cosi' l'elenco delle preferenze copre l'intera intestazione invece di una
-- meta' scelta a suo tempo.
--
-- **Nascondere riguarda solo il menu'.** Nessuna di queste colonne rende
-- irraggiungibile una pagina: ogni indirizzo continua a rispondere, perche' un
-- link verso `/squadra/napoli` e' fatto per essere condiviso e deve funzionare
-- anche per chi quella voce l'ha tolta dal proprio menu'. Fino a questa
-- migration le tre sportive facevano anche la seconda cosa, tramite un
-- componente di rotta che da qui in poi non esiste piu'.
--
-- Colonne separate e non un JSONB, per restare nella forma che il resto del
-- profilo ha gia': ogni preferenza e' un campo, e le richieste possiedono
-- esattamente i campi che toccano.
--
-- Il default e' `true`: chi non ha mai aperto le preferenze continua a vedere
-- il menu' intero, che e' esattamente cio' che vedeva prima.
--
-- Rieseguibile: `IF NOT EXISTS` su ogni colonna, e su un database vuoto le
-- colonne nascono con il loro default senza toccare righe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_home       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_calendario BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_streaming  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_squadra    BOOLEAN NOT NULL DEFAULT true;
