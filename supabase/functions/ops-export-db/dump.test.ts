import { describe, expect, it } from "vitest";
import {
  assertInvariants,
  buildEnvelope,
  orderColumns,
  selectTables,
  type TableInfo,
} from "./dump";

const tabella = (nome: string, pk: string[] = ["id"], colonne = ["id", "valore"]): TableInfo => ({
  table_name: nome,
  pk_columns: pk,
  all_columns: colonne,
});

describe("orderColumns", () => {
  it("usa la chiave primaria quando c'e'", () => {
    expect(orderColumns(tabella("profiles"))).toEqual(["id"]);
  });

  it("senza chiave primaria ordina su tutte le colonne", () => {
    expect(orderColumns(tabella("vista", [], ["a", "b"]))).toEqual(["a", "b"]);
  });
});

describe("selectTables", () => {
  it("senza parametro esporta tutte le tabelle scoperte", () => {
    const r = selectTables([tabella("profiles"), tabella("push_subscriptions")], null);
    expect(r.ok && r.tables.map((t) => t.table_name)).toEqual(["profiles", "push_subscriptions"]);
  });

  it("esclude le tabelle di log del backup", () => {
    const r = selectTables([tabella("profiles"), tabella("ops_export_log")], null);
    expect(r.ok && r.tables.map((t) => t.table_name)).toEqual(["profiles"]);
  });

  it("con ?table= restituisce solo quella tabella", () => {
    const r = selectTables([tabella("profiles"), tabella("push_sent_log")], "push_sent_log");
    expect(r.ok && r.tables.map((t) => t.table_name)).toEqual(["push_sent_log"]);
  });

  it("con una tabella inesistente e' un errore esplicito, non un export vuoto", () => {
    const r = selectTables([tabella("profiles")], "non_esiste");
    expect(r).toEqual({ ok: false, error: "table_not_found: non_esiste" });
  });

  it("se il database non espone nessuna tabella e' un errore", () => {
    expect(selectTables([], null)).toEqual({ ok: false, error: "no_tables_discovered" });
  });
});

describe("buildEnvelope", () => {
  it("mantiene gli invarianti fra meta e data", () => {
    const env = buildEnvelope(
      ["profiles", "push_subscriptions"],
      { profiles: [{ id: 1 }, { id: 2 }], push_subscriptions: [{ id: 3 }] },
      "2026-09-16T07:00:00.000Z",
    );
    expect(env.meta.app).toBe("calendar-events");
    expect(env.meta.schema_version).toBe(1);
    expect(env.meta.generated_at).toBe("2026-09-16T07:00:00.000Z");
    expect(env.meta.tables).toEqual(Object.keys(env.data));
    expect(env.meta.rows_per_table).toEqual({ profiles: 2, push_subscriptions: 1 });
    expect(env.meta.rows_count).toBe(3);
    expect(() => assertInvariants(env)).not.toThrow();
  });

  it("una tabella vuota resta presente con zero righe", () => {
    const env = buildEnvelope(["profiles"], {}, "2026-09-16T07:00:00.000Z");
    expect(env.data.profiles).toEqual([]);
    expect(env.meta.rows_per_table).toEqual({ profiles: 0 });
    expect(env.meta.rows_count).toBe(0);
  });
});

describe("assertInvariants", () => {
  it("rifiuta un conteggio che non torna", () => {
    const env = buildEnvelope(["profiles"], { profiles: [{ id: 1 }] }, "2026-09-16T07:00:00.000Z");
    env.meta.rows_count = 99;
    expect(() => assertInvariants(env)).toThrow(/rows_count/);
  });

  it("rifiuta una tabella dichiarata ma assente dai dati", () => {
    const env = buildEnvelope(["profiles"], { profiles: [] }, "2026-09-16T07:00:00.000Z");
    env.meta.tables = ["profiles", "fantasma"];
    expect(() => assertInvariants(env)).toThrow(/meta.tables/);
  });
});
