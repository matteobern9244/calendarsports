-- Le notifiche push seguono la squadra scelta e si spengono per sport.
--
-- Fino a qui una subscription non sapeva chi la avesse chiesta: il dispatcher
-- mandava a tutti la Juventus, la F1 e la MotoGP. Quattro colonne nuove, tutte
-- con un default che riproduce quel comportamento, cosi' le righe esistenti e
-- i client non ancora aggiornati non cambiano niente.
--
-- `team` e' uno slug, non un nome, come `profiles.favorite_team`, e come quella
-- e' senza CHECK: la whitelist vive nel codice (`_shared/serieATeams.ts`) e
-- cambia a ogni promozione. Rieseguibile su un database vuoto e su uno gia'
-- migrato.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS team text NOT NULL DEFAULT 'juventus',
  ADD COLUMN IF NOT EXISTS notify_football boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_f1 boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_motogp boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.push_subscriptions.team IS
  'Slug della squadra di Serie A seguita (whitelist nel codice). Le partite arrivano solo per questa.';
COMMENT ON COLUMN public.push_subscriptions.notify_football IS
  'Se ricevere le partite della squadra seguita.';
COMMENT ON COLUMN public.push_subscriptions.notify_f1 IS
  'Se ricevere le sessioni di Formula 1.';
COMMENT ON COLUMN public.push_subscriptions.notify_motogp IS
  'Se ricevere le sessioni di MotoGP.';
