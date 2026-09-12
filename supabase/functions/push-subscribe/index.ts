import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from "../_shared/security.ts";
import { parseSubscriptionBody } from "./parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const rl = checkRateLimit(req, { key: "push-subscribe", limit: 30 });
  if (!rl.allowed) return rateLimitResponse(rl, cors);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const parsed = parseSubscriptionBody(body);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await sb
    .from("push_subscriptions")
    .upsert({ ...parsed.row, last_seen_at: new Date().toISOString() }, { onConflict: "endpoint" });

  if (error) {
    console.error("[push-subscribe] upsert failed", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
