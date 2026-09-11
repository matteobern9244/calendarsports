import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/hooks/useProfile";

const { aggiorna } = vi.hoisted(() => ({
  aggiorna: vi.fn<(patch: Record<string, unknown>) => Promise<unknown>>(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      update: (patch: Record<string, unknown>) => ({
        eq: () => ({ select: () => ({ single: () => aggiorna(patch) }) }),
      }),
    }),
  },
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({
    session: null,
    user: { id: "u1" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

import { UserPrefsProvider } from "./UserPrefsContext";
import { useUserPrefs } from "./useUserPrefs";

const PROFILO: Profile = {
  id: "u1",
  display_name: null,
  theme: "light",
  favorite_team: "juventus",
  show_sinner: true,
  show_f1: true,
  show_motogp: true,
};

function Spia() {
  const { favoriteTeam, setFavoriteTeam } = useUserPrefs();
  return (
    <button type="button" onClick={() => setFavoriteTeam("napoli")}>
      {favoriteTeam}
    </button>
  );
}

function montaConProfilo() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(queryKeys.profile("u1"), PROFILO);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <UserPrefsProvider>{children}</UserPrefsProvider>
    </QueryClientProvider>
  );
  return render(<Spia />, { wrapper });
}

describe("UserPrefsProvider", () => {
  beforeEach(() => {
    aggiorna.mockReset();
    window.localStorage.clear();
    // La migrazione «preferenze del dispositivo → profilo» scatta una volta
    // per utente e sparerebbe una mutation propria dentro questi test.
    window.localStorage.setItem("cse-profile-migrated:u1", "1");
  });

  it("la squadra scelta si vede subito, prima che il server risponda", async () => {
    // `favoriteTeam` legge `profile.favorite_team` per primo: senza
    // aggiornamento ottimistico, dal clic fino alla risposta della rete la
    // pagina continua a dire — e a mostrare — la squadra precedente.
    let risolvi: (v: unknown) => void = () => {};
    aggiorna.mockImplementationOnce(() => new Promise((res) => (risolvi = res)));

    montaConProfilo();
    expect(screen.getByRole("button")).toHaveTextContent("juventus");

    await act(async () => screen.getByRole("button").click());
    // `waitFor` e non un assert secco perche' `onMutate` aspetta
    // `cancelQueries`, quindi l'anticipo arriva un microtask dopo il clic.
    // Non e' un rilassamento: la promessa del server e' ancora sospesa, quindi
    // «napoli» qui puo' venire soltanto dall'anticipo.
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("napoli"));

    await act(async () => risolvi({ data: { ...PROFILO, favorite_team: "napoli" }, error: null }));
    expect(screen.getByRole("button")).toHaveTextContent("napoli");
  });

  it("se il salvataggio fallisce la squadra torna quella di prima", async () => {
    aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

    montaConProfilo();
    await act(async () => screen.getByRole("button").click());

    expect(screen.getByRole("button")).toHaveTextContent("juventus");
  });
});
