import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

// =====================================================================
// SOURCES:
//   - player-info  -> it.wikipedia.org/wiki/Jannik_Sinner   (profilo, ranking, palmarès Slam)
//   - schedule/results/next-event -> en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season
//     (la pagina IT della stagione 2026 non esiste in modo stabile)
// CACHE:  30 minutes server-side to respect fair use
// LIMITS: latency 24-48h editor lag; scraper fragile to layout changes
// =====================================================================

const WIKI_HEADERS = {
  'User-Agent': 'CalendarEvents/2.1 (https://rydercalendarevents.lovable.app)',
  'Accept': 'text/html',
};
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data as T;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data });
}

async function fetchWiki(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error('Wiki fetch error', url, e);
    return null;
  }
}

// ----- Helpers ---------------------------------------------------------
function stripTags(s: string): string {
  return s
    // remove inline <style> blocks (Wikipedia template styles)
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    // remove citation markers like [1], [12]
    .replace(/\[\s*\d+\s*\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#160;/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#91;\s*\d+\s*&#93;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function parseInfobox(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  // matches infobox-label/data pairs (first occurrence per label retained)
  const re = /class="infobox-label"[^>]*>([\s\S]{1,200}?)<\/th>\s*<td class="infobox-data"[^>]*>([\s\S]{0,500}?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const k = stripTags(m[1]).toLowerCase();
    if (!out[k]) out[k] = stripTags(m[2]);
  }
  return out;
}

/**
 * Parser per il template "sinottico" di Wikipedia Italia.
 * Estrae coppie <th>label</th><td>value</td> dalla tabella infobox principale,
 * mantenendo SOLO la prima occorrenza per ogni label (per Sinner: Singolare
 * appare prima del Doppio, quindi i valori "Vittorie/sconfitte", "Titoli vinti",
 * "Miglior ranking", "Ranking attuale" sono quelli del singolare).
 */
function parseSinottico(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Limito lo scraping alla prima tabella class="infobox sinottico" trovata.
  const tableMatch = html.match(/<table[^>]*class="[^"]*\bsinottico\b[^"]*"[\s\S]*?<\/table>/);
  const scope = tableMatch ? tableMatch[0] : html;
  const re = /<tr[^>]*>\s*<th[^>]*>([\s\S]{1,300}?)<\/th>\s*<td[^>]*>([\s\S]{0,800}?)<\/td>\s*<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    const k = stripTags(m[1]).toLowerCase();
    if (!k || k.length > 60) continue;
    if (!out[k]) out[k] = stripTags(m[2]);
  }
  return out;
}

/**
 * Parser palmarès Slam dall'infobox IT. Cerca le righe della sezione
 * "Risultati nei tornei del Grande Slam" + "Altri tornei" (Tour Finals).
 * Output: { australianOpen, rolandGarros, wimbledon, usOpen, tourFinals }
 * Ogni voce: { best: 'V'|'F'|'SF'|'QF'|... | null, years: number[], raw: string }
 */
interface SlamResult { best: string | null; years: number[]; raw: string }
function parseSlamResults(html: string): {
  australianOpen: SlamResult | null;
  rolandGarros: SlamResult | null;
  wimbledon: SlamResult | null;
  usOpen: SlamResult | null;
  tourFinals: SlamResult | null;
} {
  const tableMatch = html.match(/<table[^>]*class="[^"]*\bsinottico\b[^"]*"[\s\S]*?<\/table>/);
  const scope = tableMatch ? tableMatch[0] : html;

  function findRow(label: string): SlamResult | null {
    // Cerca <td>...label...</td><td>RAW</td>
    const re = new RegExp(
      `<td[^>]*>[^<]*(?:<[^>]+>[^<]*)*?\\b${label}\\b[\\s\\S]{0,400}?<\\/td>\\s*<td[^>]*>([\\s\\S]{0,400}?)<\\/td>`,
      'i',
    );
    const m = scope.match(re);
    if (!m) return null;
    const raw = stripTags(m[1]);
    if (!raw) return null;
    // Extract best result token at start: V, F, SF, QF, 4T, 3T, 2T, 1T, RR
    const bestMatch = raw.match(/^\s*([A-Z0-9]{1,3})\b/);
    const best = bestMatch ? bestMatch[1] : null;
    const years = [...raw.matchAll(/\b(20\d{2})\b/g)].map((y) => parseInt(y[1]));
    return { best, years, raw };
  }

  return {
    australianOpen: findRow('Australian Open'),
    rolandGarros: findRow('Roland Garros'),
    wimbledon: findRow('Wimbledon'),
    usOpen: findRow('US Open'),
    tourFinals: findRow('Tour Finals'),
  };
}

/**
 * Estrae la data "Statistiche aggiornate al 12 aprile 2026" dal piede infobox IT.
 * Restituisce ISO YYYY-MM-DD oppure null.
 */
function parseStatsUpdatedAt(html: string): string | null {
  const m = html.match(/Statistiche\s+aggiornate\s+al[\s\S]{0,40}?(\d{1,2})\s+([a-zA-Zàèéìòù]+)\s+(\d{4})/i);
  if (!m) return null;
  const monthsIt: Record<string, string> = {
    gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
    luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
  };
  const mm = monthsIt[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

function parseItalianDateInline(s: string): string | null {
  const m = s.match(/(\d{1,2})\s+([a-zA-Zàèéìòù]+)\s+(\d{4})/);
  if (!m) return null;
  const monthsIt: Record<string, string> = {
    gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
    luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
  };
  const mm = monthsIt[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

function parseDateText(s: string): string | null {
  // "16 August 2001" or "13 April 2026"
  const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const mm = months[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

// ----- Player info -----------------------------------------------------
// Foto principale dall'infobox IT (US Open 2025, cropped)
const PHOTO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Jannik_Sinner_US_Open_2025_%28cropped%29.jpg/500px-Jannik_Sinner_US_Open_2025_%28cropped%29.jpg';

async function getPlayerInfo() {
  const cached = getCached<unknown>('player-info');
  if (cached) return cached;

  // Profilo da Wikipedia ITALIA (etichette in italiano, contiene Peso e palmarès Slam)
  const html = await fetchWiki('https://it.wikipedia.org/wiki/Jannik_Sinner');
  // Stagione 2026 resta su Wikipedia EN: la voce IT non esiste in modo stabile
  const seasonHtml = await fetchWiki('https://en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season');

  const ib = html ? parseSinottico(html) : {};

  // --- Ranking attuale (singolare) ---
  // Esempio raw IT: "1º"
  const currentRanking = ib['ranking attuale'] || '';
  const rankNumMatch = currentRanking.match(/(\d+)\s*[ºo°]/);

  // --- Miglior ranking (singolare) ---
  // Esempio raw IT: "1º (10 giugno 2024)"
  const highest = ib['miglior ranking'] || '';
  const highestNumMatch = highest.match(/(\d+)\s*[ºo°]/);
  const highestDateIso = parseItalianDateInline(highest);

  // --- Vittorie/sconfitte (singolare) e titoli vinti ---
  // Le righe stanno dentro una tabella annidata "Singolare": il parser
  // generico le coglie solo se la <tr> ha le colonne dirette. Fallback
  // dedicato che cerca la PRIMA occorrenza dopo l'header "Singolare".
  let careerRecord = ib['vittorie/sconfitte'] || '';
  let careerTitlesRaw = ib['titoli vinti'] || '';
  if ((!careerRecord || !careerTitlesRaw) && html) {
    const singlesIdx = html.search(/>Singolare</);
    const doublesIdx = html.search(/>Doppio</);
    if (singlesIdx >= 0) {
      const slice = html.substring(singlesIdx, doublesIdx > singlesIdx ? doublesIdx : singlesIdx + 4000);
      if (!careerRecord) {
        const m = slice.match(/Vittorie\/sconfitte\s*<\/th>\s*<td[^>]*>([\s\S]{0,200}?)<\/td>/);
        if (m) careerRecord = stripTags(m[1]);
      }
      if (!careerTitlesRaw) {
        const m = slice.match(/Titoli vinti\s*<\/th>\s*<td[^>]*>([\s\S]{0,200}?)<\/td>/);
        if (m) careerTitlesRaw = stripTags(m[1]);
      }
    }
  }
  const careerTitlesNum = parseInt(careerTitlesRaw);

  // --- Misure ---
  const heightRaw = ib['altezza'] || '';
  // Normalizzo "191 cm" anche se ci sono spazi/markup residui
  const heightNum = heightRaw.match(/(\d{2,3})/);
  const height = heightNum ? `${heightNum[1]} cm` : heightRaw;

  const weightRaw = ib['peso'] || '';
  const weightNum = weightRaw.match(/(\d{2,3})/);
  const weight = weightNum ? `${weightNum[1]} kg` : weightRaw;

  // --- Coach: l'infobox IT NON ha questo campo. L'estrazione regex dal
  // testo è risultata inaffidabile (es. confonde nomi di familiari con il
  // coach). Lasciato a null: la UI nasconde semplicemente la riga.
  const coach: string | null = null;

  // --- Mano di gioco: idem, non in infobox IT - tentativo regex ---
  let plays: string | null = null;
  if (html) {
    const playsMatch = html.match(/(destrimane|mancino)/i);
    if (playsMatch) {
      plays = playsMatch[1].toLowerCase() === 'mancino' ? 'Sinistra' : 'Destra';
    }
  }

  // --- Nascita: dal primo paragrafo ("San Candido, 16 agosto 2001") ---
  let birthPlace = 'San Candido';
  let birthDate: string | null = '2001-08-16';
  if (html) {
    const bioMatch = html.match(/<b[^>]*>Jannik Sinner<\/b>[\s\S]{0,200}?\(([^)]+)\)/);
    if (bioMatch) {
      const inside = stripTags(bioMatch[1]);
      // "San Candido, 16 agosto 2001"
      const parts = inside.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        birthPlace = parts[0] || birthPlace;
        const iso = parseItalianDateInline(parts.slice(1).join(' '));
        if (iso) birthDate = iso;
      }
    }
  }

  // --- Palmarès Slam ---
  const slamResults = html ? parseSlamResults(html) : null;

  // --- Statistiche aggiornate al ... ---
  const statsUpdatedAt = html ? parseStatsUpdatedAt(html) : null;

  // 2026 season stats - real Wikipedia labels are "Season record" and "Calendar titles"
  let seasonRecord: string | null = null;
  let seasonTitles: number | null = null;
  if (seasonHtml) {
    const sib = parseInfobox(seasonHtml); // EN season page conserva schema infobox-label
    // First "Season record" entry is Singles (appears before Doubles)
    if (sib['season record']) seasonRecord = sib['season record'];
    if (sib['calendar titles']) {
      const n = parseInt(sib['calendar titles']);
      if (!isNaN(n)) seasonTitles = n;
    }
  }

  const data = {
    name: 'Jannik Sinner',
    ranking: rankNumMatch ? parseInt(rankNumMatch[1]) : null,
    rankingDate: statsUpdatedAt, // su IT il ranking attuale non ha data inline; uso statsUpdatedAt
    careerHigh: highestNumMatch ? parseInt(highestNumMatch[1]) : null,
    careerHighDate: highestDateIso,
    nationality: 'Italia',
    country: 'IT',
    birthDate,
    birthPlace,
    height,
    weight,
    plays,
    coach,
    turnedPro: null,
    careerRecord,
    careerTitles: !isNaN(careerTitlesNum) ? careerTitlesNum : null,
    prizeMoney: null, // non presente nell'infobox IT
    seasonRecord,
    seasonTitles,
    slamResults,
    statsUpdatedAt,
    photoUrl: PHOTO_URL,
    source: 'Wikipedia Italia (it.wikipedia.org)',
  };

  setCached('player-info', data);
  return data;
}

// ----- 2026 season matches & tournaments -------------------------------
interface MatchRow {
  tournament: string;
  tournamentSlug: string;
  date: string;            // ISO start date of tournament
  dateEnd: string | null;
  surface: string;
  location: string;
  tier: string;
  round: string;
  opponent: string;
  opponentRank: number | null;
  score: string;
  result: 'V' | 'S' | null; // Win/Loss
}

interface TournamentRow {
  name: string;
  date: string;
  dateEnd: string | null;
  surface: string;
  location: string;
  tier: string;
  status: 'completato' | 'in corso' | 'programmato';
  result: string | null;   // e.g. 'W', 'F', 'SF', or null if upcoming
}

function parseTournamentHeader(cellHtml: string): {
  name: string; location: string; tier: string; surface: string;
  date: string | null; dateEnd: string | null;
} {
  const text = stripTags(cellHtml);
  // Patterns inside header cell:
  // "Australian Open Melbourne, Australia Grand Slam tournament Hard, outdoor 18 January – 1 February 2026"
  const lines = text.split(/(?<=Australia|France|Italy|USA|Spain|Germany|Austria|UK|China|Canada|Qatar|UAE)\s|(?:Tournament|Hard|Clay|Grass|Hard \(Indoor\))/);
  // simpler approach: regex on date range
  const dateRangeRe = /(\d{1,2})\s+([A-Za-z]+)(?:\s*[–-]\s*(\d{1,2})\s+([A-Za-z]+))?\s+(\d{4})/;
  const dr = text.match(dateRangeRe);
  let date: string | null = null;
  let dateEnd: string | null = null;
  if (dr) {
    const months: Record<string, string> = {
      january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
      july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'
    };
    const startMonth = months[dr[2].toLowerCase()];
    const endMonth = dr[4] ? months[dr[4].toLowerCase()] : startMonth;
    const year = dr[5];
    if (startMonth) date = `${year}-${startMonth}-${dr[1].padStart(2,'0')}`;
    if (dr[3] && endMonth) dateEnd = `${year}-${endMonth}-${dr[3].padStart(2,'0')}`;
  }

  // Name: first link inside cell
  const nameMatch = cellHtml.match(/<a[^>]*title="[^"]*"[^>]*>([^<]+)<\/a>/);
  const name = nameMatch ? stripTags(nameMatch[1]) : text.split(/\s\s/)[0];

  // Surface
  let surface = '';
  if (/Hard,\s*indoor|Hard \(Indoor\)/i.test(text)) surface = 'Hard (Indoor)';
  else if (/Hard/i.test(text)) surface = 'Hard';
  else if (/Clay/i.test(text)) surface = 'Clay';
  else if (/Grass/i.test(text)) surface = 'Grass';

  // Tier
  let tier = '';
  if (/Grand Slam/i.test(text)) tier = 'Grand Slam';
  else if (/ATP Finals|Tour Finals/i.test(text)) tier = 'Tour Finals';
  else if (/ATP 1000|Masters 1000/i.test(text)) tier = 'ATP 1000';
  else if (/ATP 500/i.test(text)) tier = 'ATP 500';
  else if (/ATP 250/i.test(text)) tier = 'ATP 250';
  else if (/Davis Cup/i.test(text)) tier = 'Davis Cup';

  // Location: usually after name, before tier
  const afterName = name ? text.substring(text.indexOf(name) + name.length) : text;
  const locMatch = afterName.match(/^\s*([A-Z][\w\s,'-]+?)\s+(?:Grand Slam|ATP|Tour Finals|Davis|Hard|Clay|Grass)/);
  const location = locMatch ? locMatch[1].trim().replace(/\s+,/g,',') : '';

  return { name: name || 'Unknown', location, tier, surface, date, dateEnd };
}

async function getSeasonData() {
  const cached = getCached<{ matches: MatchRow[]; tournaments: TournamentRow[]; curatedAppended: boolean }>('season-2026');
  if (cached) return cached;

  const html = await fetchWiki('https://en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season');
  if (!html) return { matches: [], tournaments: [], curatedAppended: false };

  // Locate Singles_matches section
  const sectionStart = html.indexOf('id="Singles_matches"');
  if (sectionStart < 0) return { matches: [], tournaments: [], curatedAppended: false };
  const tableStart = html.indexOf('<table', sectionStart);
  const tableEnd = html.indexOf('</table>', tableStart);
  if (tableStart < 0 || tableEnd < 0) return { matches: [], tournaments: [], curatedAppended: false };
  const tableHtml = html.substring(tableStart, tableEnd);

  // Parse rows
  const rows = tableHtml.split(/<tr[^>]*>/).slice(1);
  const matches: MatchRow[] = [];
  const tournamentMap = new Map<string, { header: ReturnType<typeof parseTournamentHeader>; matches: MatchRow[] }>();
  let currentTour: ReturnType<typeof parseTournamentHeader> | null = null;
  let currentTourKey = '';

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    if (cells.length === 0) continue;

    // Tournament header cell has rowspan
    const firstCellMatch = row.match(/<td[^>]*rowspan="(\d+)"[^>]*>([\s\S]*?)<\/td>/);
    if (firstCellMatch && cells.length === 1) {
      currentTour = parseTournamentHeader(firstCellMatch[2]);
      currentTourKey = currentTour.name;
      tournamentMap.set(currentTourKey, { header: currentTour, matches: [] });
      continue;
    }

    // Match row: 6 cells (match#, round, opponent, rank, result, score)
    if (cells.length >= 6 && currentTour) {
      const round = stripTags(cells[1]);
      const opponent = stripTags(cells[2]).replace(/\s*\(.*?\)\s*$/, '').trim();
      const rankText = stripTags(cells[3]);
      const opponentRank = parseInt(rankText) || null;
      const resultText = stripTags(cells[4]).toLowerCase();
      const result: 'V' | 'S' | null = resultText.includes('win') ? 'V'
        : resultText.includes('loss') ? 'S' : null;
      const score = stripTags(cells[5]).replace(/\[\d+\]/g, '').trim();

      const m: MatchRow = {
        tournament: currentTour.name,
        tournamentSlug: currentTour.name.toLowerCase().replace(/\s+/g, '-'),
        date: currentTour.date || '',
        dateEnd: currentTour.dateEnd,
        surface: currentTour.surface,
        location: currentTour.location,
        tier: currentTour.tier,
        round,
        opponent,
        opponentRank,
        score,
        result,
      };
      matches.push(m);
      tournamentMap.get(currentTourKey)?.matches.push(m);
    }
  }

  // Build tournament summary list
  const now = new Date();
  const tournaments: TournamentRow[] = [];
  for (const [, { header, matches: tm }] of tournamentMap) {
    if (!header.date) continue;
    const startD = new Date(header.date);
    const endD = header.dateEnd ? new Date(header.dateEnd) : startD;

    let result: string | null = null;
    if (tm.length > 0) {
      const last = tm[tm.length - 1];
      if (last.result === 'V') {
        // Won the tournament if last round is final marker
        if (/^F$|Final/i.test(last.round)) result = 'W';
        else result = last.round;
      } else if (last.result === 'S') {
        result = last.round;
      }
    }

    let status: TournamentRow['status'] = 'programmato';
    if (endD < now && tm.length > 0) status = 'completato';
    else if (startD <= now && endD >= now) status = 'in corso';

    tournaments.push({
      name: header.name,
      date: header.date,
      dateEnd: header.dateEnd,
      surface: header.surface,
      location: header.location,
      tier: header.tier,
      status,
      result,
    });
  }

  // Add upcoming tournaments from ATP 2026 calendar (best-effort)
  // For simplicity, append a curated upcoming list if Wikipedia season page lacks future events
  const upcomingFromSeason = tournaments.some(t => new Date(t.date) > now);
  let curatedAppended = false;
  if (!upcomingFromSeason) {
    const upcoming: TournamentRow[] = [
      { name: 'Madrid Open', date: '2026-04-22', dateEnd: '2026-05-03', surface: 'Clay', location: 'Madrid, Spagna', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'Italian Open', date: '2026-05-04', dateEnd: '2026-05-17', surface: 'Clay', location: 'Roma, Italia', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'Roland Garros', date: '2026-05-24', dateEnd: '2026-06-07', surface: 'Clay', location: 'Parigi, Francia', tier: 'Grand Slam', status: 'programmato', result: null },
      { name: 'Halle Open', date: '2026-06-15', dateEnd: '2026-06-21', surface: 'Grass', location: 'Halle, Germania', tier: 'ATP 500', status: 'programmato', result: null },
      { name: 'Wimbledon', date: '2026-06-29', dateEnd: '2026-07-12', surface: 'Grass', location: 'Londra, UK', tier: 'Grand Slam', status: 'programmato', result: null },
      { name: 'Canadian Open', date: '2026-08-01', dateEnd: '2026-08-13', surface: 'Hard', location: 'Toronto, Canada', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'Cincinnati Open', date: '2026-08-13', dateEnd: '2026-08-23', surface: 'Hard', location: 'Cincinnati, USA', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'US Open', date: '2026-08-30', dateEnd: '2026-09-13', surface: 'Hard', location: 'New York, USA', tier: 'Grand Slam', status: 'programmato', result: null },
      { name: 'Shanghai Masters', date: '2026-10-07', dateEnd: '2026-10-18', surface: 'Hard', location: 'Shanghai, Cina', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'Paris Masters', date: '2026-11-02', dateEnd: '2026-11-08', surface: 'Hard (Indoor)', location: 'Parigi, Francia', tier: 'ATP 1000', status: 'programmato', result: null },
      { name: 'ATP Finals', date: '2026-11-15', dateEnd: '2026-11-22', surface: 'Hard (Indoor)', location: 'Torino, Italia', tier: 'Tour Finals', status: 'programmato', result: null },
    ];
    for (const u of upcoming) tournaments.push(u);
    curatedAppended = true;
  }

  tournaments.sort((a, b) => a.date.localeCompare(b.date));

  const data = { matches, tournaments, curatedAppended };
  setCached('season-2026', data);
  return data;
}

// =====================================================================
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const rl = checkRateLimit(req, { key: 'sports-tennis' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const seasonParam = url.searchParams.get('season');
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');

    if (seasonParam !== null && !/^\d{4}$/.test(seasonParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid season parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pageParam !== null && !/^\d+$/.test(pageParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Parametro page non valido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (pageSizeParam !== null && !/^\d+$/.test(pageSizeParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Parametro pageSize non valido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const season = seasonParam ? parseInt(seasonParam) : 2026;
    // Paginazione (usata solo da action=results, ignorata altrove).
    // Default: 12 risultati per pagina, max 50 per evitare payload abusivi.
    const page = Math.max(1, pageParam ? parseInt(pageParam) : 1);
    const pageSize = Math.min(50, Math.max(1, pageSizeParam ? parseInt(pageSizeParam) : 12));
    let data: unknown;
    let dataSource: 'wikipedia' | 'wikipedia+curated' | 'static-fallback' = 'wikipedia';

    switch (action) {
      case 'player-info': {
        data = await getPlayerInfo();
        break;
      }
      case 'next-event': {
        if (season !== 2026) { data = null; break; }
        const sd = await getSeasonData();
        const { tournaments } = sd;
        if (sd.curatedAppended) dataSource = 'wikipedia+curated';
        const now = new Date();
        data = tournaments.find(t => new Date(t.dateEnd || t.date) >= now && !t.result) || null;
        break;
      }
      case 'schedule': {
        if (season !== 2026) { data = []; break; }
        const sd = await getSeasonData();
        const { tournaments } = sd;
        if (sd.curatedAppended) dataSource = 'wikipedia+curated';
        data = tournaments;
        break;
      }
      case 'results': {
        if (season !== 2026) {
          data = { items: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 } };
          break;
        }
        const sd = await getSeasonData();
        const { matches } = sd;
        // Ordine decrescente per data (match piu' recenti per primi):
        // string compare su ISO YYYY-MM-DD e' affidabile per la
        // cronologia stagionale.
        const sorted = [...matches].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * pageSize;
        const items = sorted.slice(start, start + pageSize);
        data = {
          items,
          pagination: { page: safePage, pageSize, total, totalPages },
        };
        break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Azione non valida. Usa: player-info, schedule, results, next-event' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const meta = {
      dataSource,
      season,
      source: 'Wikipedia (IT profilo + EN stagione 2026)',
    };
    return new Response(JSON.stringify({ success: true, data, meta, source: meta.source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tennis API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
