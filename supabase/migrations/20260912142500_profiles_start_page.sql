-- La pagina su cui si atterra aprendo l'applicazione, scelta dall'utente.
--
-- Sta nel profilo e non sul dispositivo perche' e' una preferenza di chi ha
-- effettuato l'accesso: chi non ce l'ha atterra sulla Home, che e' anche il
-- default della colonna.
--
-- I valori che il codice riconosce sono sette: 'home', 'calendario',
-- 'streaming', 'sinner', 'squadra', 'f1', 'motogp'. La voce 'squadra' non
-- memorizza un indirizzo ma una sezione: la pagina mostrata e' quella della
-- squadra preferita al momento, cosi' chi cambia squadra non resta con la
-- pagina iniziale puntata su quella vecchia.
--
-- **Niente CHECK sull'elenco**, per la stessa ragione gia' scritta in
-- `20260911223000_favorite_team_slug.sql`: un vincolo congela nel database
-- una lista che appartiene al codice, e aggiungere domani una sezione
-- vorrebbe dire una migration correttiva solo per poterla scegliere. La
-- difesa e' in lettura ed e' `resolveStartPage` in `src/lib/startPage.ts`,
-- che e' totale: qualunque valore inatteso torna a 'home'.
--
-- Rieseguibile: `IF NOT EXISTS` rende l'aggiunta idempotente, e su un
-- database vuoto la colonna nasce con il suo default senza toccare righe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS start_page TEXT NOT NULL DEFAULT 'home';
