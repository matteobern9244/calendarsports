import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // defaultOptions portati dal vecchio src/App.tsx:
  // - retry false: il retry sui 502/503/504 vive gia' dentro `fetchEdgeWithRetry`
  //   (src/lib/api/sportsApi.ts); riprovare anche qui moltiplicherebbe i livelli.
  // - staleTime 5 min: le edge function tengono in cache i loro dati per minuti.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
