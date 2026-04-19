import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Index from "./pages/Index";
import StreamingPage from "./pages/StreamingPage";
import SinnerPage from "./pages/SinnerPage";
import JuventusPage from "./pages/JuventusPage";
import Formula1Page from "./pages/Formula1Page";
import MotoGPPage from "./pages/MotoGPPage";
import NotFound from "./pages/NotFound";

const disableQueryRetries = import.meta.env.VITE_DISABLE_QUERY_RETRIES === "true";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: disableQueryRetries ? false : 3,
    },
  },
});

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
              <Route path="/sinner" element={<SinnerPage />} />
              <Route path="/juventus" element={<JuventusPage />} />
              <Route path="/formula1" element={<Formula1Page />} />
              <Route path="/motogp" element={<MotoGPPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

