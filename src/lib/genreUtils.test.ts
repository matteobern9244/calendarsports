import { describe, it, expect } from "vitest";
import { inferGenre } from "./genreUtils";

describe("inferGenre", () => {
  describe("Sky Cinema / cinema -> Film", () => {
    it("riconosce qualunque programma su sky-cinema", () => {
      expect(inferGenre("sky-cinema", "Sky Cinema Uno", "Random Movie")).toBe("Film");
    });
    it("riconosce canali con 'cinema' nel nome", () => {
      expect(inferGenre("rai", "Cinema Paradiso", "Documentario")).toBe("Film");
    });
  });

  describe("Sky Sport -> classifica per disciplina", () => {
    it("riconosce MotoGP senza confonderlo con F1 (gp keyword)", () => {
      expect(inferGenre("sky-sport", "Sky Sport MotoGP", "GP Spagna MotoGP")).toBe("MotoGP");
      expect(inferGenre("sky-sport", "Sky Sport Uno", "Moto2 Qualifiche")).toBe("MotoGP");
    });
    it("riconosce Formula 1", () => {
      expect(inferGenre("sky-sport", "Sky Sport F1", "Formula 1: Gara Australia")).toBe("Formula 1");
      expect(inferGenre("sky-sport", "Sky Sport F1", "F1 Qualifiche")).toBe("Formula 1");
    });
    it("riconosce Champions League senza falsi positivi (es. World Championship)", () => {
      expect(inferGenre("sky-sport", "Sky Sport", "Champions League: Real - Bayern")).toBe("Champions League");
    });
    it("riconosce calcio italiano", () => {
      expect(inferGenre("sky-sport", "Sky Sport Calcio", "Serie A: Juventus - Inter")).toBe("Calcio");
    });
    it("riconosce tennis", () => {
      expect(inferGenre("sky-sport", "Sky Sport Tennis", "ATP Madrid: Sinner - Alcaraz")).toBe("Tennis");
    });
    it("default per Sky Sport non riconosciuto -> Sport", () => {
      expect(inferGenre("sky-sport", "Sky Sport Arena", "Programma generico")).toBe("Sport");
    });
  });

  describe("News / TG", () => {
    it("riconosce TG1, TG5, TG2", () => {
      expect(inferGenre("rai", "Rai 1", "TG1")).toBe("News");
      expect(inferGenre("mediaset", "Canale 5", "TG5 Edizione delle 20")).toBe("News");
      expect(inferGenre("rai", "Rai 2", "TG2")).toBe("News");
    });
    it("riconosce telegiornale generico", () => {
      expect(inferGenre("rai", "Rai 3", "Telegiornale Regionale")).toBe("News");
    });
  });

  describe("Reality / Talk Show", () => {
    it("riconosce Grande Fratello", () => {
      expect(inferGenre("mediaset", "Canale 5", "Grande Fratello")).toBe("Reality");
    });
    it("riconosce MasterChef", () => {
      expect(inferGenre("sky-cinema", "Sky Uno", "MasterChef Italia")).toBe("Film");
      // Per canali non-cinema/sport il match reality scatta
      expect(inferGenre("discovery", "Real Time", "MasterChef Italia")).toBe("Reality");
    });
    it("riconosce talk show (Le Iene, Striscia)", () => {
      expect(inferGenre("mediaset", "Italia 1", "Le Iene")).toBe("Talk Show");
      expect(inferGenre("mediaset", "Canale 5", "Striscia la Notizia")).toBe("Talk Show");
    });
  });

  describe("Film / Serie Tv", () => {
    it("riconosce film generico per keyword", () => {
      expect(inferGenre("rai", "Rai 1", "Film: Il Padrino")).toBe("Film");
    });
    it("riconosce serie tv per pattern stagione/episodio", () => {
      expect(inferGenre("rai", "Rai 2", "N.C.I.S. - Stagione 14 Episodio 17")).toBe("Serie Tv");
    });
  });

  describe("nessun match -> undefined", () => {
    it("ritorna default famiglia 'Tv' per titoli generici su RAI/Mediaset", () => {
      expect(inferGenre("rai", "Rai 3", "Programma sconosciuto xyz")).toBe("Tv");
      expect(inferGenre("mediaset", "Italia 1", "Programma sconosciuto xyz")).toBe("Tv");
    });
    it("ritorna 'Sport' come default per Sky Sport sconosciuto", () => {
      expect(inferGenre("sky-sport", "Sky Sport Arena", "Programma generico")).toBe("Sport");
    });
    it("ritorna 'Lifestyle' come default per Discovery sconosciuto", () => {
      expect(inferGenre("discovery", "Real Time", "Programma generico")).toBe("Lifestyle");
    });
  });

  describe("nuove keyword italiane", () => {
    it("riconosce Affari Tuoi come Quiz", () => {
      expect(inferGenre("rai", "Rai 1", "Affari Tuoi")).toBe("Quiz");
    });
    it("riconosce Belve come Talk Show", () => {
      expect(inferGenre("rai", "Rai 2", "Belve")).toBe("Talk Show");
    });
    it("riconosce Don Matteo come Fiction", () => {
      expect(inferGenre("rai", "Rai 1", "Don Matteo")).toBe("Fiction");
    });
    it("riconosce Bake Off Italia come Cooking", () => {
      expect(inferGenre("discovery", "Real Time", "Bake Off Italia")).toBe("Cooking");
    });
    it("riconosce Casa a Prima Vista come Lifestyle", () => {
      expect(inferGenre("discovery", "Real Time", "Casa a Prima Vista")).toBe("Lifestyle");
    });
    it("estrae genere da '(Inchieste)' finale e mappa a Talk Show", () => {
      expect(inferGenre("mediaset", "Italia 1", "Le Iene presentano - Il verdetto (Inchieste)")).toBe("Talk Show");
    });
  });
});
