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
});
