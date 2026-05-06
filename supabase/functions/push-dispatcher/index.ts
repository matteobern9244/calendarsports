import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

type EventItem = {
  id: string;
  sport: 'juventus' | 'f1' | 'motogp';
  date: string;       // ISO
  title: string;
  body: string;
  url: string;
};

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

async function fetchFn(name: string, qs = ''): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/${name}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  if (!r.ok) return null;
  try {
    const j = await r.json();
    return j?.success ? j.data : j;
  } catch { return null; }
}

function f1Season() { return new Date().getUTCFullYear(); }
function motogpSeason() { return new Date().getUTCFullYear(); }
function juveSeason() {
  const d = new Date();
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

function shortGp(name: string): string {
  return name
    .replace(/^Gran Premio (del|di|della|delle|d'|dell'|degli)\s+/i, '')
    .replace(/^GP\s+(del|di|della|delle|d'|dell'|degli)\s+/i, '')
    .replace(/^GP\s+/i, '')
    .trim();
}

async function loadF1(): Promise<EventItem[]> {
  const data = await fetchFn('sports-f1', `action=calendar&season=${f1Season()}`);
  const rounds = Array.isArray(data) ? data : [];
  const out: EventItem[] = [];
  for (const r of rounds) {
    const round = Number(r.round) || 0;
    const raceName = String(r.raceName ?? '');
    const ctx = shortGp(raceName) || raceName;
    const baseId = `f1-${round}`;
    const sessions: Array<{ k: string; l: string; s: any }> = [
      { k: 'fp1', l: 'Prove libere 1', s: r.firstPractice },
      { k: 'fp2', l: 'Prove libere 2', s: r.secondPractice },
      { k: 'fp3', l: 'Prove libere 3', s: r.thirdPractice },
      { k: 'spr-q', l: 'Qualifiche Sprint', s: r.sprintQualifying },
      { k: 'spr', l: 'Sprint', s: r.sprint },
      { k: 'qua', l: 'Qualifiche', s: r.qualifying },
    ];
    for (const x of sessions) {
      if (!x.s?.date) continue;
      const iso = x.s.time ? `${x.s.date}T${String(x.s.time).replace(/Z$/i,'')}Z` : `${x.s.date}T00:00:00Z`;
      out.push({ id: `${baseId}-${x.k}`, sport: 'f1', date: iso,
        title: `F1 · ${ctx}`, body: `${x.l} sta per iniziare`, url: '/formula1' });
    }
    if (r.date) {
      const time = String(r.time ?? '00:00:00Z');
      const iso = `${r.date}T${time.replace(/Z$/i,'')}Z`;
      out.push({ id: `${baseId}-race`, sport: 'f1', date: iso,
        title: `F1 · ${ctx}`, body: 'La gara sta per iniziare', url: '/formula1' });
    }
  }
  return out;
}

async function loadMotoGP(): Promise<EventItem[]> {
  const data = await fetchFn('sports-motogp', `action=calendar&season=${motogpSeason()}`);
  const rounds = Array.isArray(data) ? data : [];
  const out: EventItem[] = [];
  for (const r of rounds) {
    const round = Number(r.round) || 0;
    const name = String(r.name ?? '');
    const ctx = shortGp(name) || name;
    const baseId = `motogp-${round}`;
    const sessions = Array.isArray(r.sessions) ? r.sessions : [];
    if (sessions.length > 0) {
      for (const s of sessions) {
        if (!s.date) continue;
        const label = String(s.label ?? s.type ?? '');
        const type = String(s.type ?? '');
        const num = s.number == null ? '' : String(s.number);
        out.push({ id: `${baseId}-${type}${num}`, sport: 'motogp', date: String(s.date),
          title: `MotoGP · ${ctx}`, body: `${label} sta per iniziare`, url: '/motogp' });
      }
    } else if (r.date_end) {
      out.push({ id: `${baseId}-race`, sport: 'motogp', date: `${r.date_end}T13:00:00Z`,
        title: `MotoGP · ${ctx}`, body: 'La gara sta per iniziare', url: '/motogp' });
    }
  }
  return out;
}

async function loadJuventus(): Promise<EventItem[]> {
  const season = juveSeason();
  const out: EventItem[] = [];
  const first = await fetchFn('sports-football', `action=calendar&season=${season}&page=1&pageSize=12`);
  const items: any[] = Array.isArray(first?.items) ? [...first.items] : [];
  const total = Number(first?.totalPages ?? 1);
  const cap = Math.min(total, 30);
  if (cap > 1) {
    const rest = await Promise.all(
      Array.from({ length: cap - 1 }, (_, i) => i + 2).map((p) =>
        fetchFn('sports-football', `action=calendar&season=${season}&page=${p}&pageSize=12`)
      )
    );
    for (const r of rest) {
      if (Array.isArray(r?.items)) items.push(...r.items);
    }
  }
  for (const m of items) {
    if (!m.date) continue;
    const home = String(m.homeTeam ?? '');
    const away = String(m.awayTeam ?? '');
    const id = String(m.id ?? `${home}-${away}-${m.date}`);
    const isHome = /juventus/i.test(home);
    const opponent = isHome ? away : home;
    out.push({
      id: `juve-${id}`, sport: 'juventus', date: String(m.date),
      title: 'Juventus', body: `${isHome ? 'vs' : '@'} ${opponent} sta per iniziare`,
      url: `/juventus/partite/${encodeURIComponent(id)}`,
    });
  }
  return out;
}

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const [f1, motogp, juve] = await Promise.all([loadF1(), loadMotoGP(), loadJuventus()]);
  const events: EventItem[] = [...f1, ...motogp, ...juve]
    .filter((e) => !Number.isNaN(Date.parse(e.date)));

  const { data: subs, error } = await sb.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth,lead_times')
    .eq('enabled', true);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const now = Date.now();
  const WINDOW_MS = 6 * 60 * 1000; // dispatcher gira ogni 5 min, finestra 6 min

  let sent = 0, skipped = 0, removed = 0, errors = 0;

  for (const sub of subs ?? []) {
    for (const leadMin of (sub.lead_times as number[]) ?? []) {
      const targetMs = now + leadMin * 60 * 1000;
      const due = events.filter((e) => {
        const t = Date.parse(e.date);
        return t >= targetMs - WINDOW_MS && t <= targetMs;
      });
      for (const ev of due) {
        // idempotenza
        const { data: existing } = await sb.from('push_sent_log')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('event_id', ev.id)
          .eq('lead_time', leadMin)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const minutesLabel = leadMin === 1440 ? 'tra 24 ore' :
          leadMin === 60 ? 'tra 1 ora' : `tra ${leadMin} minuti`;
        const payload = JSON.stringify({
          title: ev.title,
          body: `${ev.body} (${minutesLabel})`,
          url: ev.url,
          tag: `${ev.id}-${leadMin}`,
        });
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, payload);
          await sb.from('push_sent_log').insert({
            subscription_id: sub.id, event_id: ev.id, lead_time: leadMin,
          });
          sent++;
        } catch (e: any) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) {
            await sb.from('push_subscriptions').update({ enabled: false }).eq('id', sub.id);
            removed++;
          } else {
            errors++;
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true, eventsConsidered: events.length,
    subs: subs?.length ?? 0, sent, skipped, removed, errors,
  }), { headers: { 'Content-Type': 'application/json' } });
});