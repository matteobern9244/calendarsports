const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// football-data.org free tier - Juventus team ID: 109, Serie A competition: SA
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const JUVENTUS_TEAM_ID = 109;
const SERIE_A_CODE = 'SA';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const season = url.searchParams.get('season') || new Date().getFullYear().toString();

    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    const fetchHeaders: Record<string, string> = {};
    if (apiKey) {
      fetchHeaders['X-Auth-Token'] = apiKey;
    }

    let data: any;

    switch (action) {
      case 'next-match': {
        const res = await fetch(
          `${FOOTBALL_DATA_BASE}/teams/${JUVENTUS_TEAM_ID}/matches?status=SCHEDULED&limit=5`,
          { headers: fetchHeaders }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`football-data.org error [${res.status}]: ${errText}`);
        }
        const json = await res.json();
        data = (json.matches || []).map((m: any) => ({
          id: m.id,
          competition: m.competition?.name || '',
          homeTeam: m.homeTeam?.name || '',
          awayTeam: m.awayTeam?.name || '',
          date: m.utcDate,
          status: m.status,
          matchday: m.matchday,
          venue: m.venue || '',
        }));
        break;
      }

      case 'last-matches': {
        const res = await fetch(
          `${FOOTBALL_DATA_BASE}/teams/${JUVENTUS_TEAM_ID}/matches?status=FINISHED&limit=10`,
          { headers: fetchHeaders }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`football-data.org error [${res.status}]: ${errText}`);
        }
        const json = await res.json();
        data = (json.matches || []).map((m: any) => ({
          id: m.id,
          competition: m.competition?.name || '',
          homeTeam: m.homeTeam?.name || '',
          awayTeam: m.awayTeam?.name || '',
          homeScore: m.score?.fullTime?.home,
          awayScore: m.score?.fullTime?.away,
          date: m.utcDate,
          status: m.status,
          matchday: m.matchday,
        }));
        break;
      }

      case 'standings': {
        const res = await fetch(
          `${FOOTBALL_DATA_BASE}/competitions/${SERIE_A_CODE}/standings?season=${season}`,
          { headers: fetchHeaders }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`football-data.org error [${res.status}]: ${errText}`);
        }
        const json = await res.json();
        const table = json.standings?.find((s: any) => s.type === 'TOTAL')?.table || [];
        data = table.map((t: any) => ({
          position: t.position,
          team: t.team?.name || '',
          teamCrest: t.team?.crest || '',
          played: t.playedGames,
          wins: t.won,
          draws: t.draw,
          losses: t.lost,
          goalsFor: t.goalsFor,
          goalsAgainst: t.goalsAgainst,
          goalDiff: t.goalDifference,
          points: t.points,
        }));
        break;
      }

      case 'season-matches': {
        const res = await fetch(
          `${FOOTBALL_DATA_BASE}/teams/${JUVENTUS_TEAM_ID}/matches?season=${season}`,
          { headers: fetchHeaders }
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`football-data.org error [${res.status}]: ${errText}`);
        }
        const json = await res.json();
        data = (json.matches || []).map((m: any) => ({
          id: m.id,
          competition: m.competition?.name || '',
          homeTeam: m.homeTeam?.name || '',
          awayTeam: m.awayTeam?.name || '',
          homeScore: m.score?.fullTime?.home,
          awayScore: m.score?.fullTime?.away,
          date: m.utcDate,
          status: m.status,
          matchday: m.matchday,
        }));
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: next-match, last-matches, standings, season-matches' }), {
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
