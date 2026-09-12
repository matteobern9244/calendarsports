import type { FootballMatch, FootballStandingRow } from "@/lib/api/schemas";
import { matchesTeam, type SerieATeam } from "@/lib/serieATeams";
import { matchSide } from "@/lib/teamMatch";

/**
 * Lo stemma della squadra **seguita**, cioe' quella dell'indirizzo.
 *
 * Esiste perche' la squadra seguita e' modellata diversamente dalle
 * avversarie. Un'avversaria porta il suo stemma dentro la partita
 * (`homeLogo`/`awayLogo`); la squadra seguita e' una `SerieATeam`, e quel
 * dataset **di proposito** non ospita i loghi: lo dice il commento in testa a
 * `serieATeams.ts`, perche' logo e URL arrivano a runtime da `action=standings`
 * e li' restano aggiornati. Il risultato, prima di questa funzione, era che
 * tutte le avversarie avevano lo stemma e la squadra di cui e' la pagina no.
 *
 * Le due fonti sono le stesse che alimentano le avversarie, quindi lo stemma
 * arriva dalla stessa pipeline e non da un asset nostro. La precedenza va alla
 * classifica perche' e' l'unica a coprire anche le giornate senza partita in
 * calendario; la partita e' la riserva per quando la classifica non risponde.
 * Quando entrambe tacciono si restituisce `null`, e `TeamLogo` mostra le
 * iniziali: mai uno spazio vuoto, mai un salto di impaginazione.
 */
export function teamCrest(
  team: SerieATeam,
  sources: {
    standings?: readonly FootballStandingRow[] | null;
    match?: FootballMatch | null;
  },
): string | null {
  const riga = sources.standings?.find((s) => matchesTeam(s.team, team));
  if (riga?.logoUrl) return riga.logoUrl;

  const match = sources.match;
  if (!match) return null;
  // `matchSide` deduce il lato per esclusione: se la squadra non e' quella di
  // casa, e' l'ospite. Va benissimo per un calendario gia' filtrato, ma qui
  // servirebbe a prestare uno stemma altrui a una partita che non ci riguarda.
  // La verifica esplicita e' la stessa che fa `teamStats`.
  const nostra = matchesTeam(match.homeTeam, team) || matchesTeam(match.awayTeam, team);
  if (!nostra) return null;

  return matchSide(match, team).teamLogo ?? null;
}
