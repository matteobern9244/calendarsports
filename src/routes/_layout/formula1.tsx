import { createFileRoute } from "@tanstack/react-router";
import Formula1Page from "@/pages/Formula1Page";

export const Route = createFileRoute("/_layout/formula1")({
  component: Formula1Page,
});
