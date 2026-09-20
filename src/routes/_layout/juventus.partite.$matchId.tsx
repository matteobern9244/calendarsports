import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_TEAM } from "@/lib/serieATeams";
import { teamMatchPath } from "@/lib/teamRoutes";

/** Vecchio indirizzo del dettaglio partita Juventus: redirect permanente lato router. */
export const Route = createFileRoute("/_layout/juventus/partite/$matchId")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: teamMatchPath(DEFAULT_TEAM, params.matchId), replace: true });
  },
});
