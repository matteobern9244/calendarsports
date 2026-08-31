-- Migration correttiva: il job cron del dispatcher diventa rieseguibile e
-- smette di portarsi dentro il segreto.
--
-- La migration 20260523084606 ha due difetti distinti.
--
-- 1. NON E' RIESEGUIBILE. Comincia con `SELECT cron.unschedule('...')`, che
--    solleva se il job non esiste. Su un database vuoto quella migration
--    fallisce, e con lei fallisce l'intera catena.
--
-- 2. INLINEA IL SEGRETO. Il valore di `DISPATCH_SECRET` e' scritto in chiaro
--    nel corpo del job, quindi e' nella storia di Git e su GitHub. E' l'unica
--    autenticazione di `push-dispatcher`: chi legge il repository puo'
--    invocarlo, inviare notifiche a tutti gli iscritti e far generare a ogni
--    invocazione una trentina di sotto-richieste verso `sports-football`.
--
-- Le migration gia' applicate non si riscrivono: questa aggiunge.
--
-- ===========================================================================
-- COSA FA E COSA NON FA
-- ===========================================================================
--
-- FA: sposta il segreto dal corpo del job al Vault, e fa leggere al job il
--     valore a ogni esecuzione. Il valore NON cambia, quindi il dispatcher
--     continua a rispondere e non si perde nessuna notifica. Da qui in poi
--     ruotare il segreto non richiede piu' di ricreare il job.
--
-- NON FA: la rotazione. Il valore esposto su GitHub resta valido finche' non
--     viene sostituito. La rotazione e' il passo che segue, ed e' descritto
--     in fondo a questo file: richiede la dashboard Supabase, perche' il
--     secret `DISPATCH_SECRET` della edge function non e' raggiungibile da
--     SQL.
--
-- La separazione e' voluta. Smettere di inlineare ha rischio zero e si puo'
-- applicare subito; la rotazione ha una finestra di pochi minuti in cui il
-- dispatcher risponde 401, e va fatta quando qualcuno la sta guardando.
--
-- ===========================================================================
-- APPLICATA il 31 agosto 2026, e verificata dopo
-- ===========================================================================
--   * `dispatch_secret` e' nel Vault, e il suo valore **coincide** con quello
--     che era nel corpo del job (confrontato con una uguaglianza, non a occhio);
--   * il job `push-dispatcher-every-5-min` e' stato ricreato: attivo, ogni
--     cinque minuti, owner `postgres`, e il suo corpo non contiene piu' nessuna
--     stringa esadecimale lunga;
--   * il corpo legge `vault.decrypted_secrets`, e la sottoquery restituisce
--     davvero 194 caratteri invece di NULL - che era il modo silenzioso in cui
--     questa migration poteva fallire, lasciando il job a mandare un header
--     vuoto e il dispatcher a rispondere 401.
--
-- ===========================================================================
-- STATO PRIMA DELL'APPLICAZIONE
-- ===========================================================================
--   * `supabase_vault` installata, schema `vault`, 0 segreti presenti;
--   * `pg_cron` installata in `pg_catalog`, 1 job attivo
--     (`push-dispatcher-every-5-min`, `*/5 * * * *`, owner `postgres`);
--   * il corpo del job contiene l'header `x-dispatch-secret` in chiaro e non
--     legge il Vault;
--   * `postgres` ha USAGE su `vault`, `anon` e `authenticated` no.
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'vault') THEN
    RAISE EXCEPTION
      'Vault non disponibile: senza Vault l''unica alternativa sarebbe reinlineare il segreto, cioe'' il difetto da correggere.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Il segreto entra nel Vault.
--
-- Su un database che ha gia' il job, il valore viene estratto dal corpo del
-- job stesso: cosi' non transita da nessun file e la continuita' e' garantita.
-- Su un database vuoto non c'e' niente da estrarre e se ne genera uno nuovo,
-- che va poi allineato al secret `DISPATCH_SECRET` (vedi in fondo).
--
-- `gen_random_uuid()` sta nel core di PostgreSQL dalla 13: non dipendiamo da
-- pgcrypto, che e' installata in `extensions` e potrebbe non essere nello
-- `search_path` di chi applica la migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_existing text;
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'dispatch_secret') THEN
    RAISE NOTICE 'dispatch_secret gia'' nel Vault: lasciato com''e''.';
    RETURN;
  END IF;

  SELECT substring(command from '''x-dispatch-secret''\s*,\s*''([^'']+)''')
    INTO v_existing
    FROM cron.job
   WHERE jobname = 'push-dispatcher-every-5-min';

  PERFORM vault.create_secret(
    COALESCE(
      v_existing,
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    ),
    'dispatch_secret',
    'Segreto condiviso fra il job cron push-dispatcher-every-5-min e la edge function push-dispatcher. Deve coincidere con il secret DISPATCH_SECRET del progetto.'
  );

  IF v_existing IS NULL THEN
    RAISE NOTICE 'Nessun job preesistente: generato un segreto nuovo, va copiato nel secret DISPATCH_SECRET.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Il job. `unschedule` solo se esiste davvero: e' questo che rende la
-- migration rieseguibile su un database vuoto.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-dispatcher-every-5-min') THEN
    PERFORM cron.unschedule('push-dispatcher-every-5-min');
  END IF;
END
$$;

-- Il corpo legge il segreto a ogni esecuzione invece di portarselo dentro.
-- `net.http_post`: verificato che pg_net espone le sue funzioni nello schema
-- `net` anche se la migration 20260523083929 l'ha installata
-- `WITH SCHEMA extensions` — pg_net non e' rilocabile.
SELECT cron.schedule(
  'push-dispatcher-every-5-min',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://jxijruuclgskxlbqittk.supabase.co/functions/v1/push-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'dispatch_secret'
      )
    ),
    body := '{}'::jsonb,
    -- Il default di `pg_net` e' 5000 ms, e non basta: misurato il 31 agosto
    -- 2026 su `net._http_response`, 65 giri su 72 finivano in timeout e solo
    -- 7 arrivavano a leggere una risposta (200, `{"ok":true}`). Il dispatcher
    -- interroga tre sport e impagina il calendario Juventus fino a trenta
    -- pagine: cinque secondi non gli bastano quasi mai.
    --
    -- Il difetto e' precedente a questa migration ed e' particolarmente
    -- silenzioso: `cron.job_run_details` segna comunque `succeeded`, perche'
    -- l'SQL e' andato a buon fine — e' la richiesta HTTP ad essere stata
    -- mollata. Chi guardasse solo il cron non vedrebbe niente.
    timeout_milliseconds := 120000
  );
  $job$
);

-- ===========================================================================
-- LA ROTAZIONE — passo successivo, da fare a mano
-- ===========================================================================
--
-- Serve perche' il valore attuale e' leggibile da chiunque abbia accesso al
-- repository. Va fatto in quest'ordine, e fra il passo 2 e il passo 3 il
-- dispatcher risponde 401: nessuna notifica parte, il che e' il verso giusto
-- in cui fallire.
--
--   1. Generare un valore nuovo, per esempio:
--        SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
--
--   2. Scriverlo nel Vault:
--        SELECT vault.update_secret(
--          (SELECT id FROM vault.secrets WHERE name = 'dispatch_secret'),
--          '<valore nuovo>'
--        );
--      Il job lo prende al giro successivo: non va ricreato.
--
--   3. Incollare lo stesso valore nel secret `DISPATCH_SECRET` del progetto
--      (Project Settings -> Edge Functions -> Secrets) e ridistribuire
--      `push-dispatcher`.
--
--   4. Verificare che il giro successivo sia andato:
--        SELECT status, return_message, start_time
--        FROM cron.job_run_details
--        WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'push-dispatcher-every-5-min')
--        ORDER BY start_time DESC LIMIT 3;
-- ===========================================================================
