import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/hooks/useProfile";

const { aggiorna } = vi.hoisted(() => ({
  aggiorna: vi.fn<(patch: Record<string, unknown>) => Promise<unknown>>(),
}));
const { sessione } = vi.hoisted(() => ({
  sessione: { user: { id: "u1" } as { id: string } | null },
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
  useAuth: () => ({ session: null, user: sessione.user, loading: false, signOut: vi.fn() }),
}));

import { UserPrefsProvider } from "./UserPrefsContext";
import { SECTIONS_STORAGE_KEY, TEAM_STORAGE_KEY, useUserPrefs } from "./useUserPrefs";

const PROFILO: Profile = {
  id: "u1",
  display_name: null,
  theme: "light",
  favorite_team: "juventus",
  show_sinner: true,
  show_f1: true,
  show_motogp: true,
  start_page: "home",
};

const CHIAVE_MIGRAZIONE = "cse-profile-migrated:u1";

function Spia() {
  const { favoriteTeam, setFavoriteTeam, sections, setSection, theme, setTheme } = useUserPrefs();
  return (
    <>
      <button type="button" data-testid="squadra" onClick={() => setFavoriteTeam("napoli")}>
        {favoriteTeam.slug}
      </button>
      <button type="button" data-testid="sezioni" onClick={() => setSection("f1", false)}>
        {String(sections.f1)}
      </button>
      <button type="button" data-testid="tema" onClick={() => setTheme("dark")}>
        {theme}
      </button>
    </>
  );
}

const bottone = (nome: string) => screen.getByTestId(nome);
const ricordoLocale = (chiave: string) => window.localStorage.getItem(chiave);

/**
 * Monta il provider con un profilo in cache, come dopo la prima lettura.
 *
 * `profilo: null` significa «nessuna sessione»: senza utente la query del
 * profilo e' disabilitata e valgono soltanto le preferenze del dispositivo.
 * Il sentinella e' `null` e non `undefined` perche' `undefined` farebbe
 * scattare il valore di default del parametro.
 */
function monta({ profilo = PROFILO }: { profilo?: Profile | null } = {}) {
  sessione.user = profilo ? { id: "u1" } : null;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (profilo) client.setQueryData(queryKeys.profile("u1"), profilo);
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
    // per utente e sparerebbe una mutation propria dentro questi test: i due
    // che la riguardano tolgono questo segno da soli.
    window.localStorage.setItem(CHIAVE_MIGRAZIONE, "1");
  });

  it("la squadra scelta si vede subito, prima che il server risponda", async () => {
    // `favoriteTeam` legge `profile.favorite_team` per primo: senza
    // aggiornamento ottimistico, dal clic fino alla risposta della rete la
    // pagina continua a dire — e a mostrare — la squadra precedente.
    let risolvi: (v: unknown) => void = () => {};
    aggiorna.mockImplementationOnce(() => new Promise((res) => (risolvi = res)));

    monta();
    expect(bottone("squadra")).toHaveTextContent("juventus");

    await act(async () => bottone("squadra").click());
    // `waitFor` e non un assert secco perche' `onMutate` aspetta
    // `cancelQueries`, quindi l'anticipo arriva un microtask dopo il clic.
    // Non e' un rilassamento: la promessa del server e' ancora sospesa, quindi
    // «napoli» qui puo' venire soltanto dall'anticipo.
    await waitFor(() => expect(bottone("squadra")).toHaveTextContent("napoli"));

    await act(async () => risolvi({ data: { ...PROFILO, favorite_team: "napoli" }, error: null }));
    expect(bottone("squadra")).toHaveTextContent("napoli");
  });

  it("se il salvataggio fallisce la squadra torna quella di prima", async () => {
    aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

    monta();
    await act(async () => bottone("squadra").click());

    expect(bottone("squadra")).toHaveTextContent("juventus");
  });

  describe("valori che non sono slug", () => {
    // La preferenza e' nata come casella di testo libero: in
    // `profiles.favorite_team` e in `localStorage` puo' esserci qualunque
    // cosa sia stata digitata, anche niente. Nessuno di quei valori deve
    // arrivare a una chiave di cache o a una URL.

    it("un nome scritto a mano nel profilo diventa comunque una squadra vera", async () => {
      // «Internazionale» e non «Napoli»: un nome che coincide con lo slug
      // verrebbe risolto anche da una ricerca per solo slug, quindi non
      // distinguerebbe le due strade. Un alias si', ed e' esattamente quello
      // che la vecchia casella di testo permetteva di scrivere.
      monta({ profilo: { ...PROFILO, favorite_team: "  Internazionale " } });
      expect(bottone("squadra")).toHaveTextContent("inter");
    });

    it("un valore che non e' una squadra ricade sul default", async () => {
      monta({ profilo: { ...PROFILO, favorite_team: "la mia squadra" } });
      expect(bottone("squadra")).toHaveTextContent("juventus");
    });

    it("vale anche per quello che c'e' sul dispositivo, senza sessione", async () => {
      window.localStorage.setItem(TEAM_STORAGE_KEY, "Internazionale");
      monta({ profilo: null });
      expect(bottone("squadra")).toHaveTextContent("inter");
    });
  });

  describe("il ricordo sul dispositivo segue il profilo", () => {
    // Per un utente collegato vince il profilo, quindi un `localStorage`
    // rimasto indietro non si vede: si vede al primo accesso da scollegato,
    // con una squadra che il server aveva rifiutato.

    it("se il salvataggio fallisce torna indietro anche la squadra ricordata", async () => {
      aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

      monta();
      expect(ricordoLocale(TEAM_STORAGE_KEY)).toBe(null);

      await act(async () => bottone("squadra").click());

      expect(ricordoLocale(TEAM_STORAGE_KEY), "la scelta rifiutata non resta sul dispositivo").toBe(
        "juventus",
      );
    });

    it("se il salvataggio fallisce tornano indietro anche le sezioni ricordate", async () => {
      aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

      monta();
      await act(async () => bottone("sezioni").click());

      const ricordo = ricordoLocale(SECTIONS_STORAGE_KEY);
      expect(ricordo && (JSON.parse(ricordo) as { f1: boolean }).f1).toBe(true);
    });

    it("il tema lo rimette a posto il profilo, senza bisogno d'altro", async () => {
      // Qui non serve ripristino esplicito: `UserPrefsProvider` riallinea il
      // tema al profilo a ogni cambio, quindi il rollback della cache si
      // propaga da solo fino a `localStorage`. Il test esiste per accorgersi
      // se quel riallineamento sparisse.
      aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

      monta();
      await waitFor(() => expect(bottone("tema")).toHaveTextContent("light"));

      await act(async () => bottone("tema").click());

      await waitFor(() => expect(ricordoLocale("cse-theme")).toBe("light"));
    });
  });

  describe("migrazione al primo accesso", () => {
    beforeEach(() => {
      window.localStorage.removeItem(CHIAVE_MIGRAZIONE);
    });

    it("porta sul profilo lo slug, non quello che c'era scritto", async () => {
      window.localStorage.setItem(TEAM_STORAGE_KEY, "Internazionale");
      aggiorna.mockResolvedValueOnce({ data: PROFILO, error: null });

      monta();

      await waitFor(() => expect(aggiorna).toHaveBeenCalled());
      expect(aggiorna.mock.calls[0][0]).toMatchObject({ favorite_team: "inter" });
    });

    it("se fallisce, al prossimo accesso ci riprova", async () => {
      // Il segno «migrato» si scrive prima di sapere se il salvataggio
      // riesce: se resta dopo un errore, le preferenze del dispositivo sono
      // perse per sempre, in silenzio.
      aggiorna.mockRejectedValueOnce(new Error("il server ha detto no"));

      monta();

      await waitFor(() => expect(ricordoLocale(CHIAVE_MIGRAZIONE)).toBe(null));
    });
  });
});
