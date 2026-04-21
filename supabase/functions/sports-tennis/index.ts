import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

// =====================================================================
// SOURCE: Wikipedia (en.wikipedia.org) - public HTML scraping
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
const PHOTO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Jannik_Sinner_2025_US_Open.jpg/500px-Jannik_Sinner_2025_US_Open.jpg';

async function getPlayerInfo() {
  const cached = getCached<unknown>('player-info');
  if (cached) return cached;

  const html = await fetchWiki('https://en.wikipedia.org/wiki/Jannik_Sinner');
  const seasonHtml = await fetchWiki('https://en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season');

  const ib = html ? parseInfobox(html) : {};

  const currentRanking = ib['current ranking'] || '';
  const rankNumMatch = currentRanking.match(/No\.\s*(\d+)/);
  const rankDateMatch = currentRanking.match(/\((\d{1,2}\s+[A-Za-z]+\s+\d{4})\)/);

  const highest = ib['highest ranking'] || '';
  const highestNumMatch = highest.match(/No\.\s*(\d+)/);
  const highestDateMatch = highest.match(/\((\d{1,2}\s+[A-Za-z]+\s+\d{4})\)/);

  const careerRecord = ib['career record'] || '';
  const careerTitles = ib['career titles'] || '';
  const prizeMoney = ib['prize money'] || '';
  const height = ib['height'] || '';
  const plays = ib['plays'] || '';
  const coach = ib['coach'] || '';
  const turnedPro = ib['turned pro'] || '';

  // Born: "( 2001-08-16 ) 16 August 2001 (age 24) Innichen , Italy"
  const born = ib['born'] || '';
  const birthDate = (born.match(/\d{4}-\d{2}-\d{2}/) || [null])[0]
    || parseDateText(born);
  // Birthplace: text after "(age N)" up to end (may have trailing ".")
  let birthPlace = '';
  const birthPlaceMatch = born.match(/age\s*\d+\)\s*(.+?)\s*$/);
  if (birthPlaceMatch) birthPlace = birthPlaceMatch[1].trim();
  // Fallback: parse the original infobox cell looking for birthplace div
  if (!birthPlace && html) {
    const bpRe = /class="birthplace"[^>]*>([\s\S]*?)<\/div>/;
    const bpm = html.match(bpRe);
    if (bpm) birthPlace = stripTags(bpm[1]);
  }

  // 2026 season stats - real Wikipedia labels are "Season record" and "Calendar titles"
  let seasonRecord: string | null = null;
  let seasonTitles: number | null = null;
  if (seasonHtml) {
    const sib = parseInfobox(seasonHtml);
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
    rankingDate: rankDateMatch ? parseDateText(rankDateMatch[1]) : null,
    careerHigh: highestNumMatch ? parseInt(highestNumMatch[1]) : null,
    careerHighDate: highestDateMatch ? parseDateText(highestDateMatch[1]) : null,
    nationality: 'Italia',
    country: 'IT',
    birthDate,
    birthPlace,
    height,
    plays,
    coach,
    turnedPro: turnedPro ? parseInt(turnedPro) || turnedPro : null,
    careerRecord,
    careerTitles: careerTitles ? parseInt(careerTitles) || careerTitles : null,
    prizeMoney,
    seasonRecord,
    seasonTitles,
    photoUrl: PHOTO_URL,
    source: 'Wikipedia (en.wikipedia.org)',
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
  const cached = getCached<{ matches: MatchRow[]; tournaments: TournamentRow[] }>('season-2026');
  if (cached) return cached;

  const html = await fetchWiki('https://en.wikipedia.org/wiki/2026_Jannik_Sinner_tennis_season');
  if (!html) return { matches: [], tournaments: [] };

  // Locate Singles_matches section
  const sectionStart = html.indexOf('id="Singles_matches"');
  if (sectionStart < 0) return { matches: [], tournaments: [] };
  const tableStart = html.indexOf('<table', sectionStart);
  const tableEnd = html.indexOf('</table>', tableStart);
  if (tableStart < 0 || tableEnd < 0) return { matches: [], tournaments: [] };
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
  }

  tournaments.sort((a, b) => a.date.localeCompare(b.date));

  const data = { matches, tournaments };
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

    if (seasonParam !== null && !/^\d{4}$/.test(seasonParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid season parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const season = seasonParam ? parseInt(seasonParam) : 2026;
    let data: unknown;

    switch (action) {
      case 'player-info': {
        data = await getPlayerInfo();
        break;
      }
      case 'next-event': {
        if (season !== 2026) { data = null; break; }
        const { tournaments } = await getSeasonData();
        const now = new Date();
        data = tournaments.find(t => new Date(t.dateEnd || t.date) >= now && !t.result) || null;
        break;
      }
      case 'schedule': {
        if (season !== 2026) { data = []; break; }
        const { tournaments } = await getSeasonData();
        data = tournaments;
        break;
      }
      case 'results': {
        if (season !== 2026) { data = []; break; }
        const { matches } = await getSeasonData();
        data = matches;
        break;
      }
      default:
        return new Response(JSON.stringify({ success: false, error: 'Azione non valida. Usa: player-info, schedule, results, next-event' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'Wikipedia (en.wikipedia.org)' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tennis API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
