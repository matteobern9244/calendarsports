import { createFileRoute } from "@tanstack/react-router";
import TeamRoute from "@/components/common/TeamRoute";
import TeamMatchPage from "@/pages/TeamMatchPage";

export const Route = createFileRoute("/_layout/squadra/$teamSlug/partite/$matchId")({
  component: () => <TeamRoute>{(team) => <TeamMatchPage team={team} />}</TeamRoute>,
});
