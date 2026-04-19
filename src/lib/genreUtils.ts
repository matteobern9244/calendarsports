import type { StreamingFamilyId } from "@/lib/api/sportsApi";

/**
 * Inferenza euristica del genere quando l'edge function non lo fornisce.
 * Usa famiglia (es. Sky Cinema -> Film), nome canale e keyword nel titolo
 * come fallback per popolare il badge nella scheda Stasera in TV.
 *
 * Ritorna `undefined` se nessuna euristica matcha (badge non mostrato).
 */
export function inferGenre(
  family: StreamingFamilyId,
  channel: string,
  title: string,
): string | undefined {
  const t = title.toLowerCase();
  const ch = channel.toLowerCase();

  // Per famiglia/canale dedicato
  if (family === "sky-cinema" || ch.includes("cinema")) return "Film";
  if (family === "sky-sport" || ch.includes("sport") || ch.includes("eurosport")) {
    // Ordine importante: MotoGP prima di "gp\b" (Formula 1)
    if (/motogp|moto2|moto3/.test(t)) return "MotoGP";
    if (/formula 1|\bf1\b|gran premio|\bgp\b/.test(t)) return "Formula 1";
    if (/\b(serie a|champions league|europa league|coppa italia)\b|\b(napoli|juventus|inter|milan|roma)\b\s*[-–]/.test(t)) return "Calcio";
    if (/\bcalcio\b/.test(t)) return "Calcio";
    if (/tennis|\batp\b|\bwta\b|sinner|alcaraz/.test(t)) return "Tennis";
    if (/basket|\bnba\b|eurolega/.test(t)) return "Basket";
    if (/ciclismo|giro d['’]italia|tour de france/.test(t)) return "Ciclismo";
    return "Sport";
  }

  // Per keyword nel titolo
  if (/\btg\d?\b|telegiornale|\bnews\b|edizione delle/.test(t)) return "News";
  if (/meteo/.test(t)) return "Meteo";
  if (/quiz|reazione a catena|l['’]eredita|caduta libera/.test(t)) return "Quiz";
  if (/striscia|paperissima|zelig|le iene|propaganda|porta a porta|piazzapulita|dimartedi|cartabianca|stasera italia/.test(t)) return "Talk Show";
  if (/grande fratello|temptation|amici|isola dei famosi|x factor|masterchef|pechino express|ballando/.test(t)) return "Reality";
  if (/documentar|inchies|presa diretta|report|petrolio/.test(t)) return "Documentario";
  if (/cartoni|pokemon|peppa|barbapapa|peppa pig/.test(t)) return "Cartoni";
  if (/film\b|movie/.test(t)) return "Film";
  if (/serie tv|stagione|episodio|s\d+e\d+/.test(t)) return "Serie Tv";
  if (/concerto|musica|sanremo|festival/.test(t)) return "Musica";

  return undefined;
}
