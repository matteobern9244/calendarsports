import { createFileRoute } from "@tanstack/react-router";
import PreferencesPage from "@/pages/PreferencesPage";

export const Route = createFileRoute("/_layout/preferenze")({
  component: PreferencesPage,
});
