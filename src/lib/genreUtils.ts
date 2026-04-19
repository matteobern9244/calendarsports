import type { StreamingFamilyId } from "@/lib/api/sportsApi";

/**
 * Inferenza euristica del genere quando l'edge function non lo fornisce.
 * Combina segnali di famiglia/canale (es. Sky Cinema -> Film) con keyword
 * nel titolo. Usata come fallback nella scheda "Stasera in TV" della Home.
 *
 * Le regex usano `\b` (word boundary) per evitare match parziali (es. "gp"
 * dentro "gpfileri") e l'ordine delle condizioni e' rilevante: i pattern
 * piu' specifici devono venire prima di quelli generici.
 */
export function inferGenre(
  family: StreamingFamilyId,
  channel: string,
  title: string,
): string | undefined {
  const t = title.toLowerCase();
  const ch = channel.toLowerCase();

  // Sky Cinema / canali "cinema" -> sempre Film
  if (family === "sky-cinema" || ch.includes("cinema")) return "Film";

  // Sky Sport / canali sport / Eurosport: classifica per disciplina
  if (family === "sky-sport" || ch.includes("sport") || ch.includes("eurosport")) {
    if (/motogp|moto2|moto3/.test(t)) return "MotoGP";
    if (/\bf1\b|formula 1|formula uno/.test(t)) return "Formula 1";
    if (/\bgran premio\b|\bgp\b/.test(t)) return "Formula 1";
    if (/\bchampions league\b|champions(?!\w)/.test(t)) return "Champions League";
    if (/europa league|conference league/.test(t)) return "Calcio";
    if (/calcio|serie a|coppa italia|napoli|juventus|inter|milan|roma|lazio/.test(t)) return "Calcio";
    if (/tennis|atp|wta|sinner|alcaraz|djokovic/.test(t)) return "Tennis";
    if (/basket|nba|eurolega/.test(t)) return "Basket";
    if (/ciclismo|giro d['’]italia|tour de france/.test(t)) return "Ciclismo";
    return "Sport";
  }

  // Keyword generiche nel titolo
  if (/\btg\d?\b|telegiornale|edizione delle/.test(t)) return "News";
  if (/\bmeteo\b/.test(t)) return "Meteo";
  if (/quiz|reazione a catena|l['’]eredita|caduta libera/.test(t)) return "Quiz";
  if (/striscia|paperissima|zelig|le iene|propaganda|porta a porta|piazzapulita|dimartedi|cartabianca|stasera italia/.test(t)) return "Talk Show";
  if (/grande fratello|temptation|amici|isola dei famosi|x factor|masterchef|pechino express|ballando/.test(t)) return "Reality";
  if (/documentar|inchies|presa diretta|\breport\b|petrolio/.test(t)) return "Documentario";
  if (/cartoni|pokemon|peppa|barbapapa/.test(t)) return "Cartoni";
  if (/\bfilm\b|\bmovie\b/.test(t)) return "Film";
  if (/serie tv|stagione \d+|episodio \d+|s\d+e\d+/.test(t)) return "Serie Tv";
  if (/\bconcerto\b|\bmusica\b|sanremo|festival/.test(t)) return "Musica";

  return undefined;
}
