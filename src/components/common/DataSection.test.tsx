import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataSection, { type ExternalSource } from "./DataSection";

const SOURCE: ExternalSource = {
  href: "https://www.formula1.com/en/racing/2025",
  label: "Vedi calendario su Formula1.com",
  loadingLabel: "Scopri ora su Formula1.com",
};

/**
 * Props minime comuni: ogni test sovrascrive solo i tre flag di stato.
 * Tenerle qui evita che una divergenza fra i casi passi per scelta di
 * design quando e' solo copia-incolla.
 */
const BASE = {
  source: SOURCE,
  loadingMessage: "Caricamento calendario F1...",
  errorMessage: "Calendario F1 2026 non disponibile",
  errorDetail: "La nostra fonte dati non sta rispondendo correttamente.",
  emptyTitle: "Calendario F1 2026",
  emptyDescription: "Il calendario dei Gran Premi non e' ancora disponibile.",
};

describe("DataSection", () => {
  it("mostra il caricamento con la CTA della fonte, e non il contenuto", () => {
    render(
      <DataSection {...BASE} isLoading error={null} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.getByText("Caricamento calendario F1...")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Scopri ora su Formula1\.com/i })).toHaveAttribute(
      "href",
      SOURCE.href,
    );
    expect(screen.queryByText("Le gare")).not.toBeInTheDocument();
  });

  it("durante il caricamento non mostra nessun link se la fonte non dichiara loadingLabel", () => {
    render(
      <DataSection
        {...BASE}
        source={{ href: SOURCE.href, label: SOURCE.label }}
        isLoading
        error={null}
        isEmpty
      >
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("mostra l'errore con Riprova e il link alla fonte", () => {
    const onRetry = vi.fn();
    render(
      <DataSection {...BASE} isLoading={false} error={new Error("boom")} isEmpty onRetry={onRetry}>
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.getByText("Calendario F1 2026 non disponibile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Riprova/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Vedi calendario su Formula1\.com/i })).toBeVisible();
  });

  it("non mostra lo stato vuoto mentre carica o mentre e' in errore", () => {
    const { rerender } = render(
      <DataSection {...BASE} isLoading error={null} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );
    expect(screen.queryByText("Calendario F1 2026")).not.toBeInTheDocument();

    rerender(
      <DataSection {...BASE} isLoading={false} error={new Error("boom")} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );
    expect(screen.queryByText("Calendario F1 2026")).not.toBeInTheDocument();
  });

  it("mostra lo stato vuoto quando non carica, non e' in errore e non ha dati", () => {
    render(
      <DataSection {...BASE} isLoading={false} error={null} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.getByRole("heading", { name: "Calendario F1 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Vedi calendario su Formula1\.com/i })).toBeVisible();
    expect(screen.queryByText("Le gare")).not.toBeInTheDocument();
  });

  it("mostra il contenuto quando ci sono dati, senza nessuno dei tre stati", () => {
    render(
      <DataSection {...BASE} isLoading={false} error={null} isEmpty={false}>
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.getByText("Le gare")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Caricamento calendario F1...")).not.toBeInTheDocument();
  });

  it("tiene i dati gia' in pagina accanto all'errore di un refetch fallito", () => {
    // React Query conserva `data` quando un aggiornamento fallisce: la
    // sezione deve mostrare l'avviso *sopra* i dati vecchi, non buttarli.
    render(
      <DataSection {...BASE} isLoading={false} error={new Error("boom")} isEmpty={false}>
        <p>Le gare</p>
      </DataSection>,
    );

    expect(screen.getByText("Calendario F1 2026 non disponibile")).toBeInTheDocument();
    expect(screen.getByText("Le gare")).toBeInTheDocument();
  });

  it("senza fonte esterna non renderizza nessun link in nessuno dei tre stati", () => {
    const { rerender } = render(
      <DataSection {...BASE} source={undefined} isLoading error={null} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <DataSection {...BASE} source={undefined} isLoading={false} error={new Error("x")} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <DataSection {...BASE} source={undefined} isLoading={false} error={null} isEmpty>
        <p>Le gare</p>
      </DataSection>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
