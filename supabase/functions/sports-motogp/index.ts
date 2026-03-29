const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Scrape MotoGP data from official motogp.com API endpoints
const MOTOGP_API = 'https://api.motogp.pulselive.com/motogp/v1';

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
        // Try official MotoGP API
        const res = await fetch(`${MOTOGP_API}/results/events?seasonUuid=&season=${season}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (res.ok) {
          const events = await res.json();
          data = (Array.isArray(events) ? events : []).map((e: any) => ({
            id: e.id,
            name: e.name || e.short_name,
            circuit: e.circuit?.name,
            country: e.country?.name,
            dateStart: e.date_start,
            dateEnd: e.date_end,
            status: e.status,
          }));
        } else {
          // Fallback: scrape motogp.com calendar page
          const pageRes = await fetch(`https://www.motogp.com/en/calendar/${season}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          if (!pageRes.ok) throw new Error(`MotoGP fetch error: ${pageRes.status}`);
          const html = await pageRes.text();

          // Try to extract JSON data from script tags
          const scriptMatch = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/s);
          if (scriptMatch) {
            try {
              const nextData = JSON.parse(scriptMatch[1]);
              const events = nextData?.props?.pageProps?.events || nextData?.props?.pageProps?.calendar || [];
              data = events.map((e: any) => ({
                id: e.id || e.slug,
                name: e.title || e.name,
                circuit: e.circuit || e.venue,
                country: e.country,
                dateStart: e.date_start || e.startDate,
                dateEnd: e.date_end || e.endDate,
                status: e.status,
              }));
            } catch {
              data = [];
            }
          } else {
            data = [];
          }
        }
        break;
      }

      case 'standings': {
        // Try official MotoGP API for standings
        const res = await fetch(`${MOTOGP_API}/results/standings?seasonUuid=&season=${season}&categoryUuid=`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (res.ok) {
          const standings = await res.json();
          const classification = standings?.classification || standings || [];
          data = (Array.isArray(classification) ? classification : []).map((r: any) => ({
            position: r.position,
            name: r.rider ? `${r.rider.name} ${r.rider.surname}` : r.name,
            team: r.team?.name || r.constructor?.name,
            points: r.points,
            wins: r.wins || 0,
            nationality: r.rider?.country?.name || r.nationality,
          }));
        } else {
          // Fallback: try scraping
          const pageRes = await fetch(`https://www.motogp.com/en/results/standings/${season}/motogp`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const scriptMatch = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/s);
            if (scriptMatch) {
              try {
                const nextData = JSON.parse(scriptMatch[1]);
                const standings = nextData?.props?.pageProps?.standings || [];
                data = standings.map((r: any) => ({
                  position: r.position,
                  name: r.rider?.full_name || r.name,
                  team: r.team?.name,
                  points: r.points,
                  wins: r.wins || 0,
                }));
              } catch {
                data = [];
              }
            } else {
              data = [];
            }
          } else {
            data = [];
          }
        }
        break;
      }

      case 'next-event': {
        // Fetch calendar and find next event
        const res = await fetch(`${MOTOGP_API}/results/events?seasonUuid=&season=${season}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        });
        if (res.ok) {
          const events = await res.json();
          const now = new Date();
          const upcoming = (Array.isArray(events) ? events : [])
            .filter((e: any) => new Date(e.date_end || e.date_start) >= now)
            .sort((a: any, b: any) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
          data = upcoming.length > 0 ? {
            id: upcoming[0].id,
            name: upcoming[0].name,
            circuit: upcoming[0].circuit?.name,
            country: upcoming[0].country?.name,
            dateStart: upcoming[0].date_start,
            dateEnd: upcoming[0].date_end,
          } : null;
        } else {
          data = null;
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, standings, next-event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'MotoGP Official / Scraping' }), {
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
