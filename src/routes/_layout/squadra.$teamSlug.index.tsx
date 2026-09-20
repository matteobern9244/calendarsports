import { createFileRoute } from "@tanstack/react-router";
import TeamRoute from "@/components/common/TeamRoute";
import TeamPage from "@/pages/TeamPage";

export const Route = createFileRoute("/_layout/squadra/$teamSlug/")({
  component: () => <TeamRoute>{(team) => <TeamPage team={team} />}</TeamRoute>,
});
