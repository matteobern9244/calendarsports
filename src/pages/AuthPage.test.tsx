import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn<(args: unknown) => Promise<{ error: Error | null }>>(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { signInWithOAuth } },
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ session: null, user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/router-compat", () => ({
  useNavigate: () => vi.fn(),
  Navigate: () => null,
}));

// Se la pagina tornasse a passare dal broker OAuth di Lovable, il test deve
// accorgersene: quel broker rilascia sessioni del progetto Lovable Cloud, che
// il progetto Supabase personale rifiuta.
vi.mock("@/integrations/lovable/index", () => {
  throw new Error("AuthPage non deve importare il broker OAuth di Lovable");
});

import AuthPage from "./AuthPage";

describe("AuthPage", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
  });

  it("il login con Google passa da Supabase e torna sull'app", () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /continua con google/i }));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  });

  it("non offre l'accesso con Apple, che sul progetto personale non e' configurato", () => {
    render(<AuthPage />);

    expect(screen.queryByRole("button", { name: /apple/i })).not.toBeInTheDocument();
  });

  // Email e password non portano da nessuna parte: gli account esistenti sono
  // nati con Google e non hanno password, e il servizio email gratuito di
  // Supabase spedisce conferme e reset solo ai membri del team. Un form che
  // accetta una registrazione mai confermabile e' peggio di nessun form.
  it("offre solo Google: niente email, password, registrazione o reset", () => {
    render(<AuthPage />);

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /registrati/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/password dimenticata/i)).not.toBeInTheDocument();
  });
});
