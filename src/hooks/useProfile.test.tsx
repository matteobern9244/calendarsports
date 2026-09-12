import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Il finto backend: la catena vera e' `from().update().eq().select().single()`
 * e l'unico punto in cui produce una promessa e' `single()`. Il `patch` viene
 * passato al doppio cosi' un test puo' rispondere in modo diverso a seconda di
 * cosa e' stato chiesto.
 */
const { aggiorna, legge } = vi.hoisted(() => ({
  aggiorna: vi.fn<(patch: Record<string, unknown>) => Promise<unknown>>(),
  legge: vi.fn<() => Promise<unknown>>(),
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
      select: () => ({ eq: () => ({ maybeSingle: () => legge() }) }),
    }),
  },
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ session: null, user: sessione.user, loading: false, signOut: vi.fn() }),
}));

import { PROFILE_COLUMNS, useProfile, useUpdateProfile, type Profile } from "./useProfile";

const PROFILO: Profile = {
  id: "u1",
  display_name: null,
  theme: "light",
  favorite_team: "juventus",
  show_sinner: true,
  show_f1: true,
  show_motogp: true,
  show_home: true,
  show_calendario: true,
  show_streaming: true,
  show_squadra: true,
  start_page: "home",
};

/**
 * Un client con il profilo gia' in cache, come dopo la prima lettura.
 *
 * Il sentinella per «cache vuota» e' `null` e non `undefined`: passare
 * `undefined` a un parametro con valore di default fa scattare il default, e
 * il test si ritroverebbe la cache piena proprio nel caso in cui la vuole
 * vuota. E' successo scrivendo questo file.
 */
function ambiente(iniziale: Profile | null = PROFILO) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (iniziale) client.setQueryData(queryKeys.profile("u1"), iniziale);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const inCache = () => client.getQueryData<Profile>(queryKeys.profile("u1"));
  return { client, wrapper, inCache };
}

/** Sospende la prossima risposta e restituisce come farla arrivare. */
function rispostaSospesa() {
  let risolvi: (v: unknown) => void = () => {};
  let rifiuta: (e: unknown) => void = () => {};
  aggiorna.mockImplementationOnce(
    () =>
      new Promise((res, rej) => {
        risolvi = res;
        rifiuta = rej;
      }),
  );
  return {
    riesce: (profilo: Profile) => act(async () => risolvi({ data: profilo, error: null })),
    fallisce: () => act(async () => rifiuta(new Error("il server ha detto no"))),
  };
}

describe("useUpdateProfile", () => {
  beforeEach(() => {
    aggiorna.mockReset();
    legge.mockReset();
    sessione.user = { id: "u1" };
  });

  it("la preferenza cambia subito, senza aspettare il server", async () => {
    // Il difetto: `UserPrefsContext` legge `profile.favorite_team` per primo,
    // quindi finche' la risposta non arriva l'app resta sulla squadra vecchia.
    // Non e' un caricamento: e' la squadra sbagliata, mostrata come giusta.
    const { wrapper, inCache } = ambiente();
    const server = rispostaSospesa();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ favorite_team: "napoli" }));

    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));
    expect(result.current.isPending, "il server non ha ancora risposto").toBe(true);

    await server.riesce({ ...PROFILO, favorite_team: "napoli" });
    expect(inCache()?.favorite_team).toBe("napoli");
  });

  it("se il server rifiuta, la preferenza torna com'era", async () => {
    const { wrapper, inCache } = ambiente();
    const server = rispostaSospesa();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));

    await server.fallisce();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(inCache()?.favorite_team).toBe("juventus");
  });

  it("il rollback riguarda solo i campi che quella richiesta aveva toccato", async () => {
    // Due preferenze cambiate a distanza di un istante — sulla pagina delle
    // preferenze stanno una sopra l'altra. Se il rollback rimettesse a posto
    // l'intero profilo com'era prima della *prima* richiesta, il fallimento
    // del tema cancellerebbe anche la squadra, che invece il server ha
    // accettato. Nessun errore, nessuno spinner: la squadra torna indietro
    // da sola.
    const { wrapper, inCache } = ambiente();
    const tema = rispostaSospesa();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ theme: "dark" }));
    await waitFor(() => expect(inCache()?.theme).toBe("dark"));

    aggiorna.mockResolvedValueOnce({ data: { ...PROFILO, favorite_team: "napoli" }, error: null });
    act(() => result.current.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));

    await tema.fallisce();
    await waitFor(() => expect(inCache()?.theme).toBe("light"));
    expect(inCache()?.favorite_team, "la squadra era stata accettata").toBe("napoli");
  });

  it("una risposta in ritardo non riporta indietro un'altra preferenza", async () => {
    // Stessa coppia, ma questa volta va tutto bene: la riga che il server
    // restituisce per il tema e' stata letta *prima* che la squadra fosse
    // scritta, quindi contiene ancora `juventus`. Scriverla in cache per
    // intero disferebbe una modifica gia' confermata.
    const { wrapper, inCache } = ambiente();
    const tema = rispostaSospesa();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ theme: "dark" }));
    await waitFor(() => expect(inCache()?.theme).toBe("dark"));

    aggiorna.mockResolvedValueOnce({
      data: { ...PROFILO, theme: "dark", favorite_team: "napoli" },
      error: null,
    });
    act(() => result.current.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));

    await tema.riesce({ ...PROFILO, theme: "dark" });
    expect(inCache()?.theme).toBe("dark");
    expect(inCache()?.favorite_team, "la risposta del tema non sa della squadra").toBe("napoli");
  });

  it("senza profilo in cache non se ne inventa uno", async () => {
    // Prima che la lettura sia arrivata non c'e' niente da aggiornare in
    // modo ottimistico: un profilo costruito dal solo `patch` sarebbe fatto
    // per meta' di valori mai letti da nessuna parte.
    const { wrapper, inCache } = ambiente(null);
    const server = rispostaSospesa();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(inCache()).toBeUndefined();

    await server.riesce({ ...PROFILO, favorite_team: "napoli" });
    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));
  });

  it("una lettura gia' in volo non cancella l'anticipo", async () => {
    // Stesso sintomo del difetto principale, da un'altra porta: la risposta
    // di una lettura partita *prima* del clic contiene la riga di prima, e
    // atterrando dopo rimetterebbe in pagina la squadra precedente. E' quello
    // che `cancelQueries` impedisce, ed e' l'unica riga di `onMutate` che
    // nessun altro test qui dentro tiene ferma.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // In cache ma stantio: la query rifetcha al mount, quindi la lettura e'
    // in volo mentre il profilo e' gia' leggibile.
    client.setQueryData(queryKeys.profile("u1"), PROFILO, { updatedAt: 0 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const inCache = () => client.getQueryData<Profile>(queryKeys.profile("u1"));

    let rispondiAllaLettura: (v: unknown) => void = () => {};
    legge.mockImplementationOnce(() => new Promise((res) => (rispondiAllaLettura = res)));
    aggiorna.mockResolvedValueOnce({ data: { ...PROFILO, favorite_team: "napoli" }, error: null });

    const { result } = renderHook(() => ({ letto: useProfile(), aggiorna: useUpdateProfile() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.letto.isFetching).toBe(true));

    act(() => result.current.aggiorna.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(inCache()?.favorite_team).toBe("napoli"));

    await act(async () => rispondiAllaLettura({ data: PROFILO, error: null }));
    expect(inCache()?.favorite_team, "la lettura era partita prima del clic").toBe("napoli");
  });

  it("senza sessione non tocca la cache", async () => {
    sessione.user = null;
    const { wrapper, inCache } = ambiente();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => result.current.mutate({ favorite_team: "napoli" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aggiorna, "senza utente non si chiama il server").not.toHaveBeenCalled();
    expect(inCache()?.favorite_team).toBe("juventus");
  });
});

describe("PROFILE_COLUMNS", () => {
  /**
   * La lettura si chiude con `data as Profile`, che e' un'affermazione e non
   * un controllo: un campo aggiunto all'interfaccia ma dimenticato nella
   * select arriverebbe `undefined` senza che nessun typecheck se ne accorga,
   * e la preferenza corrispondente tornerebbe al default a ogni lettura.
   *
   * L'oggetto qui sotto e' esaustivo per costruzione — TypeScript pretende
   * tutte le chiavi di `Profile` — quindi questo test e' il punto in cui le
   * due cose non possono piu' divergere in silenzio.
   */
  it("legge tutti i campi che Profile dichiara", () => {
    const campi: Record<keyof Profile, true> = {
      id: true,
      display_name: true,
      theme: true,
      favorite_team: true,
      show_sinner: true,
      show_f1: true,
      show_motogp: true,
      show_home: true,
      show_calendario: true,
      show_streaming: true,
      show_squadra: true,
      start_page: true,
    };
    const lette = PROFILE_COLUMNS.split(",").map((colonna) => colonna.trim());
    for (const campo of Object.keys(campi)) expect(lette).toContain(campo);
  });
});
