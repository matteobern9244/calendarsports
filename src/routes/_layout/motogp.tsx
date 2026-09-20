import { createFileRoute } from "@tanstack/react-router";
import MotoGPPage from "@/pages/MotoGPPage";

export const Route = createFileRoute("/_layout/motogp")({
  component: MotoGPPage,
});
