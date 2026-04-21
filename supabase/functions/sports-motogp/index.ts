import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

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

// MotoGP rider photos keyed by surname for reliable matching
const MOTOGP_RIDER_PHOTOS_BY_SURNAME: Record<string, string> = {
  'bagnaia': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/9772f542-8f9b-4a1c-b7a3-a5fe8f041f75/IfzOWPi2.png?height=200&width=200',
  'marc marquez': 'https://resources.motogp.pulselive.com/photo-resources/2026/04/01/8027468c-a966-4c58-ad26-17b68bb807b8/gItv2nNj.png?height=200&width=200',
  'alex marquez': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/71b70d16-3d66-4374-abf0-e439f76a13aa/WezEeZAR.png?height=200&width=200',
  'martin': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/8a56a9dd-c136-423c-b27b-6763ece0fdc4/y0EBqii2.png?height=200&width=200',
  'acosta': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/07d094fd-a8a6-44ae-a1db-67cd43151bfb/fcl8Ojai.png?height=200&width=200',
  'bastianini': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/32fd7aeb-d765-45d8-9da3-cc3ca25689cf/7pX3VTcG.png?height=200&width=200',
  'bezzecchi': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/4f18dc12-2fef-4ac2-bb31-7e7a220c0aa9/k2TFsiWh.png?height=200&width=200',
  'vinales': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/744f450c-6cbe-42e9-9654-da243fe60889/HMYXeFwb.png?height=200&width=200',
  'viñales': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/744f450c-6cbe-42e9-9654-da243fe60889/HMYXeFwb.png?height=200&width=200',
  'quartararo': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/73805511-aba7-4e37-9361-4e4b35da50fe/L72keLEc.png?height=200&width=200',
  'binder': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/9f5512f1-ea75-4c15-a1d7-f4172e8e8eda/PMd3LA13.png?height=200&width=200',
  'miller': 'https://resources.motogp.pulselive.com/photo-resources/2025/02/10/c1787ba0-46dd-4421-acc2-5b752cba4dd8/SNqHTjGK.png?height=200&width=200',
  'morbidelli': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/0cf208c4-e1b9-4a8c-ade6-73de98ae1701/motIUIeZ.png?height=200&width=200',
  'di giannantonio': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/d24b3386-4301-4208-ba99-cd9e5c1adc42/GdX3sMJC.png?height=200&width=200',
  'fernandez': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/08cfd905-a7b6-438f-949e-f7f480bf3ecd/8Mx8BEXK.png?height=200&width=200',
  'zarco': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/49611a81-9931-4191-9820-068b73b54f99/y0R5f9H5.png?height=200&width=200',
  'marini': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/73c8564a-a0e0-4dba-9385-a4c0df94d4fc/acF1q0Ma.png?height=200&width=200',
  'mir': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/ca35cfa3-a3cf-4bf0-abd0-56541a81c7a2/FhHj9jIJ.png?height=200&width=200',
  'rins': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/a50fc7d2-4099-4a4f-9c33-dc80ce4cb6fc/WIVVlRSf.png?height=200&width=200',
  'ogura': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/b1327ea2-7125-4c56-a3f8-f751f2118ced/nwXR2BjB.png?height=200&width=200',
  'razgatlioglu': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/05/743b343d-2b20-40a7-8ae0-e4f5a273503d/5Zq5W4Wt.png?height=200&width=200',
  'aldeguer': 'https://resources.motogp.pulselive.com/photo-resources/2026/02/21/68e81f3f-b7fc-463b-9df2-d17c2ace42f7/YF1yv3Jm.png?height=200&width=200',
  'moreira': 'https://resources.motogp.pulselive.com/photo-resources/2026/03/04/63a4eefc-ce5c-40cc-9abd-870e7aabaa07/z6IXOQnm.png?height=200&width=200',
  'garcia': 'https://resources.motogp.pulselive.com/photo-resources/2025/11/07/3098c097-ebe6-438c-8615-673b8a8f5ff8/KVM5xr1H.png?height=200&width=200',
  'pirro': 'https://resources.motogp.pulselive.com/photo-resources/2024/03/04/b8d4a5e3-c3c4-4bd0-b8e9-c3f5e8a3d9f2/pirro.png?height=200&width=200',
};

// Full names for riders. Key format: "surname" or "surname-initial" (lowercase, normalized).
// Used to expand Sky Sport short names ("Pirro M.") to full "Nome Cognome" ("Michele Pirro").
const MOTOGP_RIDER_FULL_NAMES: Record<string, string> = {
  'bagnaia': 'Francesco Bagnaia',
  'marquez-m': 'Marc Marquez',
  'marquez-a': 'Alex Marquez',
  'martin': 'Jorge Martin',
  'acosta': 'Pedro Acosta',
  'bastianini': 'Enea Bastianini',
  'bezzecchi': 'Marco Bezzecchi',
  'vinales': 'Maverick Viñales',
  'viñales': 'Maverick Viñales',
  'quartararo': 'Fabio Quartararo',
  'binder': 'Brad Binder',
  'miller': 'Jack Miller',
  'morbidelli': 'Franco Morbidelli',
  'di giannantonio': 'Fabio Di Giannantonio',
  'fernandez-r': 'Raul Fernandez',
  'fernandez-a': 'Augusto Fernandez',
  'fernandez': 'Raul Fernandez',
  'zarco': 'Johann Zarco',
  'marini': 'Luca Marini',
  'mir': 'Joan Mir',
  'rins': 'Alex Rins',
  'ogura': 'Ai Ogura',
  'razgatlioglu': 'Toprak Razgatlioglu',
  'aldeguer': 'Fermin Aldeguer',
  'moreira': 'Diogo Moreira',
  'garcia': 'Sergio Garcia',
  'pirro': 'Michele Pirro',
  'savadori': 'Lorenzo Savadori',
  'pedrosa': 'Dani Pedrosa',
  'crutchlow': 'Cal Crutchlow',
  'bradl': 'Stefan Bradl',
  'oncu': 'Deniz Öncü',
  'rossi': 'Valentino Rossi',
};

function expandRiderName(skyName: string): string {
  const normalized = skyName.toLowerCase().trim();
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Try surname-initial key first (handles Marquez M./A., Fernandez R./A.)
  if (initial && MOTOGP_RIDER_FULL_NAMES[`${surname}-${initial}`]) {
    return MOTOGP_RIDER_FULL_NAMES[`${surname}-${initial}`];
  }
  // Direct surname match
  if (MOTOGP_RIDER_FULL_NAMES[surname]) return MOTOGP_RIDER_FULL_NAMES[surname];

  // Accent-insensitive fallback
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, full] of Object.entries(MOTOGP_RIDER_FULL_NAMES)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return full;
  }

  // Fallback: return original Sky name to avoid losing data
  return skyName;
}

// MotoGP constructor/team logos
const MOTOGP_CONSTRUCTOR_LOGOS: Record<string, string> = {
  'ducati': 'https://resources.motogp.pulselive.com/photo-resources/2023/01/01/d8e3b2f5-c4c4-4bd0-b8e9-c3f5e8a3d9f2/ducati.png?height=40&width=80',
  'aprilia': 'https://resources.motogp.pulselive.com/photo-resources/2023/01/01/a8e3b2f5-c4c4-4bd0-b8e9-c3f5e8a3d9f2/aprilia.png?height=40&width=80',
  'ktm': 'https://resources.motogp.pulselive.com/photo-resources/2023/01/01/k8e3b2f5-c4c4-4bd0-b8e9-c3f5e8a3d9f2/ktm.png?height=40&width=80',
  'yamaha': 'https://resources.motogp.pulselive.com/photo-resources/2023/01/01/y8e3b2f5-c4c4-4bd0-b8e9-c3f5e8a3d9f2/yamaha.png?height=40&width=80',
  'honda': 'https://resources.motogp.pulselive.com/photo-resources/2023/01/01/h8e3b2f5-c4c4-4bd0-b8e9-c3f5e8a3d9f2/honda.png?height=40&width=80',
};

function findRiderPhoto(name: string): string | null {
  const normalized = name.toLowerCase().trim();

  // Sky Sport format: "Surname Initial." e.g. "Bezzecchi M.", "Di Giannantonio F.", "Marquez M.", "Marquez A."
  const parts = normalized.replace(/\./g, '').trim().split(/\s+/);
  const initial = parts.length > 1 && parts[parts.length - 1].length <= 2 ? parts[parts.length - 1] : null;
  const surname = initial ? parts.slice(0, -1).join(' ') : normalized;

  // Special handling for Marquez brothers
  if (surname === 'marquez' && initial) {
    if (initial === 'm') return MOTOGP_RIDER_PHOTOS_BY_SURNAME['marc marquez'];
    if (initial === 'a') return MOTOGP_RIDER_PHOTOS_BY_SURNAME['alex marquez'];
  }

  // Direct surname match
  if (MOTOGP_RIDER_PHOTOS_BY_SURNAME[surname]) return MOTOGP_RIDER_PHOTOS_BY_SURNAME[surname];

  // Normalize accented characters for matching (e.g. "vinales" matches "viñales")
  const surnameNormalized = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, url] of Object.entries(MOTOGP_RIDER_PHOTOS_BY_SURNAME)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (surnameNormalized === keyNormalized) return url;
  }

  return null;
}

function getTeamConstructor(teamName: string): string | null {
  const t = teamName.toLowerCase();
  if (t.includes('ducati') || t.includes('vr46') || t.includes('pramac')) return 'ducati';
  if (t.includes('aprilia') || t.includes('trackhouse')) return 'aprilia';
  if (t.includes('ktm') || t.includes('tech3') || t.includes('gasgas')) return 'ktm';
  if (t.includes('yamaha')) return 'yamaha';
  if (t.includes('honda') || t.includes('lcr')) return 'honda';
  return null;
}

async function fetchSkyStandings(): Promise<{
  pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null }>;
  teams: Array<{ position: number; team: string; points: number; logoUrl: string | null }>;
}> {
  const res = await fetch(SKY_SPORT_MOTOGP_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendarSports/1.0)' },
  });
  if (!res.ok) throw new Error(`Sky Sport returned ${res.status}`);
  const html = await res.text();

  const pilots: Array<{ position: number; name: string; team: string; points: number; photoUrl: string | null }> = [];
  const teams: Array<{ position: number; team: string; points: number; logoUrl: string | null }> = [];

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
          const c0 = cells[0], c2 = cells[2], c3 = cells[3], c4 = cells[4];
          if (!c0 || !c2 || !c3 || !c4) continue;
          const pos = parseInt(c0.replace(/<[^>]+>/g, '').trim());
          const nameRaw = c2.replace(/<[^>]+>/g, '').trim();
          const teamRaw = c3.replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(c4.replace(/<[^>]+>/g, '').trim());
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
          const c0 = cells[0], c1 = cells[1], c2 = cells[2];
          if (!c0 || !c1 || !c2) continue;
          const pos = parseInt(c0.replace(/<[^>]+>/g, '').trim());
          const teamName = c1.replace(/<[^>]+>/g, '').trim();
          const pts = parseInt(c2.replace(/<[^>]+>/g, '').trim());
          if (!isNaN(pos) && teamName) {
            const constructor = getTeamConstructor(teamName);
            teams.push({ position: pos, team: teamName, points: pts || 0, logoUrl: constructor ? (MOTOGP_CONSTRUCTOR_LOGOS[constructor] || null) : null });
          }
        }
      }
    }
  }

  return { pilots, teams };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: 'sports-motogp' });
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
