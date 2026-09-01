import { toNumber, type FootballMatch } from "@/lib/api/schemas";

/**
 * Le deduzioni sulla singola partita Juventus, a partire dai nomi delle
 * squadre come li scrive Sky Sport: chi e' l'avversario, se si gioca in
 * casa, come e' finita. Erano ripetute in quattro punti della pagina, e un
 * errore avrebbe mostrato il logo sbagliato o una «V» su una sconfitta senza
 * che nessun test se ne accorgesse.
 */

export function isJuventus(team: string | null | undefined): boolean {
  return Boolean(team?.toLowerCase().includes("juventus"));
}

export function matchSide(match: FootballMatch): {
  isJuveHome: boolean;
  opponent: string;
  opponentLogo: string | null | undefined;
} {
  const isJuveHome = isJuventus(match.homeTeam);
  return {
    isJuveHome,
    opponent: isJuveHome ? match.awayTeam : match.homeTeam,
    opponentLogo: isJuveHome ? match.awayLogo : match.homeLogo,
  };
}

/** Vittoria, Sconfitta o Pareggio dal punto di vista bianconero. */
export type MatchResult = "V" | "S" | "P";

/** Solo a partita finita e con entrambi i punteggi: altrimenti null. */
export function matchResult(match: FootballMatch): MatchResult | null {
  if (match.status !== "FullTime") return null;
  const { isJuveHome } = matchSide(match);
  const juveGoals = toNumber(isJuveHome ? match.homeScore : match.awayScore);
  const oppGoals = toNumber(isJuveHome ? match.awayScore : match.homeScore);
  if (juveGoals === null || oppGoals === null) return null;
  return juveGoals > oppGoals ? "V" : juveGoals < oppGoals ? "S" : "P";
}

/** La differenza reti con il segno davanti quando e' positiva. */
export function formatGoalDiff(value: number | string | null | undefined): string | number | null {
  const diff = toNumber(value);
  return diff !== null && diff > 0 ? `+${diff}` : diff;
}
