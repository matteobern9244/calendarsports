import { createFileRoute } from "@tanstack/react-router";
import StartRoute from "@/components/common/StartRoute";
import Index from "@/pages/Index";

/**
 * `/` non e' «la Home»: e' la decisione su dove atterrare. Quando la
 * preferenza e' la Home, `StartRoute` la mostra qui senza rimbalzare.
 */
export const Route = createFileRoute("/_layout/")({
  component: () => (
    <StartRoute>
      <Index />
    </StartRoute>
  ),
});
