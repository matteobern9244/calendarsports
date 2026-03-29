const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// TheSportsDB free API - Juventus team ID: 133676, Serie A league ID: 4332
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const JUVENTUS_ID = '133676';
const SERIE_A_ID = '4332';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const season = url.searchParams.get('season') || new Date().getFullYear().toString();

    let data: any;

    switch (action) {
      case 'next-events': {
        const res = await fetch(`${TSDB_BASE}/eventsnext.php?id=${JUVENTUS_ID}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.events || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          league: e.strLeague,
          round: e.intRound,
          season: e.strSeason,
        }));
        break;
      }

      case 'last-events': {
        const res = await fetch(`${TSDB_BASE}/eventslast.php?id=${JUVENTUS_ID}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.results || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
          homeScore: e.intHomeScore,
          awayScore: e.intAwayScore,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          league: e.strLeague,
          round: e.intRound,
          season: e.strSeason,
        }));
        break;
      }

      case 'standings': {
        const seasonParam = `${season}-${parseInt(season) + 1}`;
        const res = await fetch(`${TSDB_BASE}/lookuptable.php?l=${SERIE_A_ID}&s=${seasonParam}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.table || []).map((t: any) => ({
          position: parseInt(t.intRank),
          team: t.strTeam,
          teamBadge: t.strBadge,
          played: parseInt(t.intPlayed || 0),
          wins: parseInt(t.intWin || 0),
          draws: parseInt(t.intDraw || 0),
          losses: parseInt(t.intLoss || 0),
          goalsFor: parseInt(t.intGoalsFor || 0),
          goalsAgainst: parseInt(t.intGoalsAgainst || 0),
          goalDiff: parseInt(t.intGoalDifference || 0),
          points: parseInt(t.intPoints || 0),
        }));
        break;
      }

      case 'season-events': {
        const seasonParam = `${season}-${parseInt(season) + 1}`;
        const res = await fetch(`${TSDB_BASE}/eventsseason.php?id=${JUVENTUS_ID}&s=${seasonParam}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.events || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
          homeScore: e.intHomeScore,
          awayScore: e.intAwayScore,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          league: e.strLeague,
          round: e.intRound,
          season: e.strSeason,
          status: e.strStatus,
        }));
        break;
      }

      case 'team-details': {
        const res = await fetch(`${TSDB_BASE}/lookupteam.php?id=${JUVENTUS_ID}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        const team = json.teams?.[0];
        if (team) {
          data = {
            name: team.strTeam,
            stadium: team.strStadium,
            badge: team.strBadge,
            jersey: team.strJersey,
            description: team.strDescriptionIT || team.strDescriptionEN,
            formedYear: team.intFormedYear,
            league: team.strLeague,
          };
        } else {
          data = null;
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: next-events, last-events, standings, season-events, team-details' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
