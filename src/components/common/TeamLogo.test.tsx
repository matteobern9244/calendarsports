import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamLogo from "./TeamLogo";

/**
 * Il fondo sotto uno stemma non puo' seguire il tema.
 *
 * Qui c'era `bg-background/40`, e `--background` vale `220 30% 6%` in tema
 * scuro: lo stemma della Juventus e' nero su trasparente, quindi spariva del
 * tutto — nell'intestazione della sua pagina, in classifica e nel dettaglio
 * partita. Il difetto e' simmetrico, perche' in tema chiaro tocca a uno stemma
 * bianco.
 *
 * Gli stemmi sono disegnati per stare su fondo chiaro, quindi la placca e'
 * costante nei due temi. E' la stessa soluzione che `Formula1Page` teneva a
 * mano attorno ai loghi costruttori: adesso vive in un posto solo.
 */
describe("TeamLogo", () => {
  it("posa lo stemma su una placca che non segue il tema", () => {
    render(<TeamLogo src="juventus.png" name="Juventus" size={44} shape="circle" />);

    const stemma = screen.getByAltText("Juventus");
    expect(stemma.className).toContain("bg-logo-plate");
    // Il fondo che seguiva il tema e' proprio cio' che faceva sparire il logo.
    expect(stemma.className).not.toMatch(/bg-background/);
  });

  it("mantiene la misura dichiarata anche con placca e bordo", () => {
    render(<TeamLogo src="juventus.png" name="Juventus" size={44} />);

    expect(screen.getByAltText("Juventus")).toHaveStyle({ width: "44px", height: "44px" });
  });

  it("senza sorgente mostra le iniziali, leggibili in entrambi i temi", () => {
    render(<TeamLogo src={null} name="Juventus" size={32} />);

    expect(screen.queryByAltText("Juventus")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Juventus" })).toBeInTheDocument();
    expect(screen.getByText("JU")).toBeInTheDocument();
  });

  it("se l'immagine non si carica ripiega sulle iniziali invece di lasciare il vuoto", () => {
    render(<TeamLogo src="rotto.png" name="Sassuolo" size={32} />);

    fireEvent.error(screen.getByAltText("Sassuolo"));

    expect(screen.queryByAltText("Sassuolo")).not.toBeInTheDocument();
    expect(screen.getByText("SA")).toBeInTheDocument();
  });
});
