const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// TheSportsDB - MotoGP league ID: 4407
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const MOTOGP_ID = '4407';

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
      case 'calendar': {
        const res = await fetch(`${TSDB_BASE}/eventsseason.php?id=${MOTOGP_ID}&s=${season}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.events || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          city: e.strCity,
          country: e.strCountry,
          round: e.intRound,
          season: e.strSeason,
          result: e.strResult,
          status: e.strStatus,
          thumb: e.strThumb,
        }));
        break;
      }

      case 'next-event': {
        // Get next events for MotoGP league
        const res = await fetch(`${TSDB_BASE}/eventsnextleague.php?id=${MOTOGP_ID}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.events || []).slice(0, 5).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          city: e.strCity,
          country: e.strCountry,
          round: e.intRound,
          season: e.strSeason,
        }));
        break;
      }

      case 'last-events': {
        const res = await fetch(`${TSDB_BASE}/eventspastleague.php?id=${MOTOGP_ID}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.events || []).map((e: any) => ({
          id: e.idEvent,
          name: e.strEvent,
          date: e.dateEvent,
          time: e.strTime,
          venue: e.strVenue,
          result: e.strResult,
          round: e.intRound,
          season: e.strSeason,
        }));
        break;
      }

      case 'standings': {
        const res = await fetch(`${TSDB_BASE}/lookuptable.php?l=${MOTOGP_ID}&s=${season}`);
        if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
        const json = await res.json();
        data = (json.table || []).map((t: any) => ({
          position: parseInt(t.intRank),
          name: t.strTeam,
          points: parseInt(t.intPoints || 0),
          played: parseInt(t.intPlayed || 0),
          wins: parseInt(t.intWin || 0),
          badge: t.strBadge,
        }));
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, next-event, last-events, standings' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MotoGP API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
