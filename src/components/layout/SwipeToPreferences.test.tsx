import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import SwipeToPreferences from "./SwipeToPreferences";
import { AuthContext } from "@/contexts/useAuth";
import { PreferencesPanelProvider } from "@/contexts/PreferencesPanelContext";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";

const CHIAVE_VISTO = "cse-swipe-preferenze";

const utente = { id: "00000000-0000-4000-8000-000000000001" } as User;

/** Rende visibile lo stato del pannello, che altrimenti vive solo nel contesto. */
function StatoPannello() {
  const { open } = usePreferencesPanel();
  return <output data-testid="stato">{open ? "aperto" : "chiuso"}</output>;
}

function rendi({ user = utente as User | null } = {}) {
  return render(
    <AuthContext.Provider value={{ session: null, user, loading: false, signOut: async () => {} }}>
      <PreferencesPanelProvider>
        <SwipeToPreferences />
        <StatoPannello />
      </PreferencesPanelProvider>
    </AuthContext.Provider>,
  );
}

/** `pointer: coarse` come su un telefono; il setup globale risponde `false` a tutto. */
function schermoTattile(tattile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: tattile && query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("SwipeToPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    schermoTattile(true);
  });

  it("su schermo tattile, con l'accesso, la linguetta c'e' ed e' un comando", () => {
    rendi();
    const linguetta = screen.getByRole("button", { name: "Apri le preferenze" });
    expect(linguetta).toBe(screen.getByTestId("linguetta-preferenze"));
  });

  it("senza accesso c'e' lo stesso: le preferenze vivono sul dispositivo", () => {
    rendi({ user: null });
    expect(screen.getByTestId("linguetta-preferenze")).toBeVisible();
  });

  it("con il mouse non c'e': non e' un gesto che si cerca col puntatore", () => {
    schermoTattile(false);
    rendi();
    expect(screen.queryByTestId("linguetta-preferenze")).toBeNull();
  });

  it("il tocco apre il pannello e segna il gesto come imparato", () => {
    rendi();
    fireEvent.click(screen.getByTestId("linguetta-preferenze"));

    expect(screen.getByTestId("stato")).toHaveTextContent("aperto");
    expect(window.localStorage.getItem(CHIAVE_VISTO)).toBe("1");
    // A pannello aperto la linguetta si toglie di mezzo.
    expect(screen.queryByTestId("linguetta-preferenze")).toBeNull();
  });

  /**
   * Pulsa finche' non e' stata usata: un richiamo per chi non la conosce.
   * Dopo, resta ferma: chi ha imparato non ha piu' bisogno di un richiamo,
   * ma il comando resta, perche' un comando che sparisce e' un comando che
   * non si trova piu'.
   */
  it("pulsa solo finche' non e' stata usata la prima volta", () => {
    const { unmount } = rendi();
    expect(screen.getByTestId("linguetta-preferenze").className).toContain("animate-swipe-hint");
    unmount();

    window.localStorage.setItem(CHIAVE_VISTO, "1");
    rendi();
    const linguetta = screen.getByTestId("linguetta-preferenze");
    expect(linguetta).toBeVisible();
    expect(linguetta.className).not.toContain("animate-swipe-hint");
  });

  it("se localStorage non e' disponibile, la linguetta c'e' lo stesso", () => {
    const originale = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("negato");
      },
    });
    try {
      rendi();
      expect(screen.getByTestId("linguetta-preferenze")).toBeVisible();
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: originale });
    }
    vi.restoreAllMocks();
  });
});
