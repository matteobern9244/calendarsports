/**
 * Tabelle e funzioni pure di MotoGP: nomi dei GP in italiano e conversione
 * dall'orario locale del circuito a UTC.
 *
 * Vivono fuori da `index.ts` perche' quel file chiama `Deno.serve` a livello
 * di modulo: importarlo da un test farebbe partire un server. E' il motivo
 * per cui i vecchi test non riuscivano a toccare queste funzioni e finivano
 * per verificare le proprie fixture.
 */

// Italianizzazione nomi GP. L'API Pulselive ritorna nomi inglesi tipo
// "GRAND PRIX OF SPAIN". Mappiamo per nome evento (chiave: parte dopo
// "GRAND PRIX OF/DE/DEL ...", uppercase) a nome italiano standard.
// Coperti tutti i nomi GP che possono comparire nel calendario MotoGP.
const MOTOGP_GP_NAME_IT: Record<string, string> = {
  THAILAND: "GP della Thailandia",
  BRAZIL: "GP del Brasile",
  "THE UNITED STATES": "GP delle Americhe",
  "UNITED STATES": "GP delle Americhe",
  AMERICAS: "GP delle Americhe",
  SPAIN: "GP di Spagna",
  FRANCE: "GP di Francia",
  CATALONIA: "GP di Catalogna",
  CATALUNYA: "GP di Catalogna",
  ITALY: "GP d'Italia",
  HUNGARY: "GP d'Ungheria",
  CZECHIA: "GP della Repubblica Ceca",
  "CZECH REPUBLIC": "GP della Repubblica Ceca",
  "THE NETHERLANDS": "GP d'Olanda",
  NETHERLANDS: "GP d'Olanda",
  GERMANY: "GP di Germania",
  "UNITED KINGDOM": "GP della Gran Bretagna",
  "GREAT BRITAIN": "GP della Gran Bretagna",
  BRITAIN: "GP della Gran Bretagna",
  ARAGON: "GP d'Aragona",
  "SAN MARINO": "GP di San Marino",
  AUSTRIA: "GP d'Austria",
  JAPAN: "GP del Giappone",
  INDONESIA: "GP d'Indonesia",
  AUSTRALIA: "GP d'Australia",
  MALAYSIA: "GP della Malesia",
  QATAR: "GP del Qatar",
  PORTUGAL: "GP del Portogallo",
  VALENCIA: "GP di Valencia",
  "COMUNITAT VALENCIANA": "GP di Valencia",
  ARGENTINA: "GP d'Argentina",
  INDIA: "GP d'India",
};

export function italianizeGpName(rawName: string, countryName: string): string {
  // rawName tipo "GRAND PRIX OF SPAIN", "GRAND PRIX DE FRANCE",
  // "GRAND PRIX OF THE NETHERLANDS"
  const upper = rawName.toUpperCase().trim();
  const stripped = upper.replace(/^GRAND\s+PRIX\s+(OF\s+|DE\s+|DEL\s+|DI\s+)?/i, "").trim();
  if (MOTOGP_GP_NAME_IT[stripped]) return MOTOGP_GP_NAME_IT[stripped];
  // Fallback: prova con il country name (anche in upper)
  const countryUpper = (countryName || "").toUpperCase().trim();
  if (MOTOGP_GP_NAME_IT[countryUpper]) return MOTOGP_GP_NAME_IT[countryUpper];
  // Ultima spiaggia: titolo Capitalizzato
  const titled = stripped
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `GP di ${titled}`;
}

export const MOTOGP_EVENT_TIMEZONE_BY_COUNTRY: Record<string, string> = {
  AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna",
  AU: "Australia/Melbourne",
  BR: "America/Sao_Paulo",
  CZ: "Europe/Prague",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  FR: "Europe/Paris",
  GB: "Europe/London",
  HU: "Europe/Budapest",
  ID: "Asia/Makassar",
  IN: "Asia/Kolkata",
  IT: "Europe/Rome",
  JP: "Asia/Tokyo",
  MY: "Asia/Kuala_Lumpur",
  NL: "Europe/Amsterdam",
  PT: "Europe/Lisbon",
  QA: "Asia/Qatar",
  SM: "Europe/Rome",
  TH: "Asia/Bangkok",
  US: "America/Chicago",
};

export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return zonedAsUtc - date.getTime();
}

export function localWallTimeToUtcIso(dateStr: string, timeZone: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return dateStr;
  const [, y, mo, d, h, mi, s = "00"] = match;
  const wallAsUtc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  let utcMs = wallAsUtc - getTimeZoneOffsetMs(new Date(wallAsUtc), timeZone);
  utcMs = wallAsUtc - getTimeZoneOffsetMs(new Date(utcMs), timeZone);
  return new Date(utcMs).toISOString();
}
