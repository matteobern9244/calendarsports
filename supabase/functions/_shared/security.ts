// Shared security helpers for public edge functions:
// - CORS origin allowlist (instead of wildcard *)
// - Lightweight in-memory per-IP rate limiting
//
// This module is intentionally dependency-free so it can be imported by
// any Deno edge function in this project.

const ALLOWED_ORIGIN_SUFFIXES = [
  "lovable.app",
  "lovableproject.com",
  "lovable.dev",
];

const ALLOWED_ORIGIN_EXACT = new Set<string>([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_EXACT.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_ORIGIN_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

/**
 * Build CORS headers for a given request. Echoes the request's Origin
 * back only if it's on the allowlist; otherwise falls back to the
 * canonical published domain so unknown origins are blocked by the
 * browser (the response body is still returned, but the browser will
 * refuse to expose it cross-origin).
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = isOriginAllowed(origin)
    ? origin!
    : "https://calendarsports.lovable.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ---------- Rate limiting ----------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Defaults: 60 requests per minute per IP per function instance.
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  req: Request,
  opts: { key?: string; limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const ip = getClientIp(req);
  const key = `${opts.key ?? "default"}:${ip}`;
  const now = Date.now();

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(
  result: Extract<RateLimitResult, { allowed: false }>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Too many requests" }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
