import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import LoadingState from "@/components/common/LoadingState";
import Index from "./pages/Index";

const SinnerPage = lazy(() => import("./pages/SinnerPage"));
const JuventusPage = lazy(() => import("./pages/JuventusPage"));
const Formula1Page = lazy(() => import("./pages/Formula1Page"));
const MotoGPPage = lazy(() => import("./pages/MotoGPPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const disableQueryRetries = import.meta.env.VITE_DISABLE_QUERY_RETRIES === "true";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: disableQueryRetries ? false : 3,
    },
  },
});

const withRouteSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<LoadingState message="Caricamento pagina..." />}>
    {element}
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/sinner" element={withRouteSuspense(<SinnerPage />)} />
              <Route path="/juventus" element={withRouteSuspense(<JuventusPage />)} />
              <Route path="/formula1" element={withRouteSuspense(<Formula1Page />)} />
              <Route path="/motogp" element={withRouteSuspense(<MotoGPPage />)} />
            </Route>
            <Route path="*" element={withRouteSuspense(<NotFound />)} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

