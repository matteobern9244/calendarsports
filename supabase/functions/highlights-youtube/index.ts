// Edge Function: highlights-youtube
// Espone gli ultimi video di tre playlist YouTube ufficiali (Juventus, F1, MotoGP)
// leggendo direttamente i feed RSS pubblici (`https://www.youtube.com/feeds/videos.xml?playlist_id=...`).
// Nessuna API key richiesta. Cache HTTP 10 minuti per ridurre il carico verso YouTube.
import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from "../_shared/security.ts";

const PLAYLIST_IDS: Record<string, string> = {
  juventus: "PLamQuNkRTV0eQ-UiYDCuz_WUHOlri1BY3",
  f1: "PLZbcTUGG8ELs188DCvpKMVFsnia-uB3j8",
  motogp: "PLMgcIchslSqgqxtkUg4iiqc1UL8u8uFey",
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decodeHtmlEntities(m[1].trim());
}

type Highlight = {
  videoId: string;
  title: string;
  publishedAt: string;
  source: string;
  url: string;
  thumbnailUrl: string;
};

function parseFeed(xml: string, limit: number): Highlight[] {
  const out: Highlight[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(xml)) !== null && out.length < limit) {
    const entry = match[1];
    const videoId = pick(entry, "yt:videoId");
    const title = pick(entry, "title");
    const published = pick(entry, "published");
    // L'autore è nell'elemento <author><name>...</name></author>
    const authorBlock = entry.match(/<author>([\s\S]*?)<\/author>/i);
    const source = authorBlock ? pick(authorBlock[1], "name") ?? "" : "";
    if (!videoId || !title || !published) continue;
    out.push({
      videoId,
      title,
      publishedAt: published,
      source,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: "highlights-youtube", limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const sport = (url.searchParams.get("sport") ?? "").toLowerCase();
    const limitParam = parseInt(url.searchParams.get("limit") ?? "12", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 12, 1), 25);

    if (!sport || !(sport in PLAYLIST_IDS)) {
      return new Response(
        JSON.stringify({ success: false, error: "Parametro 'sport' richiesto: juventus | f1 | motogp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const playlistId = PLAYLIST_IDS[sport];
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

    let data: Highlight[] = [];
    let dataSource: "live" | "unknown" = "unknown";
    try {
      const ytRes = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CalendarEvents/1.0; +https://rydercalendarevents.lovable.app)",
          "Accept": "application/atom+xml, application/xml, text/xml",
        },
      });
      if (ytRes.ok) {
        const xml = await ytRes.text();
        data = parseFeed(xml, limit);
        if (data.length > 0) dataSource = "live";
      } else {
        console.warn(`[highlights-youtube] YouTube ${sport} ha risposto ${ytRes.status}`);
      }
    } catch (err) {
      console.error(`[highlights-youtube] errore fetch ${sport}:`, err);
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    return new Response(
      JSON.stringify({
        success: true,
        data,
        meta: {
          dataSource,
          source: "youtube-rss",
          sport,
          playlistId,
          playlistUrl,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
        },
      },
    );
  } catch (error) {
    console.error("[highlights-youtube] errore inatteso:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Errore interno highlights-youtube" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});