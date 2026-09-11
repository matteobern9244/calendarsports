import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { isPageOf, keepPreviousPageOf } from "./queryPlaceholder";
import { queryKeys } from "./queryKeys";

const juveProssime = queryKeys.juventus.calendarList("juventus", 2026, true);

describe("isPageOf", () => {
  it("riconosce una pagina della stessa lista", () => {
    expect(isPageOf(juveProssime, queryKeys.juventus.calendar("juventus", 2026, 2, 12, true))).toBe(
      true,
    );
  });

  it("non riconosce la stessa pagina di un'altra squadra", () => {
    expect(isPageOf(juveProssime, queryKeys.juventus.calendar("napoli", 2026, 2, 12, true))).toBe(
      false,
    );
  });

  it("non riconosce la stessa pagina di un'altra stagione", () => {
    expect(isPageOf(juveProssime, queryKeys.juventus.calendar("juventus", 2025, 2, 12, true))).toBe(
      false,
    );
  });

  it("non riconosce la stessa pagina dell'altro filtro", () => {
    // «Prossime» e «Tutte» sono due liste, non due viste della stessa.
    expect(
      isPageOf(juveProssime, queryKeys.juventus.calendar("juventus", 2026, 2, 12, false)),
    ).toBe(false);
  });

  it("non riconosce la lista stessa come una sua pagina", () => {
    // Senza il controllo sulla lunghezza, un prefisso identico basterebbe:
    // una chiave piu' corta non e' una pagina, e' un'altra query.
    expect(isPageOf(juveProssime, juveProssime)).toBe(false);
  });

  it("non riconosce il calendario aggregato", () => {
    expect(isPageOf(juveProssime, queryKeys.juventus.calendarAll("juventus", 2026, 3))).toBe(false);
  });

  it("la chiave di una pagina contiene davvero la lista in testa", () => {
    // Il legame fra le due fabbriche: se `calendar` smettesse di partire da
    // `calendarList`, il confronto qui sopra diventerebbe sempre falso e il
    // placeholder non tornerebbe mai — la paginazione tornerebbe a
    // sfarfallare senza che niente fallisca.
    const pagina = queryKeys.juventus.calendar("juventus", 2026, 2, 12, true);
    expect(pagina.slice(0, juveProssime.length)).toEqual([...juveProssime]);
  });
});

describe("keepPreviousPageOf", () => {
  const tieni = keepPreviousPageOf<string>(juveProssime);

  it("restituisce i dati precedenti dentro la lista", () => {
    expect(
      tieni("pagina 1", { queryKey: queryKeys.juventus.calendar("juventus", 2026, 1, 12, true) }),
    ).toBe("pagina 1");
  });

  it("restituisce undefined fuori dalla lista", () => {
    expect(
      tieni("pagina 1", { queryKey: queryKeys.juventus.calendar("napoli", 2026, 1, 12, true) }),
    ).toBeUndefined();
  });

  it("restituisce undefined al primo montaggio, senza query precedente", () => {
    expect(tieni(undefined, undefined)).toBeUndefined();
  });
});

describe("guardiano", () => {
  /**
   * `placeholderData: (prev) => prev` e' la forma che React Query suggerisce
   * ovunque, ed e' quella che serviva le partite della Juventus sotto il nome
   * del Napoli. I test qui sopra coprono le due query che esistono oggi; il
   * guardiano copre la terza, quella che scrivera' qualcun altro.
   */
  it("ogni placeholderData del repository passa da keepPreviousPageOf", () => {
    const SRC = resolve(import.meta.dirname, "..");
    const files: string[] = [];
    const scendi = (dir: string) => {
      for (const voce of readdirSync(dir, { withFileTypes: true })) {
        if (voce.isDirectory()) scendi(join(dir, voce.name));
        else if (/\.tsx?$/.test(voce.name)) files.push(join(dir, voce.name));
      }
    };
    scendi(SRC);

    const violazioni: string[] = [];
    for (const file of files) {
      if (file.endsWith("queryPlaceholder.test.ts")) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((riga, i) => {
          if (!riga.includes("placeholderData:")) return;
          if (riga.includes("keepPreviousPageOf(")) return;
          violazioni.push(`${relative(SRC, file)}:${i + 1} ${riga.trim()}`);
        });
    }

    // Se davvero serve un placeholder che non sia la pagina precedente (un
    // valore statico, per dire), si allarga questa regola con il motivo
    // scritto accanto: non la si aggira.
    expect(violazioni).toEqual([]);
  });
});
