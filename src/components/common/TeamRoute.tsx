import type { ReactNode } from "react";
import { useParams } from "@/lib/router-compat";
import NotFound from "@/pages/NotFound";
import { resolveTeamStrict, type SerieATeam } from "@/lib/serieATeams";
import { teamThemeClass, teamThemeStyle } from "@/lib/teamTheme";

/**
 * Il guardiano delle rotte `/squadra/:teamSlug`.
 *
 * Risolve lo slug **una volta sola** e consegna alla pagina la squadra gia'
 * fatta, cosi' la pagina non ha piu' un caso «e se non fosse una squadra?» da
 * gestire: il tipo dice che c'e'.
 *
 * La validazione e' quella **stretta**, non `resolveTeam`. La forma totale
 * ripiegherebbe sulla Juventus, e la pagina mostrerebbe i bianconeri sotto un
 * indirizzo che ne annuncia un'altra — per di piu' condivisibile, perche' una
 * URL si copia e si incolla. Un dato falso presentato come vero e' peggio di
 * una pagina che manca.
 *
 * Sta qui e non dentro la pagina perche' la pagina apre una dozzina di hook
 * prima di poter decidere qualsiasi cosa, e un `return` anticipato dopo un
 * hook non si puo' scrivere.
 */
export default function TeamRoute({ children }: { children: (team: SerieATeam) => ReactNode }) {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  const team = resolveTeamStrict(teamSlug);
  if (!team) return <NotFound />;
  // L'unico punto in cui la sezione squadra prende la sua identita' visiva:
  // colore e carattere scendono da qui a tutto quello che sta sotto, pagina
  // squadra e dettaglio partita compresi.
  return (
    <div className={teamThemeClass(team)} style={teamThemeStyle(team)}>
      {children(team)}
    </div>
  );
}
