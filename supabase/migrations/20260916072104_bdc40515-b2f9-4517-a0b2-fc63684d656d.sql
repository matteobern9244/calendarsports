CREATE OR REPLACE FUNCTION public.ops_list_public_tables()
RETURNS TABLE (table_name text, pk_columns text[], all_columns text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::text,
    COALESCE((
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM pg_index i
      JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
      WHERE i.indrelid = c.oid AND i.indisprimary
    ), '{}'::text[]),
    COALESCE((
      SELECT array_agg(a2.attname::text ORDER BY a2.attnum)
      FROM pg_attribute a2
      WHERE a2.attrelid = c.oid AND a2.attnum > 0 AND NOT a2.attisdropped
    ), '{}'::text[])
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

REVOKE ALL ON FUNCTION public.ops_list_public_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ops_list_public_tables() FROM anon;
REVOKE ALL ON FUNCTION public.ops_list_public_tables() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_public_tables() TO service_role;