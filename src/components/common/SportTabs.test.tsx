import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabsContent } from "@/components/ui/tabs";
import SportTabs from "./SportTabs";

const TABS = [
  { value: "calendario", label: "Calendario" },
  { value: "piloti", label: "Classifica Piloti" },
] as const;

function renderTabs() {
  return render(
    <SportTabs title="Formula 1" defaultValue="calendario" tabs={TABS}>
      <TabsContent value="calendario">Le gare</TabsContent>
      <TabsContent value="piloti">I piloti</TabsContent>
    </SportTabs>,
  );
}

describe("SportTabs", () => {
  it("mette il titolo della pagina come h1, sopra le schede", () => {
    renderTabs();
    expect(screen.getByRole("heading", { level: 1, name: "Formula 1" })).toBeInTheDocument();
  });

  it("una scheda per voce, nell'ordine dato, con quella di partenza selezionata", () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Calendario", "Classifica Piloti"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Le gare")).toBeInTheDocument();
    expect(screen.queryByText("I piloti")).not.toBeInTheDocument();
  });

  it("cambiare scheda mostra il contenuto corrispondente", () => {
    renderTabs();
    // Radix attiva la scheda su mousedown col tasto sinistro, non su click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Classifica Piloti" }), { button: 0 });
    expect(screen.getByText("I piloti")).toBeInTheDocument();
    expect(screen.queryByText("Le gare")).not.toBeInTheDocument();
  });
});
