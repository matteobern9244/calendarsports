import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VALID_LEAD_TIMES = new Set([15, 60, 1440]);

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const rl = checkRateLimit(req, { key: 'push-subscribe', limit: 30 });
  if (!rl.allowed) return rateLimitResponse(rl, cors);

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
  const userAgent = typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 500) : null;
  const enabled = body?.enabled !== false;
  const rawLeadTimes = Array.isArray(body?.leadTimes) ? body.leadTimes : [60];
  const leadTimes = Array.from(new Set(
    rawLeadTimes.map((n: unknown) => Number(n)).filter((n: number) => VALID_LEAD_TIMES.has(n))
  ));
  if (leadTimes.length === 0) leadTimes.push(60);

  if (!endpoint || !p256dh || !auth || endpoint.length > 2000) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await sb.from('push_subscriptions').upsert({
    endpoint, p256dh, auth, user_agent: userAgent,
    lead_times: leadTimes, enabled, last_seen_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[push-subscribe] upsert failed', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});