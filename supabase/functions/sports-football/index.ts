const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Sky Sport Italia internal widget endpoints
const SKY_BASE = 'https://sport.sky.it';
const SERIE_A_COMP_ID = '21';

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
  const modelMatch = html.match(/model="(\{.*?\})"/s);
  if (!modelMatch) return null;
  try {
    const unescaped = unescapeHtml(modelMatch[1]);
    return JSON.parse(unescaped);
  } catch (e) {
    console.error('Failed to parse model JSON:', e);
    return null;
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

    switch (action) {
      case 'standings': {
        const widgetUrl = `${SKY_BASE}/football/competition-ranking/${season}/${SERIE_A_COMP_ID}/widget.html`;
        console.log('Fetching Sky Sport standings:', widgetUrl);
        const res = await fetch(widgetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (!res.ok) throw new Error(`Sky Sport error: ${res.status}`);
        const html = await res.text();
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
        const widgetUrl = `${SKY_BASE}/football/competition-calendar-results/${season}/${SERIE_A_COMP_ID}/widget.html`;
        console.log('Fetching Sky Sport calendar:', widgetUrl);
        const res = await fetch(widgetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (!res.ok) throw new Error(`Sky Sport error: ${res.status}`);
        const html = await res.text();
        const model = extractWidgetModel(html);
        if (!model) {
          throw new Error('Dati calendario non trovati nella pagina Sky Sport');
        }

        // Extract matches from calendar model - filter Juventus matches
        const allRounds = model.rounds || model.matchDays || [];
        const juventusMatches: any[] = [];

        for (const round of allRounds) {
          const matches = round.matches || round.events || [];
          for (const match of matches) {
            const home = match.homeTeam?.name || match.home?.name || '';
            const away = match.awayTeam?.name || match.away?.name || '';
            if (home.toLowerCase().includes('juventus') || away.toLowerCase().includes('juventus')) {
              juventusMatches.push({
                matchday: round.name || round.roundName || round.matchDay,
                homeTeam: home,
                awayTeam: away,
                homeScore: match.homeTeam?.score ?? match.home?.score ?? null,
                awayScore: match.awayTeam?.score ?? match.away?.score ?? null,
                date: match.date || match.startDate,
                time: match.time || match.startTime,
                status: match.status || match.state,
                venue: match.venue || match.stadium,
                competition: 'Serie A',
              });
            }
          }
        }

        data = juventusMatches;
        break;
      }

      case 'next-match': {
        // Get standings page to find Juventus position and next match info
        const widgetUrl = `${SKY_BASE}/football/competition-ranking/${season}/${SERIE_A_COMP_ID}/widget.html`;
        const res = await fetch(widgetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (!res.ok) throw new Error(`Sky Sport error: ${res.status}`);
        const html = await res.text();
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

    return new Response(JSON.stringify({ success: true, data, source: 'Sky Sport Italia' }), {
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
