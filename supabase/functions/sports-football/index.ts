const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SKY_BASE = 'https://sport.sky.it';
const SERIE_A_COMP_ID = '21';
const LEGA_API = 'https://api-sdp.legaseriea.it/v1/serie-a/football';

// Mapping from Sky Sport season (e.g. "2025") to Lega Serie A seasonId
// Sky uses the starting year of the season
const LEGA_SEASON_IDS: Record<string, string> = {
  '2025': 'serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a', // 2025/2026
  '2024': 'serie-a::Football_Season::1e32f55e98fc408a9d1fc27c0ba43243', // 2024/2025
  '2023': 'serie-a::Football_Season::104a84bc07f641e685f70a850c6399eb', // 2023/2024
  '2022': 'serie-a::Football_Season::65f4d59dedbb43b68197b0ff0529fa21', // 2022/2023
};

type SkyWidgetResponse = {
  html: string;
  seasonUsed: string;
};

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractWidgetModel(html: string): any {
  const modelMatch = html.match(/model='([^']*)'/) || html.match(/model="([^"]*)"/);
  if (!modelMatch) {
    console.error('No model attribute found. HTML length:', html.length, 'First 500 chars:', html.substring(0, 500));
    return null;
  }
  try {
    const unescaped = unescapeHtml(modelMatch[1]);
    return JSON.parse(unescaped);
  } catch (e) {
    console.error('Failed to parse model JSON:', e);
    return null;
  }
}

async function fetchSkyWidget(
  buildUrl: (season: string) => string,
  requestedSeason: string,
): Promise<SkyWidgetResponse> {
  const parsedSeason = Number.parseInt(requestedSeason, 10);
  const fallbackSeason = Number.isFinite(parsedSeason) ? String(parsedSeason - 1) : null;
  const seasonsToTry = [...new Set([requestedSeason, fallbackSeason].filter(Boolean) as string[])];

  let lastStatus: number | null = null;

  for (const season of seasonsToTry) {
    const widgetUrl = buildUrl(season);
    console.log('Fetching:', widgetUrl);

    const res = await fetch(widgetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (res.ok) {
      return { html: await res.text(), seasonUsed: season };
    }

    lastStatus = res.status;
    console.warn(`Sky Sport widget unavailable for season ${season}: ${res.status}`);

    if (res.status !== 404) {
      throw new Error(`Sky Sport error: ${res.status}`);
    }
  }

  throw new Error(`Sky Sport error: ${lastStatus ?? 404}`);
}

// Fetch broadcaster info from Lega Serie A API for Juventus matches
async function fetchBroadcasterMap(season: string): Promise<Record<string, string>> {
  const seasonId = LEGA_SEASON_IDS[season];
  if (!seasonId) {
    console.warn(`No Lega Serie A seasonId for season ${season}`);
    return {};
  }

  try {
    const url = `${LEGA_API}/seasons/${encodeURIComponent(seasonId)}/matches?locale=it-IT`;
    console.log('Fetching Lega Serie A broadcasters:', url);

    const res = await fetch(url, {
      headers: {
        'accept': 'text/plain; x-api-version=1.0',
        'Referer': 'https://www.legaseriea.it/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      console.warn(`Lega API error: ${res.status}`);
      return {};
    }

    const data = await res.json();
    const matches = data.matches || [];
    const map: Record<string, string> = {};

    for (const m of matches) {
      const homeName = m.home?.shortName || m.home?.officialName || '';
      const awayName = m.away?.shortName || m.away?.officialName || '';

      // Only process Juventus matches
      if (!homeName.toLowerCase().includes('juventus') && !awayName.toLowerCase().includes('juventus')) {
        continue;
      }

      const broadcasters = m.editorial?.broadcasters;
      if (!broadcasters) continue;

      const parts: string[] = [];
      if (broadcasters.broadcasterNational1) parts.push(broadcasters.broadcasterNational1);
      if (broadcasters.broadcasterNational2) parts.push(broadcasters.broadcasterNational2);
      if (broadcasters.broadcasterNational3) parts.push(broadcasters.broadcasterNational3);

      const broadcasterStr = parts.join(' | ');
      if (!broadcasterStr) continue;

      // Key: matchday number from matchSet name (e.g. "Matchday 1" -> "1")
      const matchdayMatch = m.matchSet?.name?.match(/(\d+)/);
      if (matchdayMatch) {
        map[matchdayMatch[1]] = broadcasterStr;
      }

      // Also key by date for more robust matching
      if (m.matchDateUtc) {
        const dateKey = m.matchDateUtc.substring(0, 10); // YYYY-MM-DD
        map[`date:${dateKey}`] = broadcasterStr;
      }
    }

    console.log(`Found broadcaster info for ${Object.keys(map).length} Juventus matches`);
    return map;
  } catch (e) {
    console.error('Lega API broadcaster fetch error:', e);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const season = url.searchParams.get('season') || '2025';

    let data: any;
    let seasonUsed = season;

    switch (action) {
      case 'standings': {
        const response = await fetchSkyWidget(
          (s) => `${SKY_BASE}/football/competition-ranking/${s}/${SERIE_A_COMP_ID}/widget.html`,
          season,
        );
        const html = response.html;
        seasonUsed = response.seasonUsed;
        const model = extractWidgetModel(html);
        if (!model?.rankingLists?.[0]?.teams) {
          throw new Error('Dati classifica non trovati nella pagina Sky Sport');
        }
        data = model.rankingLists[0].teams.map((t: any) => ({
          position: t.position,
          team: t.teamName,
          teamUrl: t.teamUrl,
          logoUrl: t.logoUrl,
          played: t.games,
          wins: t.gamesWon,
          draws: t.gamesDraw,
          losses: t.gamesLost,
          goalsFor: t.goalsScored,
          goalsAgainst: t.goalsConceded,
          goalDiff: t.goalsDifference,
          points: t.points,
          trend: t.trend,
          qualification: t.qualification,
          lastMatches: (t.lastMatchesTrend || []).map((m: any) => ({
            result: m.label,
            home: m.home,
            away: m.away,
          })),
        }));
        break;
      }

      case 'calendar': {
        // Fetch Sky calendar + Lega broadcaster data in parallel
        const [skyResponse, broadcasterMap] = await Promise.all([
          fetchSkyWidget(
            (s) => `${SKY_BASE}/football/competition-calendar-results/${s}/${SERIE_A_COMP_ID}/widget.html`,
            season,
          ),
          fetchBroadcasterMap(season),
        ]);

        const html = skyResponse.html;
        seasonUsed = skyResponse.seasonUsed;
        const model = extractWidgetModel(html);
        if (!model) {
          throw new Error('Dati calendario non trovati nella pagina Sky Sport');
        }

        const rounds = model.competitionMatchList || [];
        const juventusMatches: any[] = [];

        for (const round of rounds) {
          const roundNum = round.round;
          const matchDayList = round.matchDayList || [];
          for (const matchDay of matchDayList) {
            const matchList = matchDay.matchList || [];
            for (const match of matchList) {
              const homeName = match.home?.name || '';
              const awayName = match.away?.name || '';
              if (homeName.toLowerCase().includes('juventus') || awayName.toLowerCase().includes('juventus')) {
                const isFinished = match.status === 'FullTime';

                // Look up broadcaster by matchday or date
                let broadcaster: string | null = null;
                if (roundNum && broadcasterMap[String(roundNum)]) {
                  broadcaster = broadcasterMap[String(roundNum)];
                } else if (match.date) {
                  const dateKey = new Date(match.date).toISOString().substring(0, 10);
                  broadcaster = broadcasterMap[`date:${dateKey}`] || null;
                }

                juventusMatches.push({
                  matchday: roundNum,
                  homeTeam: homeName,
                  awayTeam: awayName,
                  homeLogo: match.home?.logoUrl || null,
                  awayLogo: match.away?.logoUrl || null,
                  homeScore: isFinished ? match.home?.goal : null,
                  awayScore: isFinished ? match.away?.goal : null,
                  date: match.date,
                  status: match.status,
                  competition: 'Serie A',
                  link: match.link || null,
                  broadcaster: broadcaster,
                });
              }
            }
          }
        }

        data = juventusMatches;
        break;
      }

      case 'next-match': {
        const response = await fetchSkyWidget(
          (s) => `${SKY_BASE}/football/competition-ranking/${s}/${SERIE_A_COMP_ID}/widget.html`,
          season,
        );
        const html = response.html;
        seasonUsed = response.seasonUsed;
        const model = extractWidgetModel(html);
        if (!model?.rankingLists?.[0]?.teams) {
          throw new Error('Dati non trovati');
        }
        const juve = model.rankingLists[0].teams.find((t: any) =>
          t.teamName?.toLowerCase().includes('juventus')
        );
        data = juve ? {
          position: juve.position,
          team: juve.teamName,
          points: juve.points,
          played: juve.games,
          wins: juve.gamesWon,
          draws: juve.gamesDraw,
          losses: juve.gamesLost,
          goalsFor: juve.goalsScored,
          goalsAgainst: juve.goalsConceded,
          goalDiff: juve.goalsDifference,
          logoUrl: juve.logoUrl,
          lastMatches: (juve.lastMatchesTrend || []).map((m: any) => ({
            result: m.label,
            home: m.home,
            away: m.away,
          })),
        } : null;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: standings, calendar, next-match' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'Sky Sport Italia', requestedSeason: season, seasonUsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Football API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
