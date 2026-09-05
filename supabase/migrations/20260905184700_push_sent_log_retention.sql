-- Migration correttiva: `push_sent_log` smette di crescere senza limite.
--
-- La tabella nasce nella 20260506073557 con un indice su `sent_at` e nessuno
-- che lo usi: niente retention, nessun DELETE da nessuna parte del progetto.
-- Con pochi iscritti non e' un problema oggi, ma e' una tabella che solo
-- cresce, alimentata da un job che gira ogni cinque minuti.
--
-- Le migration gia' applicate non si riscrivono: questa aggiunge.
--
-- ===========================================================================
-- PERCHE' TRENTA GIORNI, E NON TRE
-- ===========================================================================
--
-- La riga serve a due cose diverse, con due scadenze diverse.
--
-- 1. DEDUP, ed e' la ragione per cui la tabella esiste. Il dispatcher ha una
--    finestra di invio di sei minuti (`WINDOW_MS` in `push-dispatcher`) e gira
--    ogni cinque: due giri consecutivi vedono lo stesso evento, e il vincolo
--    `UNIQUE (subscription_id, event_id, lead_time)` e' cio' che impedisce il
--    doppione — la scrittura *e'* il controllo, vedi `dedupe.ts`.
--
--    Il dispatcher pero' guarda solo in avanti, e il `lead_time` fa parte
--    della chiave: un preavviso diverso sullo stesso evento e' una riga
--    diversa. Passata la finestra di sei minuti, quella riga non protegge
--    piu' niente. La scadenza vera del dedup si misura in minuti.
--
-- 2. TRACCIA di cosa e' stato mandato, che e' l'unico modo di rispondere a
--    «la notifica di quella partita e' partita?». Questa scadenza non e'
--    tecnica: e' quanto indietro si vuole poter guardare.
--
-- Trenta giorni sono quindi sovrabbondanti di ordini di grandezza per il
-- primo scopo, e ragionevoli per il secondo. La cancellazione non puo'
-- riaprire la porta a un doppione, perche' per farlo dovrebbe togliere una
-- riga la cui finestra e' ancora aperta, cioe' scritta meno di sei minuti fa.
--
-- NOTA, e non e' cio' che questa migration corregge: un evento rinviato
-- conserva il suo `event_id` mentre la data si sposta. La riga vecchia lo
-- sopprime finche' resta in tabella — con la retention, al massimo per
-- trenta giorni invece che per sempre.
--
-- ===========================================================================
-- COSA FA
-- ===========================================================================
--
--   * una cancellazione immediata, cosi' l'effetto non aspetta il primo giro
--     notturno;
--   * un job `pg_cron` giornaliero che la ripete.
--
-- Non crea nessuna funzione: il DELETE sta nel corpo del job. E' voluto — le
-- funzioni in `public` sono esattamente cio' che `docs/ROADMAP.md` chiede di
-- sorvegliare, perche' una funzione `SECURITY DEFINER` in uno schema esposto
-- sarebbe il trampolino che oggi manca per arrivare a `pg_net`. Il job gira
-- come `postgres`, che sulla tabella non ha bisogno di policy: `push_sent_log`
-- ha RLS attiva e nessuna policy, cioe' diniego totale per i ruoli client.
--
-- Il DELETE usa `idx_push_sent_log_sent_at`, che dal 6 maggio 2026 esisteva
-- senza che niente lo interrogasse.
--
-- ===========================================================================
-- RIESEGUIBILE
-- ===========================================================================
--
-- Su un database vuoto: la tabella c'e' gia' (20260506073557), la
-- cancellazione tocca zero righe e l'`unschedule` avviene solo se il job
-- esiste davvero. E' il difetto della 20260523084606, che cominciava con uno
-- `cron.unschedule` incondizionato e faceva fallire l'intera catena.
--
-- ===========================================================================
-- COME VERIFICARE, DOPO L'APPLICAZIONE
-- ===========================================================================
--
--   SELECT jobname, schedule, active FROM cron.job
--    WHERE jobname = 'push-sent-log-retention';
--
--   SELECT count(*) FILTER (WHERE sent_at < now() - interval '30 days') AS da_cancellare,
--          count(*) AS totali,
--          min(sent_at) AS piu_vecchia
--     FROM public.push_sent_log;
--   -- `da_cancellare` deve essere 0 subito dopo questa migration.
--
--   SELECT status, return_message, start_time FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'push-sent-log-retention')
--    ORDER BY start_time DESC LIMIT 3;
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION
      'pg_cron non disponibile: senza scheduler la retention non esisterebbe, e una retention che non gira in silenzio e'' peggio di nessuna retention. La stessa estensione serve gia'' al job del dispatcher (20260523084606).';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- La prima cancellazione, subito. Su un database vuoto tocca zero righe.
-- ---------------------------------------------------------------------------
DELETE FROM public.push_sent_log
 WHERE sent_at < now() - interval '30 days';

-- ---------------------------------------------------------------------------
-- Il job che la ripete. `unschedule` solo se esiste: e' questo che rende la
-- migration rieseguibile.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-sent-log-retention') THEN
    PERFORM cron.unschedule('push-sent-log-retention');
  END IF;
END
$$;

-- 03:17 UTC: fuori dalle ore in cui arrivano le notifiche, e a un minuto non
-- tondo per non accodarsi a tutto cio' che parte allo scoccare dell'ora.
SELECT cron.schedule(
  'push-sent-log-retention',
  '17 3 * * *',
  $job$
  DELETE FROM public.push_sent_log
   WHERE sent_at < now() - interval '30 days';
  $job$
);
