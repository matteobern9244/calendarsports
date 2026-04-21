import type { StreamingFamilyId } from "@/lib/api/sportsApi";

/**
 * Inferenza del genere con cascata di fallback DETERMINISTICA.
 *
 * Ritorna SEMPRE una stringa non vuota, in modo da garantire un chip
 * genere per ogni riga di "Stasera in TV". Il valore di default per
 * famiglia non e' un dato inventato: rappresenta la macro-categoria
 * coerente con il canale (es. Sky Cinema -> Film, Sky Sport -> Sport,
 * RAI/Mediaset generaliste -> Tv) basata su segnali reali (famiglia,
 * canale, titolo), in linea con la policy "real data only".
 *
 * Cascata in ordine:
 *  1) Famiglia/canale dedicati (Sky Cinema, Sky Sport, Eurosport, canali
 *     che contengono "cinema"/"sport").
 *  2) Match per keyword nel titolo (programmi italiani noti).
 *  3) Pattern strutturali del titolo (St. X / Stagione / Episodio,
 *     telegiornali, estrazione `(Genere)` finale dal titolo).
 *  4) Default deterministico per famiglia.
 */
export function inferGenre(
  family: StreamingFamilyId,
  channel: string,
  title: string,
): string {
  const t = title.toLowerCase();
  const ch = channel.toLowerCase();

  // ---------- Priorita' 1: famiglia/canale dedicati ----------
  if (family === "sky-cinema" || ch.includes("cinema")) return "Film";

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

  // ---------- Priorita' 2: keyword titolo (programmi italiani noti) ----------

  // News / TG
  if (/\btg\d?\b|telegiornale|edizione delle|edizione del tg/.test(t)) return "News";
  if (/\bmeteo\b/.test(t)) return "Meteo";

  // Quiz / Game show
  if (/quiz|reazione a catena|l['’]eredita|caduta libera|affari tuoi|the wall|avanti un altro|chi vuol essere milionario|soliti ignoti/.test(t)) return "Quiz";

  // Talk Show
  if (/striscia|paperissima|zelig|le iene|propaganda|porta a porta|piazzapulita|dimartedi|cartabianca|stasera italia|belve|che tempo che fa|domenica in|verissimo|pomeriggio cinque|quarta repubblica|controcorrente|zona bianca|dritto e rovescio|accordi e disaccordi|otto e mezzo|in onda/.test(t)) return "Talk Show";

  // Reality
  if (/grande fratello|temptation|amici|isola dei famosi|x factor|masterchef|pechino express|ballando|gf vip|the voice|tu si que vales|italia['’]?s got talent/.test(t)) return "Reality";

  // Cooking
  if (/bake off|cucine da incubo|4 ristoranti|hell['’]?s kitchen|4 hotel|family food fight/.test(t)) return "Cooking";

  // Lifestyle (Discovery / Real Time)
  if (/casa a prima vista|cortesie per gli ospiti|cake star|vado a vivere in campagna|little big italy/.test(t)) return "Lifestyle";

  // Documentario
  if (/documentar|inchies|presa diretta|\breport\b|petrolio|ulisse|superquark|\bgeo\b|kilimangiaro|passato e presente/.test(t)) return "Documentario";

  // Cartoni
  if (/cartoni|pokemon|peppa|barbapapa/.test(t)) return "Cartoni";

  // Fiction italiana nota
  if (/il commissario montalbano|don matteo|un posto al sole|\bcuori\b|mina settembre|che dio ci aiuti|imma tataranni|doc nelle tue mani|\bblanca\b|lolita lobosco|i bastardi di pizzofalcone|\bmakari\b|carosello carosone/.test(t)) return "Fiction";

  // Musica
  if (/\bconcerto\b|\bmusica\b|sanremo|festival/.test(t)) return "Musica";

  // Film generico per keyword
  if (/\bfilm\b|\bmovie\b/.test(t)) return "Film";

  // ---------- Priorita' 3: pattern strutturali ----------

  // Estrazione "(Genere)" finale dal titolo (es. "Le Iene presentano (Inchieste)")
  const tagMatch = title.match(/\(([A-Za-zÀ-ÿ ]{3,30})\)\s*$/);
  if (tagMatch) {
    const tag = tagMatch[1].trim().toLowerCase();
    if (/inchies|reportage/.test(tag)) return "Talk Show";
    if (/sport/.test(tag)) return "Sport";
    if (/film/.test(tag)) return "Film";
    if (/news|attualit/.test(tag)) return "News";
    if (/fiction|serie/.test(tag)) return "Fiction";
    if (/document/.test(tag)) return "Documentario";
    if (/intratten|varieta|show/.test(tag)) return "Talk Show";
    if (/musica/.test(tag)) return "Musica";
    if (/cucin|cooking/.test(tag)) return "Cooking";
    if (/lifestyle|casa/.test(tag)) return "Lifestyle";
  }

  // Pattern stagione/episodio -> Serie Tv
  if (/serie tv|stagione \d+|st\.\s*\d+|episodio \d+|s\d+e\d+/.test(t)) return "Serie Tv";

  // ---------- Priorita' 4: default per famiglia (fallback garantito) ----------
  switch (family) {
    case "rai":
    case "mediaset":
      return "Tv";
    case "discovery":
      return "Lifestyle";
    case "sky-sport":
      return "Sport";
    case "sky-cinema":
      return "Film";
    default:
      return "Tv";
  }
}
