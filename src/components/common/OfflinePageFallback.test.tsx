import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfflinePageFallback from "./OfflinePageFallback";

describe("OfflinePageFallback", () => {
  it("occupa la pagina con l'avviso di connessione assente", () => {
    render(<OfflinePageFallback onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nessuna connessione");
  });

  it("Riprova richiama il refetch di chi lo usa", () => {
    const onRetry = vi.fn();
    render(<OfflinePageFallback onRetry={onRetry} />);
    // jsdom si dichiara online, quindi il bottone e' attivo.
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
