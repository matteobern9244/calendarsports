-- Migration correttiva: toglie ai ruoli client l'accesso a pg_net.
--
-- La migration 20260523083929 ha scritto:
--   GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
-- e con essa `net.http_post` e `net.http_get` sono diventati raggiungibili da
-- chiunque possieda la anon key. La anon key viaggia nel bundle del browser ed
-- e' pubblica per disegno: questo significa che chiunque legga il sito puo'
-- chiedere al database di fare richieste HTTP arbitrarie, con il database come
-- mittente. E' meta' di una primitiva SSRF, e la meta' che manca (leggere la
-- risposta) e' comunque raggiungibile via `net._http_response`.
--
-- Le migration gia' applicate non si riscrivono: questa aggiunge, non corregge
-- il file precedente.
--
-- Perche' e' sicuro toglierlo:
--   * il frontend non chiama mai `supabase.from(...)` ne' `supabase.rpc(...)`
--     (verificato con grep su tutto `src/` il 31 agosto 2026): parla solo con
--     le edge function via HTTP;
--   * le edge function usano la service role key, che questa migration non
--     tocca;
--   * il job cron gira come `postgres`, che questa migration non tocca.
--
-- Perche' e' mirato invece di `REVOKE USAGE ON SCHEMA extensions`: nello
-- schema `extensions` questo progetto ha anche pgcrypto, uuid-ossp e
-- pg_stat_statements. Revocare l'intero schema toglierebbe molto piu' del
-- necessario. Qui si revoca esattamente cio' che appartiene a pg_net, letto
-- dal catalogo e non da una lista scritta a mano.
--
-- ---------------------------------------------------------------------------
-- STATO VERIFICATO SUL DATABASE REALE IL 31 AGOSTO 2026
-- ---------------------------------------------------------------------------
-- La cosa importante e' che il `GRANT ... ON SCHEMA extensions` del 23 maggio
-- e' un depistaggio: **pg_net non e' rilocabile**. Nonostante quella
-- migration l'abbia installata `WITH SCHEMA extensions`, le sue funzioni
-- vivono nello schema `net`, che l'estensione crea per conto suo. Chi cercasse
-- il problema in `extensions` non lo troverebbe.
--
-- Misurato:
--   * dodici funzioni pg_net nello schema `net`, fra cui `net.http_post`,
--     `net.http_get` e `net.http_delete`;
--   * `anon` e `authenticated` hanno EXECUTE su **tutte e dodici**;
--   * `anon` e `authenticated` hanno USAGE sia su `net` sia su `extensions`.
--
-- Quanto e' grave davvero: oggi lo schema `public` non contiene **nessuna**
-- funzione, e PostgREST espone solo gli schemi configurati, non `net`. Quindi
-- il privilegio c'e' ma non ha una porta da cui essere usato. E' difesa in
-- profondita', non la chiusura di un buco aperto: basterebbe pero' una
-- funzione `SECURITY DEFINER` in `public`, o un cambio di schemi esposti,
-- perche' diventi sfruttabile. Il privilegio non serve a nessuno: si toglie.
--
-- Idempotente: un REVOKE di un privilegio non concesso e' un no-op.

-- 1. EXECUTE su ogni funzione che appartiene all'estensione pg_net, letta dal
--    catalogo invece che elencata a mano. Una lista scritta a mano non
--    fallisce mai: guarda semplicemente sempre meno codice.
DO $$
DECLARE
  fn record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net non installata: niente da revocare.';
    RETURN;
  END IF;

  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_depend d ON d.objid = p.oid AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e'
    JOIN pg_extension e ON e.oid = d.refobjid
    WHERE e.extname = 'pg_net'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', fn.signature);
  END LOOP;
END
$$;

-- 2. USAGE sullo schema `net`, che pg_net crea per le proprie tabelle di coda
--    e di risposta (`net.http_request_queue`, `net._http_response`). Senza
--    USAGE quelle tabelle non sono nemmeno nominabili.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated';
    EXECUTE 'REVOKE USAGE ON SCHEMA net FROM anon, authenticated';
  END IF;
END
$$;
