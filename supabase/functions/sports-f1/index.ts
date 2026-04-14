const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

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
        const res = await fetch(`${JOLPICA_BASE}/${season}.json`);
        if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
        const json = await res.json();
        const races = json.MRData?.RaceTable?.Races || [];
        data = races.map((r: any) => ({
          round: parseInt(r.round),
          raceName: r.raceName,
          circuit: r.Circuit?.circuitName || '',
          locality: r.Circuit?.Location?.locality || '',
          country: r.Circuit?.Location?.country || '',
          date: r.date,
          time: r.time || null,
          firstPractice: r.FirstPractice || null,
          secondPractice: r.SecondPractice || null,
          thirdPractice: r.ThirdPractice || null,
          qualifying: r.Qualifying || null,
          sprint: r.Sprint || null,
        }));
        break;
      }

      case 'driver-standings': {
        const res = await fetch(`${JOLPICA_BASE}/${season}/driverStandings.json`);
        if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
        const json = await res.json();
        const standings = json.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];

        // Fetch driver headshots from OpenF1
        let headshotMap: Record<string, string> = {};
        try {
          const openF1Res = await fetch('https://api.openf1.org/v1/drivers?session_key=latest');
          if (openF1Res.ok) {
            const openF1Drivers = await openF1Res.json();
            for (const d of openF1Drivers) {
              if (d.last_name && d.headshot_url) {
                headshotMap[d.last_name.toLowerCase()] = d.headshot_url;
              }
            }
          }
        } catch (_) { /* ignore */ }

        data = standings.map((s: any) => {
          const familyName = s.Driver?.familyName || '';
          const photoUrl = headshotMap[familyName.toLowerCase()] || null;
          return {
            position: parseInt(s.position),
            points: parseFloat(s.points),
            wins: parseInt(s.wins),
            driver: `${s.Driver?.givenName || ''} ${familyName}`.trim(),
            driverCode: s.Driver?.code || '',
            nationality: s.Driver?.nationality || '',
            constructor: s.Constructors?.[0]?.name || '',
            photoUrl,
          };
        });
        break;
      }

      case 'constructor-standings': {
        const res = await fetch(`${JOLPICA_BASE}/${season}/constructorStandings.json`);
        if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
        const json = await res.json();
        const standings = json.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
        data = standings.map((s: any) => ({
          position: parseInt(s.position),
          points: parseFloat(s.points),
          wins: parseInt(s.wins),
          constructor: s.Constructor?.name || '',
          nationality: s.Constructor?.nationality || '',
        }));
        break;
      }

      case 'last-result': {
        const res = await fetch(`${JOLPICA_BASE}/${season}/last/results.json`);
        if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
        const json = await res.json();
        const race = json.MRData?.RaceTable?.Races?.[0];
        if (race) {
          data = {
            raceName: race.raceName,
            round: parseInt(race.round),
            date: race.date,
            circuit: race.Circuit?.circuitName || '',
            results: (race.Results || []).slice(0, 10).map((r: any) => ({
              position: parseInt(r.position),
              driver: `${r.Driver?.givenName || ''} ${r.Driver?.familyName || ''}`.trim(),
              constructor: r.Constructor?.name || '',
              time: r.Time?.time || r.status || '',
              points: parseFloat(r.points),
            })),
          };
        } else {
          data = null;
        }
        break;
      }

      case 'next-race': {
        const res = await fetch(`${JOLPICA_BASE}/current/next.json`);
        if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);
        const json = await res.json();
        const race = json.MRData?.RaceTable?.Races?.[0];
        if (race) {
          data = {
            round: parseInt(race.round),
            raceName: race.raceName,
            circuit: race.Circuit?.circuitName || '',
            locality: race.Circuit?.Location?.locality || '',
            country: race.Circuit?.Location?.country || '',
            date: race.date,
            time: race.time || null,
            firstPractice: race.FirstPractice || null,
            secondPractice: race.SecondPractice || null,
            thirdPractice: race.ThirdPractice || null,
            qualifying: race.Qualifying || null,
            sprint: race.Sprint || null,
          };
        } else {
          data = null;
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, driver-standings, constructor-standings, last-result, next-race' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('F1 API error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
