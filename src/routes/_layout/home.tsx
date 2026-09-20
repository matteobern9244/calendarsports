import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

/** L'indirizzo proprio della Home, quello del menu'. */
export const Route = createFileRoute("/_layout/home")({
  component: Index,
});
