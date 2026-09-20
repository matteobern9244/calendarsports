import { createFileRoute } from "@tanstack/react-router";
import CalendarPage from "@/pages/CalendarPage";

export const Route = createFileRoute("/_layout/calendario")({
  component: CalendarPage,
});
