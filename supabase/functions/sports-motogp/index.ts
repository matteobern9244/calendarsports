const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

const SKY_SPORT_MOTOGP_URL = 'https://sport.sky.it/motogp/classifiche';

// MotoGP 2025 rider photo mapping (official MotoGP headshots)
const MOTOGP_RIDER_PHOTOS: Record<string, string> = {
  'francesco bagnaia': 'https://resources.motogp.com/riders/f/4/f4c3e579-2599-408d-af44-68cb182fff36/portrait.png',
  'marc marquez': 'https://resources.motogp.com/riders/0/d/0d2f6dbb-50c5-4ce1-86b8-98b4c4df3c54/portrait.png',
  'jorge martin': 'https://resources.motogp.com/riders/2/7/2758e362-003c-469a-b756-21df269e8339/portrait.png',
  'pedro acosta': 'https://resources.motogp.com/riders/3/9/39e1a296-4342-43e7-9e42-56c89dd3b35f/portrait.png',
  'enea bastianini': 'https://resources.motogp.com/riders/0/8/08a5a8b2-8949-4f06-88a7-6f5311693720/portrait.png',
  'marco bezzecchi': 'https://resources.motogp.com/riders/6/a/6aee0cd5-c692-4489-8483-a2f5b5e54946/portrait.png',
  'maverick viñales': 'https://resources.motogp.com/riders/4/e/4e455a2a-96ab-4a4c-ad1c-0bc8fc1a77ba/portrait.png',
  'fabio quartararo': 'https://resources.motogp.com/riders/e/1/e1b95bf6-b0b8-486e-a75b-8e1381b9ff4f/portrait.png',
  'alex marquez': 'https://resources.motogp.com/riders/e/d/ed50c66f-d093-4e6b-95b6-de0c29e9d2ae/portrait.png',
  'brad binder': 'https://resources.motogp.com/riders/f/5/f5a1c1e7-96f7-479e-a498-d8cbdc8bdd29/portrait.png',
  'jack miller': 'https://resources.motogp.com/riders/a/6/a618a8f7-3a4c-4e41-aa2d-4b5e24a3fba8/portrait.png',
  'franco morbidelli': 'https://resources.motogp.com/riders/5/f/5fc0b36d-de33-4fb1-a027-0d16e5e2a8af/portrait.png',
  'fabio di giannantonio': 'https://resources.motogp.com/riders/4/4/4418c28b-4e3a-4b03-b02c-26ae3a3f6d8e/portrait.png',
  'raul fernandez': 'https://resources.motogp.com/riders/7/3/73b07d67-17aa-4e98-82f5-7c33b1bf6c35/portrait.png',
  'augusto fernandez': 'https://resources.motogp.com/riders/9/4/940f29e3-1fee-4fcb-b476-b0e4f8f98cb8/portrait.png',
  'johann zarco': 'https://resources.motogp.com/riders/c/b/cb05cdfc-e91c-4fb5-bd00-b2c2f3530ed7/portrait.png',
  'luca marini': 'https://resources.motogp.com/riders/a/4/a48e6e1a-6fd2-40b4-913e-d5d7ed1786d5/portrait.png',
  'takaaki nakagami': 'https://resources.motogp.com/riders/3/5/355139a6-6ad9-43fd-be37-64c11cc54aec/portrait.png',
  'joan mir': 'https://resources.motogp.com/riders/f/8/f8bf7ae9-bd95-4d89-a728-5a5f8e03c3e0/portrait.png',
  'aleix espargaro': 'https://resources.motogp.com/riders/1/c/1c9def4d-2e47-4889-b618-ef7eb7b3c60f/portrait.png',
  'alex rins': 'https://resources.motogp.com/riders/5/d/5d6eae3f-02f4-4f35-8c7d-e3a5c5ef4fcf/portrait.png',
  'miguel oliveira': 'https://resources.motogp.com/riders/5/1/510a9e31-0d5a-48a7-a87b-d0ffc8f2efec/portrait.png',
};

function findRiderPhoto(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  // Direct match
  if (MOTOGP_RIDER_PHOTOS[normalized]) return MOTOGP_RIDER_PHOTOS[normalized];
  // Partial match (last name)
  for (const [key, url] of Object.entries(MOTOGP_RIDER_PHOTOS)) {
    const lastName = key.split(' ').pop() || '';
    if (normalized.includes(lastName) && lastName.length > 3) return url;
  }
  return null;
}

async function fetchSkyStandings(): Promise<{
  pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null }>;
  teams: Array<{ position: number; team: string; points: number }>;
}> {
  const res = await fetch(SKY_SPORT_MOTOGP_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' },
  });
  if (!res.ok) throw new Error(`Sky Sport returned ${res.status}`);
  const html = await res.text();

  const pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null }> = [];
  const teams: Array<{ position: number; team: string; points: number }> = [];

  // Parse pilot standings table
  const pilotSection = html.split('Classifica Piloti MotoGP');
  if (pilotSection.length > 1) {
    const tableMatch = pilotSection[1].match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const tbody = tableMatch[1];
      const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length >= 5) {
          const pos = parseInt(cells[0].replace(/<[^>]+>/g, '').trim());
          const nameRaw = cells[2].replace(/<[^>]+>/g, '').trim();
          const teamRaw = cells[3].replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(cells[4].replace(/<[^>]+>/g, '').trim());
          if (!isNaN(pos) && nameRaw) {
            pilots.push({ position: pos, name: nameRaw, team: teamRaw, points: pts || 0, photoUrl: findRiderPhoto(nameRaw) });
          }
        }
      }
    }
  }

  // Parse team standings table
  const teamSection = html.split('Classifica Team MotoGP');
  if (teamSection.length > 1) {
    const tableMatch = teamSection[1].match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const tbody = tableMatch[1];
      const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length >= 3) {
          const pos = parseInt(cells[0].replace(/<[^>]+>/g, '').trim());
          const teamName = cells[1].replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(cells[2].replace(/<[^>]+>/g, '').trim());
          if (!isNaN(pos) && teamName) {
            teams.push({ position: pos, team: teamName, points: pts || 0 });
          }
        }
      }
    }
  }

  return { pilots, teams };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

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
        try {
          const { pilots } = await fetchSkyStandings();
          data = pilots;
        } catch (e) {
          console.error('MotoGP standings fetch failed:', e);
          data = [];
        }
        break;
      }

      case 'constructor-standings': {
        try {
          const { teams } = await fetchSkyStandings();
          data = teams;
        } catch (e) {
          console.error('MotoGP constructor standings failed:', e);
          data = [];
        }
        break;
      }

      case 'next-event': {
        const now = new Date();
        const next = MOTOGP_CALENDAR_2026.find(e => new Date(e.date_start) > now);
        data = next ? { ...next, status: 'upcoming' } : null;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: calendar, standings, constructor-standings, next-event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'Sky Sport / MotoGP' }), {
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
