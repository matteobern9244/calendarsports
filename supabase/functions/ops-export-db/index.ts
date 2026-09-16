/**
 * Export completo del database per il sistema di backup esterno.
 *
 * Nessuna UI, nessun link nell'app, nessun job schedulato: l'endpoint esiste
 * solo per essere chiamato dall'esterno con il segreto `OPS_SECRET`.
 *
 * Non c'e' CORS di proposito: il chiamante e' un collettore server-to-server,
 * e non c'e' ragione di rendere questa risposta leggibile da una pagina web.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize } from "./auth.ts";
import {
  PAGE_SIZE,
  assertInvariants,
  buildEnvelope,
  orderColumns,
  selectTables,
  type TableInfo,
} from "./dump.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS });
}

async function gzip(testo: string): Promise<ArrayBuffer> {
  const stream = new Response(new TextEncoder().encode(testo)).body!.pipeThrough(
    new CompressionStream("gzip"),
  );
  return await new Response(stream).arrayBuffer();
}

/**
 * La forma minima del client che serve a `readTable`.
 *
 * I tipi generici di `SupabaseClient` descrivono uno schema che qui non c'e'
 * (le tabelle si scoprono a runtime): si dichiara quello che si usa davvero,
 * cosi' la funzione resta provabile e non serve `any`.
 */
type PaginaLetta = { data: unknown[] | null; error: { message: string } | null };

type QueryLike = {
  range(from: number, to: number): QueryLike;
  order(colonna: string, opts: { ascending: boolean }): QueryLike;
  then<T>(onfulfilled: (value: PaginaLetta) => T): PromiseLike<T>;
};

type DbLike = { from(tabella: string): { select(colonne: string): QueryLike } };

/**
 * Legge una tabella intera a pagine da 1000 righe.
 *
 * Il limite implicito di PostgREST non deve poter troncare niente: si continua
 * finche' una pagina torna piena. Qualunque errore risale, perche' un dump
 * parziale silenzioso e' peggio di un export fallito.
 */
async function readTable(sb: DbLike, info: TableInfo): Promise<unknown[]> {
  const ordine = orderColumns(info);
  if (ordine.length === 0) {
    throw new Error(`Tabella senza colonne ordinabili: ${info.table_name}`);
  }
  const righe: unknown[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = sb
      .from(info.table_name)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    for (const colonna of ordine) {
      query = query.order(colonna, { ascending: true });
    }
    const { data, error } = await (query as unknown as Promise<PaginaLetta>);
    if (error) {
      throw new Error(`Tabella non leggibile: ${info.table_name} (${error.message})`);
    }
    const pagina = data ?? [];
    righe.push(...pagina);
    if (pagina.length < PAGE_SIZE) return righe;
  }
}

Deno.serve(async (req) => {
  const auth = authorize(req.headers.get("authorization"), Deno.env.get("OPS_SECRET"));
  if (!auth.ok) return jsonError(auth.status, auth.error);

  if (req.method !== "POST") {
    return jsonError(405, "method_not_allowed");
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: scoperte, error: erroreScoperta } = await sb.rpc("ops_list_public_tables");
    if (erroreScoperta) {
      throw new Error(`Scoperta delle tabelle fallita: ${erroreScoperta.message}`);
    }

    const richiesta = new URL(req.url).searchParams.get("table");
    const selezione = selectTables((scoperte ?? []) as TableInfo[], richiesta);
    if (!selezione.ok) {
      return jsonError(400, selezione.error);
    }

    const dati: Record<string, unknown[]> = {};
    for (const info of selezione.tables) {
      // Il client tipizzato descrive uno schema noto a compile time; qui le
      // tabelle si scoprono a runtime, quindi si passa la forma strutturale.
      dati[info.table_name] = await readTable(sb as unknown as DbLike, info);
    }

    const envelope = buildEnvelope(
      selezione.tables.map((t) => t.table_name),
      dati,
      new Date().toISOString(),
    );
    assertInvariants(envelope);

    const compresso = await gzip(JSON.stringify(envelope));
    return new Response(compresso, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": 'attachment; filename="calendar-events_db.json.gz"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // Messaggio diagnostico esplicito: nessuna eccezione inghiottita. Le
    // credenziali non compaiono mai in questi messaggi, che nascono tutti qui.
    const messaggio = e instanceof Error ? e.message : String(e);
    console.error("[ops-export-db] export fallito", messaggio);
    return new Response(JSON.stringify({ error: "export_failed", detail: messaggio }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
