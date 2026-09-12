import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SectionHeader from "./SectionHeader";
import TeamLogo from "./TeamLogo";

/**
 * Questo blocco e' l'intestazione di sette pagine, e finora non aveva test.
 * Lo stemma e' arrivato per una sola di loro — la pagina squadra, dove tutte
 * le avversarie ne avevano uno e la squadra di cui e' la pagina no — quindi la
 * cosa da tenere ferma e' che le altre sei non se ne accorgano.
 */
describe("SectionHeader", () => {
  it("senza stemma resta l'intestazione di prima", () => {
    const { container } = render(<SectionHeader title="Formula 1" subtitle="Stagione 2026" />);

    expect(screen.getByRole("heading", { level: 1, name: "Formula 1" })).toBeInTheDocument();
    expect(screen.getByText("Stagione 2026")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("con lo stemma il titolo resta il solo nome accessibile dell'intestazione", () => {
    render(
      <SectionHeader
        title="Napoli"
        crest={
          <span aria-hidden="true" className="flex">
            <TeamLogo src="napoli.png" name="Napoli" size={44} shape="circle" />
          </span>
        }
      />,
    );

    // `exact` non e' un vezzo: uno stemma dentro l'`h1` renderebbe il nome
    // «Napoli Napoli», e con il ripiego alle iniziali «NA Napoli».
    const titolo = screen.getByRole("heading", { level: 1, name: "Napoli" });
    expect(titolo).toHaveAccessibleName("Napoli");
    expect(titolo.querySelector("img")).toBeNull();
    expect(screen.getByAltText("Napoli")).toHaveAttribute("src", "napoli.png");
  });

  it("senza stemma disponibile resta una scatola con le iniziali", () => {
    render(
      <SectionHeader
        title="Napoli"
        crest={
          <span aria-hidden="true" className="flex">
            <TeamLogo src={null} name="Napoli" size={44} shape="circle" />
          </span>
        }
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Napoli" })).toBeInTheDocument();
    expect(screen.getByText("NA").parentElement).toHaveStyle({ width: "44px", height: "44px" });
  });
});
