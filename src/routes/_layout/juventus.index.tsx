import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_TEAM } from "@/lib/serieATeams";
import { teamPath } from "@/lib/teamRoutes";

/**
 * Vecchio indirizzo della pagina Juventus: condiviso e indicizzato per anni,
 * il redirect sostituisce la voce di cronologia per non creare trappole
 * col tasto «indietro».
 */
export const Route = createFileRoute("/_layout/juventus/")({
  beforeLoad: () => {
    throw redirect({ href: teamPath(DEFAULT_TEAM), replace: true });
  },
});
