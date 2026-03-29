const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// TheSportsDB - Jannik Sinner player search
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

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
      case 'player-info': {
        const res = await fetch(`${TSDB_BASE}/searchplayers.php?p=Jannik%20Sinner`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        const player = json.player?.[0];
        if (player) {
          data = {
            id: player.idPlayer,
            name: player.strPlayer,
            nationality: player.strNationality,
            sport: player.strSport,
            team: player.strTeam,
            dateBorn: player.dateBorn,
            description: player.strDescriptionIT || player.strDescriptionEN,
            thumb: player.strThumb,
            cutout: player.strCutout,
            height: player.strHeight,
            weight: player.strWeight,
            position: player.strPosition,
          };
        } else {
          data = null;
        }
        break;
      }

      case 'last-events': {
        // Search for recent tennis events involving Sinner
        // TheSportsDB doesn't have per-player event API for free tier
        // We'll try to get ATP events and filter
        // ATP Tour league ID varies, let's search
        const res = await fetch(`${TSDB_BASE}/searchevents.php?e=Sinner&s=${season}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.event || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          city: e.strCity,
          country: e.strCountry,
          result: e.strResult,
          season: e.strSeason,
          league: e.strLeague,
          round: e.intRound,
          status: e.strStatus,
          thumb: e.strThumb,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
          homeScore: e.intHomeScore,
          awayScore: e.intAwayScore,
        }));
        break;
      }

      case 'next-events': {
        // Search for upcoming Sinner events
        const res = await fetch(`${TSDB_BASE}/searchevents.php?e=Sinner`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        const now = new Date();
        const events = (json.event || [])
          .filter((e: any) => new Date(e.dateEvent) >= now)
          .sort((a: any, b: any) => new Date(a.dateEvent).getTime() - new Date(b.dateEvent).getTime());
        data = events.slice(0, 10).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          city: e.strCity,
          league: e.strLeague,
          round: e.intRound,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
        }));
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: player-info, last-events, next-events' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tennis API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
