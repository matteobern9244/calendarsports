import type { EdgeMeta } from "@/lib/api/sportsApi";

/**
 * Categorizza il `dataSource` di un envelope edge function in tre livelli:
 *
 * - `live`: dati ottenuti da una fonte live ufficiale (API o curated).
 * - `degraded`: l'edge function ha risposto ma con dati non live (fallback,
 *   stagione precedente, mixed, unknown). L'utente deve essere avvisato.
 * - `error`: la chiamata e' fallita (eccezione gestita dal chiamante).
 *
 * Nota: `"static"` non e' nella whitelist live perche' nel progetto, dopo
 * la migrazione del calendario MotoGP a Pulselive, nessun endpoint deve
 * piu' ritornare `"static"` di proposito. Se accade e' un sintomo da
 * segnalare.
 */
export type DataSourceCategory = "live" | "degraded" | "error";

const LIVE_SOURCES = new Set(["live", "wikipedia", "wikipedia+curated"]);

export function categorizeDataSource(meta: EdgeMeta | undefined): DataSourceCategory {
  if (!meta?.dataSource) return "live"; // assenza = best effort, no warning
  return LIVE_SOURCES.has(meta.dataSource) ? "live" : "degraded";
}

export function requiresWarning(meta: EdgeMeta | undefined): boolean {
  return categorizeDataSource(meta) !== "live";
}