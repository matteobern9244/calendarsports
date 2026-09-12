import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingState from "@/components/common/LoadingState";
import StartRoute from "@/components/common/StartRoute";
import TeamRoute from "@/components/common/TeamRoute";
import { DEFAULT_TEAM } from "@/lib/serieATeams";
import { teamMatchPath, teamPath } from "@/lib/teamRoutes";
import { HOME_PATH } from "@/lib/startPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserPrefsProvider } from "@/contexts/UserPrefsContext";
import Index from "./pages/Index";
// `NotFound` non e' piu' pigra: `TeamRoute` la mostra quando lo slug non e' una
// squadra, e quell'import statico rendeva il `lazy` inefficace: il bundler la
// metteva comunque nel chunk principale, piu' un chunk separato mai usato.
import NotFound from "./pages/NotFound";

// La Home resta nel bundle iniziale: e' la pagina su cui si atterra, caricarla
// in un secondo momento aggiungerebbe un'attesa invece di toglierla. Tutte le
// altre arrivano quando servono, cosi' chi apre la Home non scarica anche il
// calendario, lo streaming e tre classifiche.
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const StreamingPage = lazy(() => import("./pages/StreamingPage"));
const SinnerPage = lazy(() => import("./pages/SinnerPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const TeamMatchPage = lazy(() => import("./pages/TeamMatchPage"));
const Formula1Page = lazy(() => import("./pages/Formula1Page"));
const MotoGPPage = lazy(() => import("./pages/MotoGPPage"));
const PreferencesPage = lazy(() => import("./pages/PreferencesPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Il retry sui 502/503/504 vive gia' dentro `fetchEdgeWithRetry`
      // (src/lib/api/sportsApi.ts). Riprovare anche qui moltiplicherebbe i due
      // livelli: una edge function fredda produrrebbe fino a sedici richieste
      // per ogni query in pagina.
      retry: false,
      // Le edge function tengono in cache i loro dati per minuti: rileggerli a
      // ogni ritorno sulla scheda e' traffico che non cambia quello che si vede.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * I vecchi indirizzi della pagina Juventus.
 *
 * Sono stati condivisi, messi nei preferiti e indicizzati per anni: toglierli
 * trasformerebbe in 404 dei link che continuano a circolare. Il redirect
 * **sostituisce** la voce di cronologia, altrimenti il tasto «indietro»
 * tornerebbe su un indirizzo che rimanda subito avanti, cioe' una trappola da
 * cui non si esce piu'.
 */
const RedirectSquadraStorica = () => <Navigate to={teamPath(DEFAULT_TEAM)} replace />;

const RedirectPartitaStorica = () => {
  const { matchId = "" } = useParams<{ matchId: string }>();
  return <Navigate to={teamMatchPath(DEFAULT_TEAM, matchId)} replace />;
};

/** Mostrato mentre arriva il bundle di una pagina. */
const RouteFallback = () => (
  <div className="container py-8 sm:py-12">
    <LoadingState message="Caricamento..." />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserPrefsProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<Layout />}>
                    {/*
                      `/` non e' piu' «la Home»: e' la decisione su dove
                      atterrare. Quando la preferenza e' la Home, `StartRoute`
                      la mostra qui senza rimbalzare — cosi' il caso piu'
                      frequente non paga un reindirizzamento e i link verso `/`
                      gia' in circolazione continuano a valere.
                    */}
                    <Route
                      path="/"
                      element={
                        <StartRoute>
                          <Index />
                        </StartRoute>
                      }
                    />
                    {/* L'indirizzo proprio della Home, quello del menu'. */}
                    <Route path={HOME_PATH} element={<Index />} />
                    <Route path="/calendario" element={<CalendarPage />} />
                    <Route path="/streaming" element={<StreamingPage />} />
                    <Route path="/sinner" element={<SinnerPage />} />
                    <Route
                      path="/squadra/:teamSlug"
                      element={<TeamRoute>{(team) => <TeamPage team={team} />}</TeamRoute>}
                    />
                    <Route
                      path="/squadra/:teamSlug/partite/:matchId"
                      element={<TeamRoute>{(team) => <TeamMatchPage team={team} />}</TeamRoute>}
                    />
                    <Route path="/juventus" element={<RedirectSquadraStorica />} />
                    <Route path="/juventus/partite/:matchId" element={<RedirectPartitaStorica />} />
                    <Route path="/formula1" element={<Formula1Page />} />
                    <Route path="/motogp" element={<MotoGPPage />} />
                    <Route path="/preferenze" element={<PreferencesPage />} />
                    <Route path="/accedi" element={<AuthPage />} />
                    <Route path="/reimposta-password" element={<ResetPasswordPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </UserPrefsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
