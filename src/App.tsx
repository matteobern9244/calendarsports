import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingState from "@/components/common/LoadingState";
import Index from "./pages/Index";

// La Home resta nel bundle iniziale: e' la pagina su cui si atterra, caricarla
// in un secondo momento aggiungerebbe un'attesa invece di toglierla. Tutte le
// altre arrivano quando servono, cosi' chi apre la Home non scarica anche il
// calendario, lo streaming e tre classifiche.
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const StreamingPage = lazy(() => import("./pages/StreamingPage"));
const SinnerPage = lazy(() => import("./pages/SinnerPage"));
const JuventusPage = lazy(() => import("./pages/JuventusPage"));
const JuventusMatchPage = lazy(() => import("./pages/JuventusMatchPage"));
const Formula1Page = lazy(() => import("./pages/Formula1Page"));
const MotoGPPage = lazy(() => import("./pages/MotoGPPage"));
const PreferencesPage = lazy(() => import("./pages/PreferencesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/streaming" element={<StreamingPage />} />
                <Route path="/sinner" element={<SinnerPage />} />
                <Route path="/juventus" element={<JuventusPage />} />
                <Route path="/juventus/partite/:matchId" element={<JuventusMatchPage />} />
                <Route path="/formula1" element={<Formula1Page />} />
                <Route path="/motogp" element={<MotoGPPage />} />
                <Route path="/preferenze" element={<PreferencesPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
