import { describe, it, expect } from "vitest";
import { inferGenre } from "./genreUtils";

describe("inferGenre", () => {
  describe("famiglia/canale dedicato", () => {
    it("Sky Cinema -> Film", () => {
      expect(inferGenre("sky-cinema", "Sky Cinema Uno", "Inception")).toBe("Film");
    });

    it("canale che contiene 'cinema' -> Film", () => {
      expect(inferGenre("rai", "Rai Movie Cinema", "Qualcosa")).toBe("Film");
    });

    it("Sky Sport con calcio -> Calcio", () => {
      expect(inferGenre("sky-sport", "Sky Sport Calcio", "Juventus - Inter")).toBe("Calcio");
      expect(inferGenre("sky-sport", "Sky Sport 24", "Champions League: Napoli - Real Madrid")).toBe("Calcio");
    });

    it("Sky Sport con F1 -> Formula 1", () => {
      expect(inferGenre("sky-sport", "Sky Sport F1", "Gran Premio del Bahrain")).toBe("Formula 1");
      expect(inferGenre("sky-sport", "Sky Sport 1", "Formula 1: Qualifiche")).toBe("Formula 1");
    });

    it("Sky Sport con MotoGP -> MotoGP", () => {
      expect(inferGenre("sky-sport", "Sky Sport MotoGP", "MotoGP: GP del Qatar")).toBe("MotoGP");
    });

    it("Sky Sport con tennis -> Tennis", () => {
      expect(inferGenre("sky-sport", "Sky Sport Tennis", "ATP Finals: Sinner - Alcaraz")).toBe("Tennis");
    });

    it("Sky Sport generico -> Sport", () => {
      expect(inferGenre("sky-sport", "Sky Sport Arena", "Highlights della giornata")).toBe("Sport");
    });

    it("Eurosport -> Sport (anche se famiglia diversa)", () => {
      expect(inferGenre("discovery", "Eurosport 1", "Snooker World Championship")).toBe("Sport");
    });
  });

  describe("keyword nel titolo (RAI/Mediaset)", () => {
    it("rileva News dai pattern TG/telegiornale", () => {
      expect(inferGenre("rai", "Rai 1", "TG1")).toBe("News");
      expect(inferGenre("rai", "Rai 3", "Telegiornale Regionale")).toBe("News");
      expect(inferGenre("mediaset", "Canale 5", "Edizione delle 20")).toBe("News");
    });

    it("rileva Reality", () => {
      expect(inferGenre("mediaset", "Canale 5", "Grande Fratello")).toBe("Reality");
      expect(inferGenre("mediaset", "Canale 5", "Temptation Island")).toBe("Reality");
      expect(inferGenre("rai", "Rai 1", "Ballando con le Stelle")).toBe("Reality");
    });

    it("rileva Talk Show", () => {
      expect(inferGenre("rai", "Rai 3", "Cartabianca")).toBe("Talk Show");
      expect(inferGenre("mediaset", "Canale 5", "Striscia la Notizia")).toBe("Talk Show");
      expect(inferGenre("mediaset", "Rete 4", "DiMartedi")).toBe("Talk Show");
    });

    it("rileva Film generico", () => {
      expect(inferGenre("rai", "Rai 2", "Film d'azione della serata")).toBe("Film");
    });

    it("rileva Serie Tv", () => {
      expect(inferGenre("rai", "Rai 1", "Don Matteo Stagione 14 Episodio 5")).toBe("Serie Tv");
      expect(inferGenre("mediaset", "Italia 1", "Chicago Fire S08E12")).toBe("Serie Tv");
    });

    it("rileva Quiz", () => {
      expect(inferGenre("rai", "Rai 1", "Reazione a Catena")).toBe("Quiz");
      expect(inferGenre("mediaset", "Canale 5", "Caduta Libera")).toBe("Quiz");
    });
  });

  describe("nessun match", () => {
    it("ritorna undefined per titoli non riconosciuti su famiglia generica", () => {
      expect(inferGenre("rai", "Rai 1", "Programma misterioso XYZ")).toBeUndefined();
    });
  });
});
