import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

// Fallback driver photo map (OpenF1 doesn't always have all drivers)
const F1_DRIVER_PHOTOS: Record<string, string> = {
  'hülkenberg': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png',
  'hulkenberg': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png',
  'tsunoda': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png.transform/1col/image.png',
  'doohan': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/J/JACDOO01_Jack_Doohan/jacdoo01.png.transform/1col/image.png',
  'norris': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png',
  'verstappen': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png',
  'piastri': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png',
  'russell': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png',
  'leclerc': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png',
  'hamilton': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png',
  'antonelli': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/K/ANDANT01_Kimi_Antonelli/andant01.png.transform/1col/image.png',
  'albon': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png',
  'sainz': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png',
  'alonso': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png',
  'hadjar': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png',
  'bearman': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png',
  'lawson': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png',
  'ocon': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png',
  'stroll': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png',
  'gasly': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png',
  'bortoleto': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png',
  'colapinto': 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png',
};

// F1 Constructor logos
const F1_CONSTRUCTOR_LOGOS: Record<string, string> = {
  'mclaren': 'https://media.formula1.com/content/dam/fom-website/teams/2025/mclaren-logo.png.transform/2col/image.png',
  'red bull': 'https://media.formula1.com/content/dam/fom-website/teams/2025/red-bull-racing-logo.png.transform/2col/image.png',
  'ferrari': 'https://media.formula1.com/content/dam/fom-website/teams/2025/ferrari-logo.png.transform/2col/image.png',
  'mercedes': 'https://media.formula1.com/content/dam/fom-website/teams/2025/mercedes-logo.png.transform/2col/image.png',
  'aston martin': 'https://media.formula1.com/content/dam/fom-website/teams/2025/aston-martin-logo.png.transform/2col/image.png',
  'alpine f1 team': 'https://media.formula1.com/content/dam/fom-website/teams/2025/alpine-logo.png.transform/2col/image.png',
  'williams': 'https://media.formula1.com/content/dam/fom-website/teams/2025/williams-logo.png.transform/2col/image.png',
  'rb f1 team': 'https://media.formula1.com/content/dam/fom-website/teams/2025/rb-logo.png.transform/2col/image.png',
  'haas f1 team': 'https://media.formula1.com/content/dam/fom-website/teams/2025/haas-logo.png.transform/2col/image.png',
  'sauber': 'https://media.formula1.com/content/dam/fom-website/teams/2025/kick-sauber-logo.png.transform/2col/image.png',
};

function getConstructorLogo(name: string): string | null {
  const key = name.toLowerCase().trim();
  return F1_CONSTRUCTOR_LOGOS[key] || null;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: 'sports-f1' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

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
          const familyNameLower = familyName.toLowerCase();
          // Try OpenF1 first, then fallback map
          const photoUrl = headshotMap[familyNameLower] || F1_DRIVER_PHOTOS[familyNameLower] || null;
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
          logoUrl: getConstructorLogo(s.Constructor?.name || ''),
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
