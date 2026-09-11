import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamSelect from "./TeamSelect";
import { resolveTeam } from "@/lib/serieATeams";

describe("TeamSelect", () => {
  it("mostra la squadra scelta, da sola", () => {
    render(<TeamSelect value={resolveTeam("napoli")} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Squadra di calcio preferita" })).toHaveTextContent(
      /^Napoli$/,
    );
  });

  /**
   * Il caso che conta davvero: la preferenza cambia **da fuori**. Succede al
   * primo accesso, quando il profilo arriva dal server e vince sul valore
   * ricordato sul dispositivo, e succede quando un salvataggio rifiutato
   * viene annullato. Una tendina non pilotata continuerebbe a mostrare la
   * squadra vecchia senza che niente lo segnali: e' lo stesso difetto che i
   * passi 7 e 8 hanno chiuso nel contesto, qui visto dal lato dello schermo.
   */
  it("segue la preferenza quando cambia da fuori", () => {
    const { rerender } = render(<TeamSelect value={resolveTeam("napoli")} onChange={() => {}} />);
    rerender(<TeamSelect value={resolveTeam("juventus")} onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Squadra di calcio preferita" })).toHaveTextContent(
      /^Juventus$/,
    );
  });

  /**
   * Manca di proposito il test che apre la tendina e clicca una voce: il
   * contenuto di un `Select` Radix vive in un portale e richiederebbe in
   * jsdom sia `@testing-library/user-event` (non installato) sia gli stub
   * di `ResizeObserver` e delle API pointer. Quel percorso e' coperto dove
   * e' vero, in `e2e/app.spec.ts`.
   */
});
