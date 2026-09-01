import { describe, expect, it } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import {
  highlightIndexOnPage,
  pageOfIndex,
  pageRange,
  pickNextMatch,
  type PaginatedCalendar,
} from "./juventusCalendar";

/**
 * Il calendario Juventus arriva impaginato dal server, e la «prossima
 * partita» e' un indice *globale* (`nextUpcomingIndex`) sull'intera stagione.
 * Tutto quello che converte quell'indice in una pagina e in una posizione
 * dentro la pagina e' aritmetica che sbaglia di uno in silenzio: la card
 * mostrerebbe la partita sbagliata, o nessuna, e la pagina continuerebbe a
 * funzionare.
 */

const PAGE_SIZE = 12;

const match = (id: string): FootballMatch => ({
  id,
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
});

function calendar(over: Partial<PaginatedCalendar> = {}): PaginatedCalendar {
  const items = over.items ?? Array.from({ length: PAGE_SIZE }, (_, i) => match(`m${i}`));
  return {
    items,
    total: 48,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 4,
    nextUpcomingIndex: 0,
    ...over,
  };
}

describe("pageOfIndex", () => {
  it("converte l'indice globale nella pagina che lo contiene, contando da 1", () => {
    expect(pageOfIndex(0, PAGE_SIZE)).toBe(1);
    // L'ultimo della prima pagina e il primo della seconda: il confine.
    expect(pageOfIndex(11, PAGE_SIZE)).toBe(1);
    expect(pageOfIndex(12, PAGE_SIZE)).toBe(2);
    expect(pageOfIndex(47, PAGE_SIZE)).toBe(4);
  });

  it("non c'e' pagina quando l'indice non esiste", () => {
    // Il backend manda -1 quando la stagione e' finita: nessuna prossima.
    expect(pageOfIndex(-1, PAGE_SIZE)).toBeNull();
    expect(pageOfIndex(undefined, PAGE_SIZE)).toBeNull();
  });
});

describe("highlightIndexOnPage", () => {
  it("riporta la prossima partita alla sua posizione nella pagina corrente", () => {
    expect(highlightIndexOnPage(calendar({ page: 2, nextUpcomingIndex: 12 }))).toBe(0);
    expect(highlightIndexOnPage(calendar({ page: 2, nextUpcomingIndex: 23 }))).toBe(11);
  });

  it("e' -1 quando la prossima partita sta su un'altra pagina", () => {
    expect(highlightIndexOnPage(calendar({ page: 2, nextUpcomingIndex: 11 }))).toBe(-1);
    expect(highlightIndexOnPage(calendar({ page: 2, nextUpcomingIndex: 24 }))).toBe(-1);
    expect(highlightIndexOnPage(calendar({ page: 1, nextUpcomingIndex: -1 }))).toBe(-1);
  });

  it("sull'ultima pagina, piu' corta, non evidenzia oltre le partite presenti", () => {
    const ultima = calendar({
      page: 4,
      items: [match("a"), match("b"), match("c")],
      nextUpcomingIndex: 38,
    });
    expect(highlightIndexOnPage(ultima)).toBe(2);
    expect(highlightIndexOnPage({ ...ultima, nextUpcomingIndex: 39 })).toBe(-1);
  });
});

describe("pageRange", () => {
  it("numera le partite della pagina da 1, come le legge chi guarda", () => {
    expect(pageRange(calendar({ page: 1 }))).toEqual({ start: 1, end: 12 });
    expect(pageRange(calendar({ page: 2 }))).toEqual({ start: 13, end: 24 });
  });

  it("sull'ultima pagina la fine e' l'ultima partita davvero presente", () => {
    expect(pageRange(calendar({ page: 4, items: [match("a"), match("b"), match("c")] }))).toEqual({
      start: 37,
      end: 39,
    });
  });
});

describe("pickNextMatch", () => {
  it("la prende dalla pagina corrente quando ci sta", () => {
    const corrente = calendar({ page: 2, nextUpcomingIndex: 13 });
    expect(
      pickNextMatch({
        calendar: corrente,
        nextMatchPage: 2,
        nextMatchCalendar: undefined,
        pageSize: PAGE_SIZE,
      }),
    ).toBe(corrente.items[1]);
  });

  it("altrimenti la prende dalla pagina caricata apposta, se e' arrivata", () => {
    const corrente = calendar({ page: 1, nextUpcomingIndex: 13 });
    const altra = calendar({
      page: 2,
      items: Array.from({ length: PAGE_SIZE }, (_, i) => match(`p2-${i}`)),
      nextUpcomingIndex: 13,
    });
    expect(
      pickNextMatch({
        calendar: corrente,
        nextMatchPage: 2,
        nextMatchCalendar: altra,
        pageSize: PAGE_SIZE,
      }),
    ).toBe(altra.items[1]);
  });

  it("e' null finche' l'altra pagina non e' arrivata, o se e' la pagina sbagliata", () => {
    const corrente = calendar({ page: 1, nextUpcomingIndex: 13 });
    expect(
      pickNextMatch({
        calendar: corrente,
        nextMatchPage: 2,
        nextMatchCalendar: undefined,
        pageSize: PAGE_SIZE,
      }),
    ).toBeNull();
    // `placeholderData` di React Query puo' tenere in mano la pagina
    // precedente: se non e' quella giusta non va mostrata come «prossima».
    expect(
      pickNextMatch({
        calendar: corrente,
        nextMatchPage: 2,
        nextMatchCalendar: calendar({ page: 3, nextUpcomingIndex: 13 }),
        pageSize: PAGE_SIZE,
      }),
    ).toBeNull();
  });

  it("e' null senza calendario o senza una prossima partita", () => {
    expect(
      pickNextMatch({
        calendar: undefined,
        nextMatchPage: 1,
        nextMatchCalendar: undefined,
        pageSize: PAGE_SIZE,
      }),
    ).toBeNull();
    expect(
      pickNextMatch({
        calendar: calendar({ nextUpcomingIndex: -1 }),
        nextMatchPage: null,
        nextMatchCalendar: undefined,
        pageSize: PAGE_SIZE,
      }),
    ).toBeNull();
  });

  it("non esce dalla pagina se l'indice punta oltre le partite presenti", () => {
    // Pagina corta (fine stagione) e indice sballato: meglio nessuna card
    // che una partita a caso.
    const corta = calendar({ page: 4, items: [match("a")], nextUpcomingIndex: 40 });
    expect(
      pickNextMatch({
        calendar: corta,
        nextMatchPage: 4,
        nextMatchCalendar: undefined,
        pageSize: PAGE_SIZE,
      }),
    ).toBeNull();
  });
});
