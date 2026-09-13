import type { FootballMatch } from "@/lib/api/schemas";
import { getDateTimestamp } from "@/lib/dateUtils";
import { matchPhase } from "@/lib/matchPhase";

/**
 * La partita di calcio da mostrare in Home.
 *
 * Sta qui e non dentro la `useMemo` della pagina perche' la pagina apre una
 * dozzina di query prima di arrivare a questa riga: montarla per provare una
 * regola di tre righe significa non provarla.
 *
 * La regola era «la prima che comincia nel futuro», e aveva un buco esattamente
 * nel momento che conta: al fischio d'inizio la partita usciva dall'elenco e al
 * suo posto compariva quella della settimana dopo. Ora l'evidenza va a quella
 * in corso, e solo dopo alla prossima.
 */
export function partitaInEvidenza(
  matches: readonly FootballMatch[] | undefined,
  now: number,
): (FootballMatch & { date: string }) | null {
  if (!Array.isArray(matches)) return null;

  const conData = matches.filter(
    (m): m is FootballMatch & { date: string } => typeof m.date === "string",
  );
  const vive = conData.filter((m) => matchPhase(m, now).fase !== "finita");
  const ordinate = [...vive].sort((a, b) => getDateTimestamp(a.date) - getDateTimestamp(b.date));

  // Una partita in corso ha la precedenza su qualunque partita futura, anche
  // se l'ordine per data la metterebbe dopo.
  return ordinate.find((m) => matchPhase(m, now).fase === "in-corso") ?? ordinate[0] ?? null;
}
