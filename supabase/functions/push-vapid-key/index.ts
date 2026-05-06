import { buildCorsHeaders } from '../_shared/security.ts';

Deno.serve((req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});