import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import TeamRoute from "./TeamRoute";

/**
 * Il tema della sezione squadra si applica in un punto solo, e questo test lo
 * sorveglia: se qualcuno togliesse il wrapper da `TeamRoute`, ogni componente
 * dentro continuerebbe a compilare e a funzionare — mostrerebbe soltanto la
 * livrea juventina per tutte e venti, senza nessun errore.
 */
function renderRotta(indirizzo: string) {
  const { container } = render(
    <MemoryRouter initialEntries={[indirizzo]}>
      <Routes>
        <Route
          path="/squadra/:teamSlug"
          element={<TeamRoute>{(team) => <p>{team.name}</p>}</TeamRoute>}
        />
      </Routes>
    </MemoryRouter>,
  );
  return container.querySelector(".team-theme") as HTMLElement | null;
}

describe("il tema della sezione squadra", () => {
  it("il carattere condensato resta alla Juventus", () => {
    const juve = renderRotta("/squadra/juventus");
    expect(juve?.className).not.toContain("team-neutral");
  });

  it("le altre squadre usano il carattere dell'applicazione", () => {
    const napoli = renderRotta("/squadra/napoli");
    expect(napoli?.className).toContain("team-neutral");
  });

  it("ogni squadra porta il proprio accento, e la Juventus l'oro di sempre", () => {
    expect(renderRotta("/squadra/juventus")?.style.getPropertyValue("--team-accent")).toBe(
      "43 96% 56%",
    );
    const napoli = renderRotta("/squadra/napoli")?.style.getPropertyValue("--team-accent");
    expect(napoli).toBe("205 95% 42%");
  });

  it("emette entrambe le varianti di testo, perche' non sa in quale tema sara' letta", () => {
    // Uno stile inline viene scritto una volta e letto in chiaro **e** in
    // scuro: e' `index.css` a scegliere quale delle due vale.
    const stile = renderRotta("/squadra/inter")?.style;
    expect(stile?.getPropertyValue("--team-accent-on-light")).not.toBe("");
    expect(stile?.getPropertyValue("--team-accent-on-dark")).not.toBe("");
  });

  it("uno slug inventato resta una pagina non trovata, senza tema", () => {
    expect(renderRotta("/squadra/squadra-inventata")).toBeNull();
  });
});
