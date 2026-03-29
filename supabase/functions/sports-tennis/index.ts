const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Scrape Sinner data from ATP Tour and flashscore
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
        // Scrape ATP Tour player page for Sinner
        const res = await fetch('https://www.atptour.com/en/-/www/ajax/PlayerBio/S0AG', {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
        if (res.ok) {
          try {
            const json = await res.json();
            data = {
              name: 'Jannik Sinner',
              ranking: json?.Ranking || json?.ranking,
              nationality: 'Italia',
              birthDate: '2001-08-16',
              height: '188 cm',
              weight: '76 kg',
              birthPlace: 'San Candido, Italia',
              turnedPro: 2018,
            };
          } catch {
            data = {
              name: 'Jannik Sinner',
              nationality: 'Italia',
              birthDate: '2001-08-16',
              height: '188 cm',
              weight: '76 kg',
              birthPlace: 'San Candido, Italia',
              turnedPro: 2018,
              ranking: 1,
            };
          }
        } else {
          // Fallback static info
          data = {
            name: 'Jannik Sinner',
            nationality: 'Italia',
            birthDate: '2001-08-16',
            height: '188 cm',
            weight: '76 kg',
            birthPlace: 'San Candido, Italia',
            turnedPro: 2018,
            ranking: 1,
          };
        }
        break;
      }

      case 'schedule': {
        // Scrape ATP schedule for Sinner
        const res = await fetch(`https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity?matchType=Singles&year=${season}&tournament=all`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (res.ok) {
          const html = await res.text();
          // Extract tournament data from HTML
          const tournaments: any[] = [];
          const tourneyRegex = /class="[^"]*tournament[^"]*"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs;
          let match;
          while ((match = tourneyRegex.exec(html)) !== null && tournaments.length < 20) {
            tournaments.push({
              url: match[1],
              name: match[2].trim().replace(/<[^>]*>/g, ''),
            });
          }
          data = tournaments;
        } else {
          data = [];
        }
        break;
      }

      case 'results': {
        // Try to get recent results from ATP
        const res = await fetch(`https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity?matchType=Singles&year=${season}&tournament=all`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        const matches: any[] = [];
        if (res.ok) {
          const html = await res.text();
          
          // Extract structured data from ATP HTML
          // Look for match result patterns
          const resultBlocks = html.match(/class="[^"]*activity-tournament[^"]*"[\s\S]*?(?=class="[^"]*activity-tournament|$)/g) || [];
          
          for (const block of resultBlocks.slice(0, 15)) {
            const tourneyName = (block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//) || [])[1]?.trim().replace(/<[^>]*>/g, '') || '';
            const dateMatch = block.match(/(\d{4}\.\d{2}\.\d{2})/);
            const scoreMatches = block.match(/(\d+-\d+)/g);
            const opponentMatch = block.match(/class="[^"]*opponent[^"]*"[^>]*>([\s\S]*?)<\//) || [];

            if (tourneyName) {
              matches.push({
                tournament: tourneyName,
                date: dateMatch ? dateMatch[1].replace(/\./g, '-') : '',
                opponent: opponentMatch[1]?.trim().replace(/<[^>]*>/g, '') || '',
                score: scoreMatches ? scoreMatches.join(' ') : '',
              });
            }
          }
        }
        
        data = matches;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Azione non valida. Usa: player-info, schedule, results' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data, source: 'ATP Tour / Scraping' }), {
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
