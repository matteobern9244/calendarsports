/**
 * Logica pura dell'export: scelta delle tabelle, ordinamento delle pagine e
 * costruzione dell'inviluppo con i suoi invarianti.
 *
 * Il collettore esterno scarta il file se `meta.tables` non coincide con le
 * chiavi di `data` o se `rows_count` non e' la somma di `rows_per_table`:
 * questi invarianti si costruiscono qui, in un punto solo, e si verificano
 * prima di rispondere.
 */

export const APP_NAME = "calendar-events";
export const SCHEMA_VERSION = 1;
export const PAGE_SIZE = 1000;

/** Tabelle di log del backup: escluse dal dump se un giorno esisteranno. */
export const EXCLUDED_TABLES = ["ops_export_log"];

export type TableInfo = {
  table_name: string;
  pk_columns: string[];
  all_columns: string[];
};

export type ExportEnvelope = {
  meta: {
    app: string;
    schema_version: number;
    generated_at: string;
    tables: string[];
    rows_per_table: Record<string, number>;
    rows_count: number;
  };
  data: Record<string, unknown[]>;
};

/**
 * Colonne su cui ordinare la paginazione: la chiave primaria, oppure tutte le
 * colonne quando la tabella non ne ha una. Senza un ordine totale e stabile due
 * pagine consecutive possono ripetere o saltare righe.
 */
export function orderColumns(info: TableInfo): string[] {
  return info.pk_columns.length > 0 ? info.pk_columns : info.all_columns;
}

export type SelectionResult =
  | { ok: true; tables: TableInfo[] }
  | { ok: false; error: string };

/**
 * Sceglie le tabelle da esportare fra quelle scoperte.
 *
 * Nessuna whitelist scritta a mano: l'elenco arriva dal database. Una tabella
 * chiesta con `?table=` e non scoperta e' un errore esplicito, mai un export
 * vuoto.
 */
export function selectTables(discovered: TableInfo[], requested: string | null): SelectionResult {
  const disponibili = discovered.filter((t) => !EXCLUDED_TABLES.includes(t.table_name));
  if (requested === null) {
    if (disponibili.length === 0) {
      return { ok: false, error: "no_tables_discovered" };
    }
    return { ok: true, tables: disponibili };
  }
  const trovata = disponibili.find((t) => t.table_name === requested);
  if (!trovata) {
    return { ok: false, error: `table_not_found: ${requested}` };
  }
  return { ok: true, tables: [trovata] };
}

/** Costruisce l'inviluppo mantenendo l'ordine delle tabelle richiesto. */
export function buildEnvelope(
  tables: string[],
  data: Record<string, unknown[]>,
  generatedAt: string,
): ExportEnvelope {
  const rowsPerTable: Record<string, number> = {};
  const dati: Record<string, unknown[]> = {};
  for (const nome of tables) {
    const righe = data[nome] ?? [];
    dati[nome] = righe;
    rowsPerTable[nome] = righe.length;
  }
  return {
    meta: {
      app: APP_NAME,
      schema_version: SCHEMA_VERSION,
      generated_at: generatedAt,
      tables: [...tables],
      rows_per_table: rowsPerTable,
      rows_count: Object.values(rowsPerTable).reduce((a, b) => a + b, 0),
    },
    data: dati,
  };
}

/**
 * Rilegge gli invarianti dall'inviluppo gia' costruito, invece di fidarsi di
 * chi lo ha costruito: e' l'ultimo controllo prima di consegnare il file.
 */
export function assertInvariants(envelope: ExportEnvelope): void {
  const chiaviDati = Object.keys(envelope.data);
  const tabelle = envelope.meta.tables;
  const uguali =
    chiaviDati.length === tabelle.length && tabelle.every((t, i) => chiaviDati[i] === t);
  if (!uguali) {
    throw new Error("invariant_violation: meta.tables non coincide con le chiavi di data");
  }
  let somma = 0;
  for (const t of tabelle) {
    const dichiarate = envelope.meta.rows_per_table[t];
    const effettive = envelope.data[t].length;
    if (dichiarate !== effettive) {
      throw new Error(`invariant_violation: rows_per_table[${t}] non coincide con le righe`);
    }
    somma += dichiarate;
  }
  if (somma !== envelope.meta.rows_count) {
    throw new Error("invariant_violation: rows_count non e' la somma di rows_per_table");
  }
}
