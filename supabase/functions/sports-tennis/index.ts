import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

// Sinner 2026 schedule from Wikipedia (verified March 2026)
function getSinnerSchedule2026(): any[] {
  return [
    { name: 'Australian Open', date: '2026-01-18', dateEnd: '2026-02-01', surface: 'Hard', location: 'Melbourne, AUS', tier: 'Grand Slam', result: 'SF' },
    { name: 'Qatar Open', date: '2026-02-16', dateEnd: '2026-02-21', surface: 'Hard', location: 'Doha, QAT', tier: 'ATP 500', result: 'QF' },
    { name: 'Indian Wells Masters', date: '2026-03-04', dateEnd: '2026-03-15', surface: 'Hard', location: 'Indian Wells, USA', tier: 'ATP 1000', result: 'W' },
    { name: 'Miami Open', date: '2026-03-18', dateEnd: '2026-03-29', surface: 'Hard', location: 'Miami, USA', tier: 'ATP 1000', result: 'W' },
    { name: 'Monte-Carlo Masters', date: '2026-04-05', dateEnd: '2026-04-12', surface: 'Clay', location: 'Roquebrune-Cap-Martin, FRA', tier: 'ATP 1000', result: null },
    { name: 'Madrid Open', date: '2026-04-22', dateEnd: '2026-05-03', surface: 'Clay', location: 'Madrid, ESP', tier: 'ATP 1000', result: null },
    { name: 'Internazionali d\'Italia', date: '2026-05-06', dateEnd: '2026-05-17', surface: 'Clay', location: 'Roma, ITA', tier: 'ATP 1000', result: null },
    { name: 'Roland Garros', date: '2026-05-24', dateEnd: '2026-06-07', surface: 'Clay', location: 'Parigi, FRA', tier: 'Grand Slam', result: null },
    { name: 'Halle Open', date: '2026-06-15', dateEnd: '2026-06-21', surface: 'Grass', location: 'Halle, GER', tier: 'ATP 500', result: null },
    { name: 'Wimbledon', date: '2026-06-29', dateEnd: '2026-07-12', surface: 'Grass', location: 'Londra, GBR', tier: 'Grand Slam', result: null },
    { name: 'Canadian Open', date: '2026-08-01', dateEnd: '2026-08-13', surface: 'Hard', location: 'Montreal, CAN', tier: 'ATP 1000', result: null },
    { name: 'Cincinnati Open', date: '2026-08-13', dateEnd: '2026-08-23', surface: 'Hard', location: 'Cincinnati, USA', tier: 'ATP 1000', result: null },
    { name: 'US Open', date: '2026-08-30', dateEnd: '2026-09-13', surface: 'Hard', location: 'New York, USA', tier: 'Grand Slam', result: null },
    { name: 'China Open', date: '2026-09-30', dateEnd: '2026-10-06', surface: 'Hard', location: 'Pechino, CHN', tier: 'ATP 500', result: null },
    { name: 'Shanghai Masters', date: '2026-10-07', dateEnd: '2026-10-18', surface: 'Hard', location: 'Shanghai, CHN', tier: 'ATP 1000', result: null },
    { name: 'Vienna Open', date: '2026-10-19', dateEnd: '2026-10-25', surface: 'Hard (Indoor)', location: 'Vienna, AUT', tier: 'ATP 500', result: null },
    { name: 'Paris Masters', date: '2026-11-02', dateEnd: '2026-11-08', surface: 'Hard (Indoor)', location: 'Parigi, FRA', tier: 'ATP 1000', result: null },
    { name: 'ATP Finals', date: '2026-11-15', dateEnd: '2026-11-22', surface: 'Hard (Indoor)', location: 'Torino, ITA', tier: 'Tour Finals', result: null },
  ];
}

// Sinner 2026 results from Wikipedia
function getSinnerResults2026(): any[] {
  return [
    { tournament: 'Australian Open', date: '2026-01-18', round: 'Semifinale', opponent: 'N. Djokovic', score: '6-3 3-6 6-4 4-6 4-6', result: 'S', surface: 'Hard' },
    { tournament: 'Qatar Open', date: '2026-02-16', round: 'Quarti', opponent: 'J. Menšík', score: '6-7 6-2 3-6', result: 'S', surface: 'Hard' },
    { tournament: 'Indian Wells Masters', date: '2026-03-04', round: 'Finale', opponent: 'D. Medvedev', score: '7-6 7-6', result: 'V', surface: 'Hard' },
    { tournament: 'Miami Open', date: '2026-03-18', round: 'Finale', opponent: 'J. Lehečka', score: '6-4 6-4', result: 'V', surface: 'Hard' },
  ];
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: 'sports-tennis' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const seasonParam = url.searchParams.get('season');

    // Validate season strictly when provided to prevent future URL injection
    if (seasonParam !== null && !/^\d{4}$/.test(seasonParam)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid season parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let data: any;

    switch (action) {
      case 'player-info': {
        data = {
          name: 'Jannik Sinner',
          ranking: 2,
          nationality: 'Italia',
          birthDate: '2001-08-16',
          age: Math.floor((Date.now() - new Date('2001-08-16').getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
          height: '188 cm',
          weight: '76 kg',
          birthPlace: 'San Candido, Italia',
          turnedPro: 2018,
          coach: 'Darren Cahill / Simone Vagnozzi',
          plays: 'Destro',
          seasonRecord: '19-2',
          titles2026: 2,
        };
        break;
      }

      case 'next-event': {
        const now = new Date();
        const schedule = getSinnerSchedule2026();
        const next = schedule.find(t => new Date(t.dateEnd || t.date) > now && !t.result);
        data = next || null;
        break;
      }

      case 'results': {
        data = getSinnerResults2026();
        break;
      }

      case 'schedule': {
        const schedule = getSinnerSchedule2026();
        const now = new Date();
        data = schedule.map(t => ({
          ...t,
          status: t.result ? 'completato' : new Date(t.date) < now ? 'in corso' : 'programmato',
        }));
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: player-info, schedule, results, next-event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'ATP Tour / Wikipedia' }), {
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
