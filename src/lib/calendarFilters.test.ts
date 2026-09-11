import { describe, it, expect, beforeEach } from "vitest";
import { loadFilters } from "@/lib/calendarFilters";

/**
 * La voce del calcio nei filtri del calendario aggregato si chiamava
 * `juventus`: era una chiave di `CalendarSport`, e il tipo l'ha portata fin
 * dentro il `localStorage` di chi usa l'app da prima della rinomina.
 *
 * Questo e' l'unico posto del passo 12 dove una rinomina poteva **perdere un
 * dato dell'utente** invece di spostare un nome. Perderlo non avrebbe rotto
 * niente: avrebbe solo riacceso un filtro che qualcuno aveva spento.
 */
const CHIAVE = "calendar.filters";

describe("loadFilters", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("senza niente sul dispositivo accende tutto", () => {
    expect(loadFilters()).toEqual({ football: true, f1: true, motogp: true });
  });

  it("eredita il filtro spento scritto con il nome vecchio", () => {
    window.localStorage.setItem(CHIAVE, JSON.stringify({ juventus: false, f1: true }));
    expect(loadFilters()).toEqual({ football: false, f1: true, motogp: true });
  });

  it("non lascia in giro il nome vecchio", () => {
    // Se `juventus` sopravvivesse nell'oggetto, l'effetto che salva lo
    // riscriverebbe sul dispositivo a ogni cambio: una chiave morta che non
    // se ne va piu'.
    window.localStorage.setItem(CHIAVE, JSON.stringify({ juventus: false }));
    expect(Object.keys(loadFilters()).sort()).toEqual(["f1", "football", "motogp"]);
  });

  it("fra i due nomi vince quello nuovo", () => {
    // Convivono per un solo salvataggio, e in quel momento `football` e' la
    // scelta piu' recente: e' quella che l'utente ha appena fatto.
    window.localStorage.setItem(CHIAVE, JSON.stringify({ juventus: true, football: false }));
    expect(loadFilters().football).toBe(false);
  });

  it("un valore illeggibile non spegne il calendario", () => {
    window.localStorage.setItem(CHIAVE, "{non json");
    expect(loadFilters()).toEqual({ football: true, f1: true, motogp: true });
  });
});
