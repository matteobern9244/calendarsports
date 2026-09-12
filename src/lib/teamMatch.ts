import { toNumber, type FootballMatch } from "@/lib/api/schemas";
import { matchesTeam, type SerieATeam } from "@/lib/serieATeams";

/**
 * Le deduzioni sulla singola partita a partire dai nomi delle squadre come li
 * scrive Sky Sport: chi e' l'avversario, se si gioca in casa, come e' finita.
 * Erano ripetute in quattro punti della pagina, e un errore avrebbe mostrato
 * il logo sbagliato o una «V» su una sconfitta senza che nessun test se ne
 * accorgesse.
 *
 * Il punto di vista e' un **parametro**. Finche' la pagina era solo quella
 * della Juventus la costante bastava; ora la stessa Juventus-Napoli compare in
 * due calendari, e in quello del Napoli l'avversario e' dall'altra parte e il
 * risultato e' rovesciato. Una costante avrebbe fatto chiamare «avversario» il
 * Napoli sulla pagina del Napoli.
 *
 * Il confronto e' `matchesTeam`, cioe' uguaglianza esatta sul nome
 * normalizzato: in Coppa Italia gioca la Juve Stabia, e un confronto per
 * sottostringa la scambierebbe per la Juventus in casa.
 */

/**
 * La convenzione con cui l'app scrive il lato: «vs» in casa, «@» in trasferta.
 *
 * Vive qui e non nei componenti perche' era un letterale ripetuto in cinque
 * punti, e uno dei cinque lo scriveva al contrario: la card della prossima
 * partita componeva «LAZIO @» sopra e «Milan» sotto, cioe' il Milan in casa,
 * mentre la riga di calendario della stessa partita diceva «@ Lazio». Due
 * viste che si contraddicono su un dato che l'app non possiede.
 */
export function matchPrefix(isHome: boolean): "vs" | "@" {
  return isHome ? "vs" : "@";
}

/**
 * La stessa informazione a parole. `@` e `vs` sono segni, e un segno da solo
 * non arriva a chi la pagina se la fa leggere: questa forma entra nel nome
 * accessibile del collegamento.
 */
export function matchVenue(isHome: boolean): "in casa" | "in trasferta" {
  return isHome ? "in casa" : "in trasferta";
}

export function matchSide(
  match: FootballMatch,
  team: SerieATeam,
): {
  /** La squadra scelta gioca in casa. */
  isHome: boolean;
  opponent: string;
  opponentLogo: string | null | undefined;
  /**
   * Lo stemma della squadra **scelta**, dalla parte giusta. Senza, chi lo
   * vuole (l'intestazione della pagina squadra) dovrebbe dedurre il lato una
   * seconda volta, ed e' da una seconda deduzione che nasce una divergenza.
   */
  teamLogo: string | null | undefined;
  prefix: "vs" | "@";
  venue: "in casa" | "in trasferta";
} {
  const isHome = matchesTeam(match.homeTeam, team);
  return {
    isHome,
    opponent: isHome ? match.awayTeam : match.homeTeam,
    opponentLogo: isHome ? match.awayLogo : match.homeLogo,
    teamLogo: isHome ? match.homeLogo : match.awayLogo,
    prefix: matchPrefix(isHome),
    venue: matchVenue(isHome),
  };
}

/** Vittoria, Sconfitta o Pareggio dal punto di vista della squadra scelta. */
export type MatchResult = "V" | "S" | "P";

/** Solo a partita finita e con entrambi i punteggi: altrimenti null. */
export function matchResult(match: FootballMatch, team: SerieATeam): MatchResult | null {
  if (match.status !== "FullTime") return null;
  const { isHome } = matchSide(match, team);
  const own = toNumber(isHome ? match.homeScore : match.awayScore);
  const other = toNumber(isHome ? match.awayScore : match.homeScore);
  if (own === null || other === null) return null;
  return own > other ? "V" : own < other ? "S" : "P";
}

/** La differenza reti con il segno davanti quando e' positiva. */
export function formatGoalDiff(value: number | string | null | undefined): string | number | null {
  const diff = toNumber(value);
  return diff !== null && diff > 0 ? `+${diff}` : diff;
}
