import { describe, expect, it } from "vitest";
import { authorize, timingSafeEqual } from "./auth";

describe("timingSafeEqual", () => {
  it("riconosce stringhe uguali e stringhe diverse", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });

  it("non considera uguale un prefisso del segreto", () => {
    expect(timingSafeEqual("abc", "abcdef")).toBe(false);
    expect(timingSafeEqual("", "abc")).toBe(false);
  });
});

describe("authorize", () => {
  it("senza segreto configurato fallisce chiuso con 500", () => {
    expect(authorize("Bearer x", undefined)).toEqual({
      ok: false,
      status: 500,
      error: "ops_secret_missing",
    });
    expect(authorize("Bearer x", "")).toEqual({
      ok: false,
      status: 500,
      error: "ops_secret_missing",
    });
  });

  it("senza header risponde 401", () => {
    expect(authorize(null, "segreto")).toEqual({ ok: false, status: 401, error: "unauthorized" });
  });

  it("con schema diverso da Bearer risponde 401", () => {
    expect(authorize("Basic segreto", "segreto")).toEqual({
      ok: false,
      status: 401,
      error: "unauthorized",
    });
  });

  it("con Bearer errato risponde 401", () => {
    expect(authorize("Bearer sbagliato", "segreto")).toEqual({
      ok: false,
      status: 401,
      error: "unauthorized",
    });
  });

  it("con Bearer corretto autorizza", () => {
    expect(authorize("Bearer segreto", "segreto")).toEqual({ ok: true });
  });
});
