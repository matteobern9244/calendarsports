import { createFileRoute } from "@tanstack/react-router";
import SinnerPage from "@/pages/SinnerPage";

export const Route = createFileRoute("/_layout/sinner")({
  component: SinnerPage,
});
