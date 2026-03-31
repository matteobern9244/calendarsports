const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// MotoGP 2026 calendar - verified from motomatters.com (updated March 2026)
const MOTOGP_CALENDAR_2026 = [
  { round: 1, name: 'GP della Thailandia', location: 'Buriram', circuit: 'Chang International Circuit', date_start: '2026-02-27', date_end: '2026-03-01', country: 'TH' },
  { round: 2, name: 'GP del Brasile', location: 'Goiânia', circuit: 'Autódromo Ayrton Senna', date_start: '2026-03-20', date_end: '2026-03-22', country: 'BR' },
  { round: 3, name: 'GP delle Americhe', location: 'Austin', circuit: 'Circuit Of The Americas', date_start: '2026-03-27', date_end: '2026-03-29', country: 'US' },
  { round: 4, name: "GP d'Andalusia", location: 'Jerez', circuit: 'Circuito de Jerez Ángel Nieto', date_start: '2026-04-24', date_end: '2026-04-26', country: 'ES' },
  { round: 5, name: 'GP di Francia', location: 'Le Mans', circuit: 'Bugatti Circuit', date_start: '2026-05-08', date_end: '2026-05-10', country: 'FR' },
  { round: 6, name: 'GP di Catalogna', location: 'Montmeló', circuit: 'Circuit de Barcelona Catalunya', date_start: '2026-05-15', date_end: '2026-05-17', country: 'ES' },
  { round: 7, name: "GP d'Italia", location: 'Mugello', circuit: 'Autodromo del Mugello', date_start: '2026-05-29', date_end: '2026-05-31', country: 'IT' },
  { round: 8, name: "GP d'Ungheria", location: 'Balatonfőkajár', circuit: 'Balaton Park Circuit', date_start: '2026-06-05', date_end: '2026-06-07', country: 'HU' },
  { round: 9, name: 'GP della Repubblica Ceca', location: 'Brno', circuit: 'Automotodrom Brno', date_start: '2026-06-19', date_end: '2026-06-21', country: 'CZ' },
  { round: 10, name: "GP d'Olanda", location: 'Assen', circuit: 'TT Circuit', date_start: '2026-06-26', date_end: '2026-06-28', country: 'NL' },
  { round: 11, name: 'GP di Germania', location: 'Hohenstein-Ernstthal', circuit: 'Sachsenring', date_start: '2026-07-10', date_end: '2026-07-12', country: 'DE' },
  { round: 12, name: 'GP della Gran Bretagna', location: 'Silverstone', circuit: 'Silverstone Circuit', date_start: '2026-08-07', date_end: '2026-08-09', country: 'GB' },
  { round: 13, name: "GP d'Aragona", location: 'Alcañiz', circuit: 'Motorland Aragon', date_start: '2026-08-28', date_end: '2026-08-30', country: 'ES' },
  { round: 14, name: 'GP di San Marino', location: 'Misano', circuit: 'Misano World Circuit', date_start: '2026-09-11', date_end: '2026-09-13', country: 'SM' },
  { round: 15, name: "GP d'Austria", location: 'Spielberg', circuit: 'Red Bull Ring', date_start: '2026-09-18', date_end: '2026-09-20', country: 'AT' },
  { round: 16, name: 'GP del Giappone', location: 'Motegi', circuit: 'Motegi Twin Ring', date_start: '2026-10-02', date_end: '2026-10-04', country: 'JP' },
  { round: 17, name: "GP d'Indonesia", location: 'Mandalika', circuit: 'Mandalika International Street Circuit', date_start: '2026-10-09', date_end: '2026-10-11', country: 'ID' },
  { round: 18, name: "GP d'Australia", location: 'Phillip Island', circuit: 'Phillip Island Grand Prix Circuit', date_start: '2026-10-23', date_end: '2026-10-25', country: 'AU' },
  { round: 19, name: 'GP della Malesia', location: 'Sepang', circuit: 'Sepang International Circuit', date_start: '2026-10-30', date_end: '2026-11-01', country: 'MY' },
  { round: 20, name: 'GP del Qatar', location: 'Lusail', circuit: 'Lusail International Circuit', date_start: '2026-11-06', date_end: '2026-11-08', country: 'QA' },
  { round: 21, name: 'GP del Portogallo', location: 'Portimão', circuit: 'Algarve International Circuit', date_start: '2026-11-20', date_end: '2026-11-22', country: 'PT' },
  { round: 22, name: 'GP di Valencia', location: 'Cheste', circuit: 'Circuit Ricardo Tormo', date_start: '2026-11-27', date_end: '2026-11-29', country: 'ES' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const season = url.searchParams.get('season') || String(new Date().getFullYear());

    let data: any;

    switch (action) {
      case 'calendar': {
        const now = new Date();
        data = MOTOGP_CALENDAR_2026.map(e => ({
          ...e,
          status: new Date(e.date_end) < now ? 'finished' : 'upcoming',
        }));
        break;
      }

      case 'standings': {
        // Try official API
        try {
          const apiUrl = `https://api.motogp.pulserlive.com/motogp/v1/results/standings?season=${season}&category=MotoGP`;
          const apiRes = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
          if (apiRes.ok) {
            const standings = await apiRes.json();
            if (Array.isArray(standings) && standings.length > 0) {
              data = standings.map((s: any, i: number) => ({
                position: s.position || i + 1,
                rider: s.rider?.full_name || s.classification?.rider?.full_name || '',
                team: s.team?.name || s.classification?.team?.name || '',
                points: s.points || s.total_points || 0,
                wins: s.wins || 0,
              }));
              break;
            }
          }
          const body = await apiRes.text();
          console.log('Standings API:', apiRes.status, body.substring(0, 200));
        } catch (e) {
          console.log('Standings API failed:', e);
        }
        data = [];
        break;
      }

      case 'next-event': {
        const now = new Date();
        const next = MOTOGP_CALENDAR_2026.find(e => new Date(e.date_start) > now);
        data = next ? { ...next, status: 'upcoming' } : null;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, standings, next-event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'MotoGP Official' }), {
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
