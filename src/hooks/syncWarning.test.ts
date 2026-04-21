import { describe, it, expect } from "vitest";
import { requiresWarning, categorizeDataSource } from "./syncWarning";

describe("syncWarning", () => {
  it("live -> no warning", () => {
    expect(requiresWarning({ dataSource: "live" })).toBe(false);
    expect(categorizeDataSource({ dataSource: "live" })).toBe("live");
  });

  it("wikipedia -> no warning", () => {
    expect(requiresWarning({ dataSource: "wikipedia" })).toBe(false);
  });

  it("wikipedia+curated -> no warning", () => {
    expect(requiresWarning({ dataSource: "wikipedia+curated" })).toBe(false);
  });

  it("static -> warning (non piu' accettato come live nel progetto)", () => {
    expect(requiresWarning({ dataSource: "static" })).toBe(true);
    expect(categorizeDataSource({ dataSource: "static" })).toBe("degraded");
  });

  it("static-fallback -> warning", () => {
    expect(requiresWarning({ dataSource: "static-fallback" })).toBe(true);
  });

  it("fallback-previous-season -> warning", () => {
    expect(requiresWarning({ dataSource: "fallback-previous-season" })).toBe(true);
  });

  it("mixed -> warning", () => {
    expect(requiresWarning({ dataSource: "mixed" })).toBe(true);
  });

  it("unknown -> warning", () => {
    expect(requiresWarning({ dataSource: "unknown" })).toBe(true);
  });

  it("undefined meta -> no warning (best effort)", () => {
    expect(requiresWarning(undefined)).toBe(false);
    expect(requiresWarning({})).toBe(false);
  });
});