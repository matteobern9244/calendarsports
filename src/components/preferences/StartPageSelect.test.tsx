import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StartPageSelect from "./StartPageSelect";
import type { Sections } from "@/contexts/useUserPrefs";

const TUTTE_VISIBILI: Sections = { sinner: true, f1: true, motogp: true };

const tendina = () => screen.getByRole("combobox", { name: "Pagina iniziale" });

describe("StartPageSelect", () => {
  it("mostra la pagina scelta, da sola", () => {
    render(<StartPageSelect value="calendario" sections={TUTTE_VISIBILI} onChange={() => {}} />);
    expect(tendina()).toHaveTextContent(/^Calendario$/);
  });

  /**
   * Come per `TeamSelect`, il caso che conta e' la preferenza che cambia **da
   * fuori**: il profilo che arriva dal server al primo accesso, un
   * salvataggio rifiutato che viene annullato, o una sezione nascosta che fa
   * ripiegare la scelta sulla Home. Una tendina non pilotata continuerebbe a
   * mostrare la voce vecchia senza che niente lo segnali.
   */
  it("segue la preferenza quando cambia da fuori", () => {
    const { rerender } = render(
      <StartPageSelect value="motogp" sections={TUTTE_VISIBILI} onChange={() => {}} />,
    );
    expect(tendina()).toHaveTextContent(/^MotoGP$/);

    rerender(<StartPageSelect value="home" sections={TUTTE_VISIBILI} onChange={() => {}} />);
    expect(tendina()).toHaveTextContent(/^Home \(predefinita\)$/);
  });

  /**
   * Manca di proposito il test che apre la tendina e conta le voci: il
   * contenuto di un `Select` Radix vive in un portale e in jsdom
   * richiederebbe `@testing-library/user-event` (non installato) piu' gli
   * stub di `ResizeObserver` e delle API pointer. Che le sezioni nascoste non
   * vengano offerte e' verificato dove e' logica pura, in
   * `startPageOptions` (`src/lib/startPage.test.ts`), e dal vivo in
   * `e2e/app.spec.ts`.
   */
});
