/**
 * Le partite di una squadra dentro il widget calendario di Sky.
 *
 * Viveva dentro `index.ts`, che chiama `Deno.serve` a livello di modulo e non
 * si puo' quindi importare da un test: sessanta righe di produzione senza
 * nessuna verifica, ed erano proprio quelle in cui il punteggio di una partita
 * in corso veniva buttato via. Stessa ragione per cui `matchId.ts`,
 * `lineups.ts` e `matchDetail.ts` stanno gia' fuori.
 */
import { buildMatchId, romeDateKeyOf } from "./matchId.ts";
import { visibleScore } from "./matchStatus.ts";
import { matchInvolvesTeam } from "./teamFilter.ts";
import type { SerieATeam } from "../_shared/serieATeams.ts";

/** Gli id con cui Sky numera le competizioni che ci interessano. */
export const SERIE_A_COMP_ID = "21";
export const UCL_COMP_ID = "5";
export const COPPA_ITALIA_COMP_ID = "259";

export const COMPETITION_NAMES: Record<string, string> = {
  [SERIE_A_COMP_ID]: "Serie A",
  [UCL_COMP_ID]: "Champions League",
  [COPPA_ITALIA_COMP_ID]: "Coppa Italia",
};

/**
 * Ricava il nome competizione dallo slug presente nei link partita Sky
 * (es. ".../calcio/supercoppa-italiana/partite/..." -> "Supercoppa Italiana").
 * Serve per i tornei non presenti nella mappa statica.
 */
function competitionNameFromMatches(rounds: any[]): string | null {
  for (const round of rounds || []) {
    for (const matchDay of round?.matchDayList || []) {
      for (const match of matchDay?.matchList || []) {
        const link = String(match?.link || "");
        const m = link.match(/\/calcio\/([^/]+)\/partite\//i);
        if (m) {
          return m[1]
            .split("-")
            .filter(Boolean)
            .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
            .join(" ");
        }
      }
    }
  }
  return null;
}

export function extractTeamMatches(
  model: any,
  competitionId: string,
  broadcasterMap: Record<string, string>,
  team: SerieATeam,
): any[] {
  const rounds = model.competitionMatchList || [];
  const matches: any[] = [];
  const competitionName =
    COMPETITION_NAMES[competitionId] || competitionNameFromMatches(rounds) || "Altro";

  for (const round of rounds) {
    const roundNum = round.round;
    const matchDayList = round.matchDayList || [];
    for (const matchDay of matchDayList) {
      const matchList = matchDay.matchList || [];
      for (const match of matchList) {
        if (!matchInvolvesTeam(match, team)) continue;
        const homeName = match.home?.name || "";
        const awayName = match.away?.name || "";

        // Broadcaster lookup (only for Serie A)
        let broadcaster: string | null = null;
        if (competitionId === SERIE_A_COMP_ID) {
          if (roundNum && broadcasterMap[String(roundNum)]) {
            broadcaster = broadcasterMap[String(roundNum)];
          } else if (match.date) {
            const dateKey = romeDateKeyOf(match.date);
            broadcaster = (dateKey && broadcasterMap[`date:${dateKey}`]) || null;
          }
        }

        matches.push({
          id: buildMatchId(match, competitionName),
          // L'id **di Sky**, accanto al nostro. Il nostro identifica la partita
          // in modo stabile e leggibile e non cambia; questo e' la chiave con
          // cui si chiedono i widget del dettaglio. Viaggia da qui perche' il
          // widget del calendario ce l'ha gia': senza, per leggere un numero
          // servirebbe scaricare la pagina della partita, 250 KB.
          skyMatchId: typeof match.id === "string" ? match.id : null,
          matchday: roundNum,
          homeTeam: homeName,
          awayTeam: awayName,
          homeLogo: match.home?.logoUrl || null,
          awayLogo: match.away?.logoUrl || null,
          ...visibleScore(match),
          date: match.date,
          status: match.status,
          competition: competitionName,
          link: match.link || null,
          broadcaster,
        });
      }
    }
  }
  return matches;
}
