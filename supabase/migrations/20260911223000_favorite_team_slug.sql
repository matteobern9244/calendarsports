-- La squadra preferita si memorizza come slug, non come nome.
--
-- La colonna e' nata dietro una casella di testo libero, con default
-- 'Juventus': un nome da mostrare, non un identificatore. Da ora lo slug e'
-- cio' che entra nelle URL, nelle chiavi di cache e nel parametro `team`
-- delle edge function, quindi la colonna deve contenere la stessa cosa che
-- contiene il codice. Il default vale anche per le righe nuove, che
-- `handle_new_user` inserisce senza toccare questo campo.
--
-- **Niente CHECK sull'elenco delle squadre.** Congelerebbe nel database una
-- lista che cambia a ogni promozione: dopo una retrocessione la riga di chi
-- tifa la squadra retrocessa diventerebbe non aggiornabile, e un vincolo che
-- impedisce di cambiare preferenza e' peggio di un valore inatteso.
--
-- Questo UPDATE sistema il caso reale — lo stesso nome con le maiuscole — e
-- non prova a mappare alias o forme estese: per farlo servirebbe una terza
-- copia dell'elenco squadre, che e' esattamente cio' che il guardiano fra
-- `src/lib/serieATeams.ts` e `supabase/functions/_shared/serieATeams.ts`
-- esiste per impedire. Quello che resta fuori non e' un problema: in lettura
-- passa comunque da `resolveTeam`, che e' totale.
--
-- Rieseguibile: il default e' idempotente e l'UPDATE non tocca le righe gia'
-- normalizzate. Su un database vuoto non fa niente.

ALTER TABLE public.profiles
  ALTER COLUMN favorite_team SET DEFAULT 'juventus';

UPDATE public.profiles
SET favorite_team = lower(btrim(favorite_team))
WHERE favorite_team IS DISTINCT FROM lower(btrim(favorite_team));
