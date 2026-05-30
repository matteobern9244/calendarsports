import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

const SKY_SPORT_MOTOGP_URL = 'https://sport.sky.it/motogp/classifiche';
const MOTOGP_PULSELIVE_BASE = 'https://api.motogp.pulselive.com/motogp/v1/results';

// Italianizzazione nomi GP. L'API Pulselive ritorna nomi inglesi tipo
// "GRAND PRIX OF SPAIN". Mappiamo per nome evento (chiave: parte dopo
// "GRAND PRIX OF/DE/DEL ...", uppercase) a nome italiano standard.
// Coperti tutti i nomi GP che possono comparire nel calendario MotoGP.
const MOTOGP_GP_NAME_IT: Record<string, string> = {
  'THAILAND': 'GP della Thailandia',
  'BRAZIL': 'GP del Brasile',
  'THE UNITED STATES': 'GP delle Americhe',
  'UNITED STATES': 'GP delle Americhe',
  'AMERICAS': 'GP delle Americhe',
  'SPAIN': 'GP di Spagna',
  'FRANCE': 'GP di Francia',
  'CATALONIA': 'GP di Catalogna',
  'CATALUNYA': 'GP di Catalogna',
  'ITALY': "GP d'Italia",
  'HUNGARY': "GP d'Ungheria",
  'CZECHIA': 'GP della Repubblica Ceca',
  'CZECH REPUBLIC': 'GP della Repubblica Ceca',
  'THE NETHERLANDS': "GP d'Olanda",
  'NETHERLANDS': "GP d'Olanda",
  'GERMANY': 'GP di Germania',
  'UNITED KINGDOM': 'GP della Gran Bretagna',
  'GREAT BRITAIN': 'GP della Gran Bretagna',
  'BRITAIN': 'GP della Gran Bretagna',
  'ARAGON': "GP d'Aragona",
  'SAN MARINO': 'GP di San Marino',
  'AUSTRIA': "GP d'Austria",
  'JAPAN': 'GP del Giappone',
  'INDONESIA': "GP d'Indonesia",
  'AUSTRALIA': "GP d'Australia",
  'MALAYSIA': 'GP della Malesia',
  'QATAR': 'GP del Qatar',
  'PORTUGAL': 'GP del Portogallo',
  'VALENCIA': 'GP di Valencia',
  'COMUNITAT VALENCIANA': 'GP di Valencia',
  'ARGENTINA': "GP d'Argentina",
  'INDIA': "GP d'India",
};

function italianizeGpName(rawName: string, countryName: string): string {
  // rawName tipo "GRAND PRIX OF SPAIN", "GRAND PRIX DE FRANCE",
  // "GRAND PRIX OF THE NETHERLANDS"
  const upper = rawName.toUpperCase().trim();
  const stripped = upper.replace(/^GRAND\s+PRIX\s+(OF\s+|DE\s+|DEL\s+|DI\s+)?/i, '').trim();
  if (MOTOGP_GP_NAME_IT[stripped]) return MOTOGP_GP_NAME_IT[stripped];
  // Fallback: prova con il country name (anche in upper)
  const countryUpper = (countryName || '').toUpperCase().trim();
  if (MOTOGP_GP_NAME_IT[countryUpper]) return MOTOGP_GP_NAME_IT[countryUpper];
  // Ultima spiaggia: titolo Capitalizzato
  const titled = stripped
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `GP di ${titled}`;
}

// Cache stagioni Pulselive (TTL 24h). Le stagioni cambiano una volta l'anno.
let _seasonsCache: { at: number; data: Array<{ id: string; year: number; current: boolean }> } | null = null;
const SEASONS_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchMotoGPSeasonId(year: number): Promise<string | null> {
  const now = Date.now();
  if (!_seasonsCache || now - _seasonsCache.at > SEASONS_TTL_MS) {
    const res = await fetch(`${MOTOGP_PULSELIVE_BASE}/seasons`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' },
    });
    if (!res.ok) throw new Error(`Pulselive seasons returned ${res.status}`);
    const json = await res.json();
    _seasonsCache = { at: now, data: json };
  }
  const season = _seasonsCache.data.find(s => s.year === year);
  return season ? season.id : null;
}

type MotoGPCalendarEvent = {
  id: string;
  round: number;
  name: string;
  location: string;
  circuit: string;
  date_start: string;
  date_end: string;
  country: string;
  sessions?: MotoGPSession[];
};

/**
 * Sessione singola della classe MotoGP™ in un weekend di GP.
 * `type` è il codice originale Pulselive (FP|PR|Q|SPR|WUP|RAC),
 * `label` è la label italiana già pronta per la UI.
 * `date` è ISO con offset esplicito (Pulselive ritorna sempre UTC).
 */
export type MotoGPSession = {
  type: string;
  number: number | null;
  label: string;
  date: string;
};

const MOTOGP_SESSION_LABEL_IT = (type: string, number: number | null): string => {
  switch (type) {
    case 'FP':
      return number ? `Prove libere ${number}` : 'Prove libere';
    case 'PR':
      // "Practice" del venerdì pomeriggio (introdotta nel format 2023+)
      return 'Prove libere';
    case 'Q':
      return number ? `Qualifiche ${number}` : 'Qualifiche';
    case 'SPR':
      return 'Sprint';
    case 'WUP':
      return 'Warmup';
    case 'RAC':
      return 'Gara';
    default:
      return type;
  }
};

// Cache categoria MotoGP™ (id stagione-indipendente lato Pulselive ma per sicurezza
// ricalcolato da `categories?eventUuid=...` se cache miss). TTL 24h.
let _motogpCategoryCache: { at: number; id: string } | null = null;
const CATEGORY_TTL_MS = 24 * 60 * 60 * 1000;

const MOTOGP_EVENT_TIMEZONE_BY_COUNTRY: Record<string, string> = {
  AR: 'America/Argentina/Buenos_Aires',
  AT: 'Europe/Vienna',
  AU: 'Australia/Melbourne',
  BR: 'America/Sao_Paulo',
  CZ: 'Europe/Prague',
  DE: 'Europe/Berlin',
  ES: 'Europe/Madrid',
  FR: 'Europe/Paris',
  GB: 'Europe/London',
  HU: 'Europe/Budapest',
  ID: 'Asia/Makassar',
  IN: 'Asia/Kolkata',
  IT: 'Europe/Rome',
  JP: 'Asia/Tokyo',
  MY: 'Asia/Kuala_Lumpur',
  NL: 'Europe/Amsterdam',
  PT: 'Europe/Lisbon',
  QA: 'Asia/Qatar',
  SM: 'Europe/Rome',
  TH: 'Asia/Bangkok',
  US: 'America/Chicago',
};

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
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

function localWallTimeToUtcIso(dateStr: string, timeZone: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return dateStr;
  const [, y, mo, d, h, mi, s = '00'] = match;
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  let utcMs = wallAsUtc - getTimeZoneOffsetMs(new Date(wallAsUtc), timeZone);
  utcMs = wallAsUtc - getTimeZoneOffsetMs(new Date(utcMs), timeZone);
  return new Date(utcMs).toISOString();
}

async function fetchMotoGPCategoryId(sampleEventId: string): Promise<string | null> {
  const now = Date.now();
  if (_motogpCategoryCache && now - _motogpCategoryCache.at < CATEGORY_TTL_MS) {
    return _motogpCategoryCache.id;
  }
  try {
    const res = await fetch(
      `${MOTOGP_PULSELIVE_BASE}/categories?eventUuid=${sampleEventId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' } },
    );
    if (!res.ok) return null;
    const cats = await res.json() as Array<{ id: string; name: string; legacy_id?: number }>;
    const motogp = cats.find(c => c.legacy_id === 3 || /motogp/i.test(c.name));
    if (!motogp) return null;
    _motogpCategoryCache = { at: now, id: motogp.id };
    return motogp.id;
  } catch (e) {
    console.warn('Pulselive categories fetch failed:', e);
    return null;
  }
}

async function fetchMotoGPSessions(eventId: string, categoryId: string, eventTimeZone: string): Promise<MotoGPSession[]> {
  const res = await fetch(
    `${MOTOGP_PULSELIVE_BASE}/sessions?eventUuid=${eventId}&categoryUuid=${categoryId}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' } },
  );
  if (!res.ok) throw new Error(`Pulselive sessions returned ${res.status}`);
  const arr = await res.json() as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) return [];
  return arr
    .map(s => {
      const type = String(s.type ?? '');
      const number = s.number === null || s.number === undefined ? null : Number(s.number);
      const date = localWallTimeToUtcIso(String(s.date ?? ''), eventTimeZone);
      if (!type || !date) return null;
      return {
        type,
        number,
        label: MOTOGP_SESSION_LABEL_IT(type, number),
        date,
      } satisfies MotoGPSession;
    })
    .filter((s): s is MotoGPSession => s !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchMotoGPCalendar(year: number): Promise<MotoGPCalendarEvent[]> {
  const seasonId = await fetchMotoGPSeasonId(year);
  if (!seasonId) throw new Error(`Stagione MotoGP ${year} non trovata su Pulselive`);
  const res = await fetch(`${MOTOGP_PULSELIVE_BASE}/events?seasonUuid=${seasonId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' },
  });
  if (!res.ok) throw new Error(`Pulselive events returned ${res.status}`);
  const events = await res.json() as Array<Record<string, unknown>>;
  if (!Array.isArray(events)) throw new Error('Pulselive events: payload non valido');
  const races = events
    .filter(e => e && e.test === false)
    .map(e => {
      const circuit = (e.circuit ?? {}) as Record<string, unknown>;
      const country = (e.country ?? {}) as Record<string, unknown>;
      return {
        id: String(e.id ?? ''),
        date_start: String(e.date_start ?? ''),
        date_end: String(e.date_end ?? ''),
        name: italianizeGpName(String(e.name ?? ''), String(country.name ?? '')),
        location: String(circuit.place ?? ''),
        circuit: String(circuit.name ?? ''),
        country: String(country.iso ?? '').toUpperCase(),
      };
    })
    .filter(e => e.date_start && e.date_end)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .map((e, i) => ({ round: i + 1, ...e }));
  return races;
}

// MotoGP rider photos keyed by surname for reliable matching
const MOTOGP_RIDER_PHOTOS_BY_SURNAME: Record<string, string> = {
  'bagnaia': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/9772f542-8f9b-4a1c-b7a3-a5fe8f041f75/IfzOWPi2.png?height=200&width=200',
  'marc marquez': 'https://resources.motogp.pulselive.com/photo-resources/2026/04/01/8027468c-a966-4c58-ad26-17b68bb807b8/gItv2nNj.png?height=200&width=200',
  'alex marquez': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/71b70d16-3d66-4374-abf0-e439f76a13aa/WezEeZAR.png?height=200&width=200',
  'martin': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/8a56a9dd-c136-423c-b27b-6763ece0fdc4/y0EBqii2.png?height=200&width=200',
  'acosta': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/07d094fd-a8a6-44ae-a1db-67cd43151bfb/fcl8Ojai.png?height=200&width=200',
  'bastianini': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/32fd7aeb-d765-45d8-9da3-cc3ca25689cf/7pX3VTcG.png?height=200&width=200',
  'bezzecchi': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/4f18dc12-2fef-4ac2-bb31-7e7a220c0aa9/k2TFsiWh.png?height=200&width=200',
  'vinales': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/744f450c-6cbe-42e9-9654-da243fe60889/HMYXeFwb.png?height=200&width=200',
  'viñales': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/744f450c-6cbe-42e9-9654-da243fe60889/HMYXeFwb.png?height=200&width=200',
  'quartararo': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/73805511-aba7-4e37-9361-4e4b35da50fe/L72keLEc.png?height=200&width=200',
  'binder': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/9f5512f1-ea75-4c15-a1d7-f4172e8e8eda/PMd3LA13.png?height=200&width=200',
  'miller': 'https://resources.motogp.pulselive.com/photo-resources/2025/02/10/c1787ba0-46dd-4421-acc2-5b752cba4dd8/SNqHTjGK.png?height=200&width=200',
  'morbidelli': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/0cf208c4-e1b9-4a8c-ade6-73de98ae1701/motIUIeZ.png?height=200&width=200',
  'di giannantonio': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/d24b3386-4301-4208-ba99-cd9e5c1adc42/GdX3sMJC.png?height=200&width=200',
  'fernandez': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/08cfd905-a7b6-438f-949e-f7f480bf3ecd/8Mx8BEXK.png?height=200&width=200',
  'zarco': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/49611a81-9931-4191-9820-068b73b54f99/y0R5f9H5.png?height=200&width=200',
  'marini': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/73c8564a-a0e0-4dba-9385-a4c0df94d4fc/acF1q0Ma.png?height=200&width=200',
  'mir': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/ca35cfa3-a3cf-4bf0-abd0-56541a81c7a2/FhHj9jIJ.png?height=200&width=200',
  'rins': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/a50fc7d2-4099-4a4f-9c33-dc80ce4cb6fc/WIVVlRSf.png?height=200&width=200',
  'ogura': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/b1327ea2-7125-4c56-a3f8-f751f2118ced/nwXR2BjB.png?height=200&width=200',
  'razgatlioglu': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/743b343d-2b20-40a7-8ae0-e4f5a273503d/5Zq5W4Wt.png?height=200&width=200',
  'aldeguer': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/68e81f3f-b7fc-463b-9df2-d17c2ace42f7/YF1yv3Jm.png?height=200&width=200',
  'moreira': 'https://resources.motogp.pulselive.com/photo-resources/2026/03/04/63a4eefc-ce5c-40cc-9abd-870e7aabaa07/z6IXOQnm.png?height=200&width=200',
  'garcia': 'https://resources.motogp.pulselive.com/photo-resources/2025/11/07/3098c097-ebe6-438c-8615-673b8a8f5ff8/KVM5xr1H.png?height=200&width=200',
  'pirro': 'https://upload.wikimedia.org/wikipedia/commons/7/79/Michele_Pirro_at_the_2025_Malaysian_Grand_Prix.jpg',
  'savadori': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Lorenzo_Savadori_2021.jpg/200px-Lorenzo_Savadori_2021.jpg',
  'pedrosa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Dani_Pedrosa_2018.jpg/200px-Dani_Pedrosa_2018.jpg',
  'crutchlow': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Cal_Crutchlow_2019.jpg/200px-Cal_Crutchlow_2019.jpg',
  'bradl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Stefan_Bradl_2019.jpg/200px-Stefan_Bradl_2019.jpg',
};

// Full names for riders. Key format: "surname" or "surname-initial" (lowercase, normalized).
// Used to expand Sky Sport short names ("Pirro M.") to full "Nome Cognome" ("Michele Pirro").
const MOTOGP_RIDER_FULL_NAMES: Record<string, string> = {
  'bagnaia': 'Francesco Bagnaia',
  'marquez-m': 'Marc Marquez',
  'marquez-a': 'Alex Marquez',
  'martin': 'Jorge Martin',
  'acosta': 'Pedro Acosta',
  'bastianini': 'Enea Bastianini',
  'bezzecchi': 'Marco Bezzecchi',
  'vinales': 'Maverick Viñales',
  'viñales': 'Maverick Viñales',
  'quartararo': 'Fabio Quartararo',
  'binder': 'Brad Binder',
  'miller': 'Jack Miller',
  'morbidelli': 'Franco Morbidelli',
  'di giannantonio': 'Fabio Di Giannantonio',
  'fernandez-r': 'Raul Fernandez',
  'fernandez-a': 'Augusto Fernandez',
  'fernandez': 'Raul Fernandez',
  'zarco': 'Johann Zarco',
  'marini': 'Luca Marini',
  'mir': 'Joan Mir',
  'rins': 'Alex Rins',
  'ogura': 'Ai Ogura',
  'razgatlioglu': 'Toprak Razgatlioglu',
  'aldeguer': 'Fermin Aldeguer',
  'moreira': 'Diogo Moreira',
  'garcia': 'Sergio Garcia',
  'pirro': 'Michele Pirro',
  'savadori': 'Lorenzo Savadori',
  'pedrosa': 'Dani Pedrosa',
  'crutchlow': 'Cal Crutchlow',
  'bradl': 'Stefan Bradl',
  'oncu': 'Deniz Öncü',
  'rossi': 'Valentino Rossi',
};

// MotoGP rider race numbers keyed by surname (or surname-initial for ambiguous cases).
// Based on official MotoGP 2026 starting grid. Wildcard/replacements not mapped: returned as null.
const MOTOGP_RIDER_NUMBERS_BY_SURNAME: Record<string, number> = {
  'bagnaia': 63,
  'marquez-m': 93,
  'marquez-a': 73,
  'marc marquez': 93,
  'alex marquez': 73,
  'martin': 89,
  'acosta': 31,
  'bastianini': 23,
  'bezzecchi': 72,
  'vinales': 12,
  'viñales': 12,
  'quartararo': 20,
  'binder': 33,
  'miller': 43,
  'morbidelli': 21,
  'di giannantonio': 49,
  'fernandez-r': 25,
  'fernandez-a': 37,
  'fernandez': 25,
  'zarco': 5,
  'marini': 10,
  'mir': 36,
  'rins': 42,
  'ogura': 79,
  'razgatlioglu': 54,
  'aldeguer': 24,
  'moreira': 11,
  'garcia': 7,
  'pirro': 51,
  'savadori': 32,
  'pedrosa': 26,
  'crutchlow': 35,
  'bradl': 6,
};

// MotoGP rider nationalities keyed by surname (or surname-initial for ambiguous cases).
// ISO-3166-1 alpha-2 lowercase codes, used to render flags via flagcdn.com.
// Based on official MotoGP 2026 starting grid. Wildcard/replacements not mapped: returned as null.
const MOTOGP_RIDER_NATIONALITY_BY_SURNAME: Record<string, string> = {
  'bagnaia': 'it',
  'marquez-m': 'es',
  'marquez-a': 'es',
  'marc marquez': 'es',
  'alex marquez': 'es',
  'martin': 'es',
  'acosta': 'es',
  'bastianini': 'it',
  'bezzecchi': 'it',
  'vinales': 'es',
  'viñales': 'es',
  'quartararo': 'fr',
  'binder': 'za',
  'miller': 'au',
  'morbidelli': 'it',
  'di giannantonio': 'it',
  'fernandez-r': 'es',
  'fernandez-a': 'es',
  'fernandez': 'es',
  'zarco': 'fr',
  'marini': 'it',
  'mir': 'es',
  'rins': 'es',
  'ogura': 'jp',
  'razgatlioglu': 'tr',
  'aldeguer': 'es',
  'moreira': 'br',
  'garcia': 'es',
  'pirro': 'it',
  'savadori': 'it',
  'pedrosa': 'es',
  'crutchlow': 'gb',
  'bradl': 'de',
};

function expandRiderName(skyName: string): string {
  const normalized = skyName.toLowerCase().trim();
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Try surname-initial key first (handles Marquez M./A., Fernandez R./A.)
  if (initial && MOTOGP_RIDER_FULL_NAMES[`${surname}-${initial}`]) {
    return MOTOGP_RIDER_FULL_NAMES[`${surname}-${initial}`];
  }
  // Direct surname match
  if (MOTOGP_RIDER_FULL_NAMES[surname]) return MOTOGP_RIDER_FULL_NAMES[surname];

  // Accent-insensitive fallback
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, full] of Object.entries(MOTOGP_RIDER_FULL_NAMES)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return full;
  }

  // Fallback: return original Sky name to avoid losing data
  return skyName;
}

// MotoGP constructor/team logos.
// Asset locali serviti da `public/constructors-motogp/` per evitare il
// rate-limit costante di Wikimedia (HTTP 429) che faceva sparire i loghi
// dalla classifica costruttori. URL relativi: il frontend li risolve come
// asset statici dal proprio host.
const MOTOGP_CONSTRUCTOR_LOGOS: Record<string, string> = {
  'ducati': '/constructors-motogp/ducati.png',
  'aprilia': '/constructors-motogp/aprilia.png',
  'ktm': '/constructors-motogp/ktm.png',
  'yamaha': '/constructors-motogp/yamaha.png',
  'honda': '/constructors-motogp/honda.png',
};

// Cache team Pulselive (TTL 24h). Mappa nome team normalizzato -> URL foto
// ufficiale del team (campo `picture` dell'API Pulselive).
const MOTOGP_TEAMS_TTL_MS = 24 * 60 * 60 * 1000;
const MOTOGP_CATEGORY_UUID = '737ab122-76e1-4081-bedb-334caaa18c70';
let _teamsCache: { at: number; year: number; map: Record<string, string> } | null = null;

function normalizeTeamKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchMotoGPTeamPictures(year: number): Promise<Record<string, string>> {
  const now = Date.now();
  if (_teamsCache && _teamsCache.year === year && now - _teamsCache.at < MOTOGP_TEAMS_TTL_MS) {
    return _teamsCache.map;
  }
  try {
    const res = await fetch(
      `https://api.motogp.pulselive.com/motogp/v1/teams?seasonYear=${year}&categoryUuid=${MOTOGP_CATEGORY_UUID}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' } },
    );
    if (!res.ok) {
      console.warn(`MotoGP teams API returned ${res.status}`);
      return _teamsCache?.year === year ? _teamsCache.map : {};
    }
    const teams = await res.json() as Array<Record<string, unknown>>;
    const map: Record<string, string> = {};
    for (const t of teams) {
      const name = String(t.name ?? '').trim();
      const picture = t.picture ? String(t.picture) : null;
      if (name && picture) {
        map[normalizeTeamKey(name)] = picture;
      }
    }
    _teamsCache = { at: now, year, map };
    return map;
  } catch (e) {
    console.warn('MotoGP teams fetch failed:', e);
    return _teamsCache?.year === year ? _teamsCache.map : {};
  }
}

function findTeamLogo(teamName: string, teamMap: Record<string, string>): string | null {
  if (!teamName) return null;
  const key = normalizeTeamKey(teamName);
  if (teamMap[key]) return teamMap[key];
  // Fuzzy fallback: scarta token comuni (sponsor, parole generiche) e
  // calcola overlap di token significativi >=4 char tra il nome Sky e
  // ciascun nome Pulselive. Sceglie il match con piu' token in comune.
  const STOP = new Set(['team', 'racing', 'motogp', 'red', 'bull', 'monster', 'energy', 'castrol', 'pertamina', 'enduro', 'prima', 'pramac', 'lcr', 'lenovo', 'trackhouse', 'tech3', 'gresini', 'factory']);
  const skyTokens = key.split(' ').filter((t) => t.length >= 4 && !STOP.has(t));
  if (skyTokens.length === 0) return null;
  let best: { url: string; score: number } | null = null;
  for (const [pulseKey, url] of Object.entries(teamMap)) {
    const pulseTokens = new Set(pulseKey.split(' ').filter((t) => t.length >= 4));
    let score = 0;
    for (const t of skyTokens) if (pulseTokens.has(t)) score++;
    if (score > 0 && (!best || score > best.score)) best = { url, score };
  }
  return best ? best.url : null;
  return null;
}

function findRiderPhoto(name: string): string | null {
  const normalized = name.toLowerCase().trim();

  // Sky Sport format: "Surname Initial." e.g. "Bezzecchi M.", "Di Giannantonio F.", "Marquez M.", "Marquez A."
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Special handling for Marquez brothers
  if (surname === 'marquez' && initial) {
    if (initial === 'm') return MOTOGP_RIDER_PHOTOS_BY_SURNAME['marc marquez'];
    if (initial === 'a') return MOTOGP_RIDER_PHOTOS_BY_SURNAME['alex marquez'];
  }

  // Direct surname match
  if (MOTOGP_RIDER_PHOTOS_BY_SURNAME[surname]) return MOTOGP_RIDER_PHOTOS_BY_SURNAME[surname];

  // Normalize accented characters for matching (e.g. "vinales" matches "viñales")
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, url] of Object.entries(MOTOGP_RIDER_PHOTOS_BY_SURNAME)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return url;
  }

  return null;
}

function findRiderNumber(name: string): number | null {
  const normalized = name.toLowerCase().trim();
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Special handling for Marquez brothers
  if (surname === 'marquez' && initial) {
    if (initial === 'm') return MOTOGP_RIDER_NUMBERS_BY_SURNAME['marc marquez'] ?? null;
    if (initial === 'a') return MOTOGP_RIDER_NUMBERS_BY_SURNAME['alex marquez'] ?? null;
  }

  // Try surname-initial key (handles Fernandez R./A.)
  if (initial && MOTOGP_RIDER_NUMBERS_BY_SURNAME[`${surname}-${initial}`] != null) {
    return MOTOGP_RIDER_NUMBERS_BY_SURNAME[`${surname}-${initial}`];
  }

  // Direct surname match
  if (MOTOGP_RIDER_NUMBERS_BY_SURNAME[surname] != null) return MOTOGP_RIDER_NUMBERS_BY_SURNAME[surname];

  // Accent-insensitive fallback
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, num] of Object.entries(MOTOGP_RIDER_NUMBERS_BY_SURNAME)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return num;
  }

  return null;
}

function findRiderNationality(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Special handling for Marquez brothers
  if (surname === 'marquez' && initial) {
    if (initial === 'm') return MOTOGP_RIDER_NATIONALITY_BY_SURNAME['marc marquez'] ?? null;
    if (initial === 'a') return MOTOGP_RIDER_NATIONALITY_BY_SURNAME['alex marquez'] ?? null;
  }

  // Try surname-initial key (handles Fernandez R./A.)
  if (initial && MOTOGP_RIDER_NATIONALITY_BY_SURNAME[`${surname}-${initial}`]) {
    return MOTOGP_RIDER_NATIONALITY_BY_SURNAME[`${surname}-${initial}`];
  }

  // Direct surname match
  if (MOTOGP_RIDER_NATIONALITY_BY_SURNAME[surname]) return MOTOGP_RIDER_NATIONALITY_BY_SURNAME[surname];

  // Accent-insensitive fallback
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, code] of Object.entries(MOTOGP_RIDER_NATIONALITY_BY_SURNAME)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return code;
  }

  return null;
}

function getTeamConstructor(teamName: string): string | null {
  const t = teamName.toLowerCase();
  if (t.includes('ducati') || t.includes('vr46') || t.includes('pramac') || t.includes('gresini')) return 'ducati';
  if (t.includes('aprilia') || t.includes('trackhouse')) return 'aprilia';
  if (t.includes('ktm') || t.includes('tech3') || t.includes('gasgas')) return 'ktm';
  if (t.includes('yamaha')) return 'yamaha';
  if (t.includes('honda') || t.includes('lcr')) return 'honda';
  return null;
}

async function fetchSkyStandings(teamMap: Record<string, string> = {}): Promise<{
  pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null; number: number | null; nationality: string | null; teamLogoUrl: string | null }>;
  teams: Array<{ position: number; team: string; points: number; logoUrl: string | null; constructor: string | null }>;
}> {
  const res = await fetch(SKY_SPORT_MOTOGP_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' },
  });
  if (!res.ok) throw new Error(`Sky Sport returned ${res.status}`);
  const html = await res.text();

  const pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null; number: number | null; nationality: string | null; teamLogoUrl: string | null }> = [];
  const teams: Array<{ position: number; team: string; points: number; logoUrl: string | null; constructor: string | null }> = [];

  // Parse pilot standings table
  const pilotSection = html.split('Classifica Piloti MotoGP');
  if (pilotSection.length > 1) {
    const tableMatch = pilotSection[1].match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const tbody = tableMatch[1];
      const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length >= 5) {
          const c0 = cells[0], c2 = cells[2], c3 = cells[3], c4 = cells[4];
          if (!c0 || !c2 || !c3 || !c4) continue;
          const pos = parseInt(c0.replace(/<[^>]+>/g, '').trim());
          const nameRaw = c2.replace(/<[^>]+>/g, '').trim();
          const teamRaw = c3.replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(c4.replace(/<[^>]+>/g, '').trim());
          if (!isNaN(pos) && nameRaw) {
            pilots.push({
              position: pos,
              name: expandRiderName(nameRaw),
              team: teamRaw,
              points: pts || 0,
              photoUrl: findRiderPhoto(nameRaw),
              number: findRiderNumber(nameRaw),
              nationality: findRiderNationality(nameRaw),
              teamLogoUrl: findTeamLogo(teamRaw, teamMap),
            });
          }
        }
      }
    }
  }

  // Parse team standings table
  const teamSection = html.split('Classifica Team MotoGP');
  if (teamSection.length > 1) {
    const tableMatch = teamSection[1].match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const tbody = tableMatch[1];
      const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length >= 3) {
          const c0 = cells[0], c1 = cells[1], c2 = cells[2];
          if (!c0 || !c1 || !c2) continue;
          const pos = parseInt(c0.replace(/<[^>]+>/g, '').trim());
          const teamName = c1.replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(c2.replace(/<[^>]+>/g, '').trim());
          if (!isNaN(pos) && teamName) {
            const constructor = getTeamConstructor(teamName);
            teams.push({ position: pos, team: teamName, points: pts || 0, logoUrl: constructor ? (MOTOGP_CONSTRUCTOR_LOGOS[constructor] || null) : null, constructor: constructor });
          }
        }
      }
    }
  }

  return { pilots, teams };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: 'sports-motogp' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const seasonParam = url.searchParams.get('season');

    // Validate season strictly when provided to prevent future URL injection
    if (seasonParam !== null && !/^\d{4}$/.test(seasonParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid season parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data: any;
    let dataSource: 'live' | 'static-fallback' = 'live';
    const seasonYear = seasonParam ? parseInt(seasonParam, 10) : new Date().getFullYear();

    switch (action) {
      case 'calendar': {
        try {
          const events = await fetchMotoGPCalendar(seasonYear);
          const now = new Date();
          // Arricchimento sessioni MotoGP™ per ogni round via Pulselive.
          // Promise.allSettled: un singolo round senza sessioni non
          // blocca il calendario, sessions resta undefined. Mai dati
          // sintetici.
          const firstId = events.find(e => e.id)?.id ?? '';
          const categoryId = firstId ? await fetchMotoGPCategoryId(firstId) : null;
          let sessionsByRound: Array<MotoGPSession[] | undefined> = [];
          if (categoryId) {
            const results = await Promise.allSettled(
              events.map(e => {
                const eventTimeZone = MOTOGP_EVENT_TIMEZONE_BY_COUNTRY[e.country] ?? 'UTC';
                return e.id
                  ? fetchMotoGPSessions(e.id, categoryId, eventTimeZone)
                  : Promise.resolve([] as MotoGPSession[]);
              }),
            );
            sessionsByRound = results.map(r =>
              r.status === 'fulfilled' && r.value.length > 0 ? r.value : undefined,
            );
          }
          data = events.map((e, i) => ({
            ...e,
            sessions: sessionsByRound[i],
            status: new Date(e.date_end) < now ? 'finished' : 'upcoming',
          }));
          dataSource = 'live';
        } catch (e) {
          console.error('MotoGP calendar fetch failed:', e);
          data = [];
          dataSource = 'static-fallback';
        }
        break;
      }

      case 'standings': {
        try {
          const teamMap = await fetchMotoGPTeamPictures(seasonYear);
          const { pilots } = await fetchSkyStandings(teamMap);
          data = pilots;
          dataSource = pilots.length > 0 ? 'live' : 'static-fallback';
        } catch (e) {
          console.error('MotoGP standings fetch failed:', e);
          data = [];
          dataSource = 'static-fallback';
        }
        break;
      }

      case 'constructor-standings': {
        try {
          const { teams } = await fetchSkyStandings();
          data = teams;
          dataSource = teams.length > 0 ? 'live' : 'static-fallback';
        } catch (e) {
          console.error('MotoGP constructor standings failed:', e);
          data = [];
          dataSource = 'static-fallback';
        }
        break;
      }

      case 'next-event': {
        try {
          const events = await fetchMotoGPCalendar(seasonYear);
          const now = new Date();
          const next = events.find(e => new Date(e.date_start) > now);
          data = next ? { ...next, status: 'upcoming' } : null;
          dataSource = 'live';
        } catch (e) {
          console.error('MotoGP next-event fetch failed:', e);
          data = null;
          dataSource = 'static-fallback';
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, standings, constructor-standings, next-event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const meta = {
      dataSource,
      season: seasonParam ? parseInt(seasonParam, 10) : null,
      source:
        dataSource === 'live' && (action === 'calendar' || action === 'next-event')
          ? 'motogp.com (Pulselive API)'
          : dataSource === 'live'
            ? 'Sky Sport MotoGP'
            : 'Fallback (dati non disponibili)',
    };
    return new Response(JSON.stringify({ success: true, data, meta, source: meta.source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MotoGP API error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Errore interno del server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
