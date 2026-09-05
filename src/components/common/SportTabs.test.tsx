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

  it("il contenitore delle schede porta le classi di default", () => {
    // Tre pagine su quattro hanno una `TabsList` che va a capo; e' il
    // default perche' e' il caso piu' comune, non perche' sia obbligatorio.
    renderTabs();
    expect(screen.getByRole("tablist")).toHaveClass("flex-wrap", "h-auto", "gap-1", "p-1");
  });

  it("`listClassName` sostituisce quelle classi invece di aggiungersi", () => {
    // `SinnerPage` ha due sole schede e una `TabsList` piu' semplice:
    // uniformarla sarebbe un cambiamento visivo che nessuno ha chiesto.
    render(
      <SportTabs
        title="Jannik Sinner"
        defaultValue="risultati"
        tabs={TABS}
        listClassName="mb-6 bg-muted"
      >
        <TabsContent value="calendario">Le gare</TabsContent>
      </SportTabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list).toHaveClass("mb-6", "bg-muted");
    expect(list).not.toHaveClass("flex-wrap");
  });

  it("`beforeTabs` sta fra il titolo e le schede", () => {
    // E' lo spazio della scheda giocatore di Sinner, che non e' dentro
    // nessuna scheda e deve restare sopra tutte.
    render(
      <SportTabs
        title="Jannik Sinner"
        defaultValue="calendario"
        tabs={TABS}
        beforeTabs={<p>Numero 1 del mondo</p>}
      >
        <TabsContent value="calendario">Le gare</TabsContent>
      </SportTabs>,
    );
    const intestazione = screen.getByRole("heading", { level: 1 });
    const inserto = screen.getByText("Numero 1 del mondo");
    const schede = screen.getByRole("tablist");
    expect(intestazione.compareDocumentPosition(inserto)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(inserto.compareDocumentPosition(schede)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
