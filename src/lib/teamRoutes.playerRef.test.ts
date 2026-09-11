import { describe, expect, it } from "vitest";
import { skyPlayerRef } from "@/lib/teamRoutes";

describe("skyPlayerRef", () => {
  it("legge i due pezzi dalla URL della scheda atleta", () => {
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/amir-rrahmani/165196")).toEqual({
      slug: "amir-rrahmani",
      id: "165196",
    });
  });

  it("regge la barra finale e i parametri in coda", () => {
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/alex-meret/171366/")?.id).toBe(
      "171366",
    );
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/alex-meret/171366?x=1")?.id).toBe(
      "171366",
    );
  });

  /**
   * Un giocatore senza scheda su Sky esiste — l'allenatore, per esempio, ha il
   * nome in uno `<span>` proprio perche' non ne ha una. La sua riga non si
   * apre, e non deve provarci.
   */
  it("senza URL non c'e' riferimento", () => {
    expect(skyPlayerRef(null)).toBeNull();
    expect(skyPlayerRef(undefined)).toBeNull();
    expect(skyPlayerRef("")).toBeNull();
  });

  it("rifiuta quello che non ha quella forma, invece di ricavarne un pezzo", () => {
    expect(skyPlayerRef("https://sport.sky.it/calcio/squadre/napoli/rosa")).toBeNull();
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/165196")).toBeNull();
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/Nome Cognome/165196")).toBeNull();
    // Un id che non e' un numero non e' un id: meglio non aprire la riga che
    // mandare alla edge function un valore che rifiutera' con un 400.
    expect(skyPlayerRef("https://sport.sky.it/calcio/atleti/tizio/abc")).toBeNull();
  });
});
