import { describe, expect, it } from "vitest";
import { buildPageList } from "./pageList";

/**
 * Aritmetica della paginazione con gli ellissi. Viveva dentro
 * `JuventusPage.tsx` senza un test: e' la classica funzione che sbaglia di
 * uno ai bordi (pagina 1, ultima pagina, sette pagine esatte, otto) senza che
 * nessuno se ne accorga, perche' la UI mostra comunque *qualcosa*.
 *
 * I valori attesi sono quelli che il codice produceva prima dell'estrazione:
 * questi test dimostrano che spostarla non ne ha cambiato il comportamento.
 */

const E = "ellipsis";

describe("buildPageList", () => {
  it("con sette pagine o meno le elenca tutte, senza ellissi", () => {
    expect(buildPageList(1, 0)).toEqual([]);
    expect(buildPageList(1, 1)).toEqual([1]);
    expect(buildPageList(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    // Sette e' il confine: l'ellissi comparirebbe solo dall'ottava.
    expect(buildPageList(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(buildPageList(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("dall'ottava pagina in poi tiene la prima, l'ultima e le vicine della corrente", () => {
    expect(buildPageList(1, 8)).toEqual([1, 2, E, 8]);
    expect(buildPageList(4, 8)).toEqual([1, E, 3, 4, 5, E, 8]);
    expect(buildPageList(8, 8)).toEqual([1, E, 7, 8]);
    expect(buildPageList(10, 20)).toEqual([1, E, 9, 10, 11, E, 20]);
  });

  it("non mette un'ellissi al posto di niente: vicino ai bordi le pagine restano contigue", () => {
    // Pagina 2 e 3: fra 1 e la corrente non c'e' nulla da nascondere.
    expect(buildPageList(2, 8)).toEqual([1, 2, 3, E, 8]);
    expect(buildPageList(3, 8)).toEqual([1, 2, 3, 4, E, 8]);
    // Specularmente in coda.
    expect(buildPageList(6, 8)).toEqual([1, E, 5, 6, 7, 8]);
    expect(buildPageList(7, 8)).toEqual([1, E, 6, 7, 8]);
  });

  it("l'ellissi puo' nascondere anche una pagina sola", () => {
    // Corrente 4 di 8: fra 1 e 3 c'e' solo la 2, e viene sostituita
    // dall'ellissi. E' il comportamento di sempre, non una scelta nuova:
    // se un giorno si preferisse mostrare il numero, questo test va cambiato
    // di proposito.
    expect(buildPageList(4, 8)).toContain(E);
    expect(buildPageList(4, 8)).not.toContain(2);
    expect(buildPageList(5, 8)).toEqual([1, E, 4, 5, 6, E, 8]);
  });

  it("per ogni combinazione: comincia da 1, finisce con l'ultima, cresce e contiene la corrente", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const list = buildPageList(current, total);
        const numeri = list.filter((p): p is number => typeof p === "number");
        expect(list[0], `total=${total} current=${current}`).toBe(1);
        expect(list[list.length - 1], `total=${total} current=${current}`).toBe(total);
        expect(numeri, `total=${total} current=${current}`).toContain(current);
        for (let i = 1; i < numeri.length; i++) {
          expect(numeri[i], `total=${total} current=${current}`).toBeGreaterThan(numeri[i - 1]);
        }
        for (let i = 1; i < list.length; i++) {
          expect(
            list[i] === E && list[i - 1] === E,
            `due ellissi di fila con total=${total} current=${current}`,
          ).toBe(false);
        }
        expect(list.length, `total=${total} current=${current}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it("una corrente fuori intervallo non produce numeri fuori intervallo", () => {
    // Il server puo' rispondere con una pagina che non esiste piu' (filtro
    // cambiato, stagione nuova): la lista resta fra 1 e total.
    for (const current of [0, -3, 9, 99]) {
      const list = buildPageList(current, 8);
      const numeri = list.filter((p): p is number => typeof p === "number");
      expect(list[0]).toBe(1);
      expect(list[list.length - 1]).toBe(8);
      for (const n of numeri) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(8);
      }
    }
  });
});
