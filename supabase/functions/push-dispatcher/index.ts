import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';
import { dispatcherConfig } from './env.ts';
import {
  ROME_TIME_ZONE,
  formatRomeEventDateTime,
  formatRomeEventTime,
  formatRomeDayLabel,
  getF1Season,
  getJuventusSeason,
  getMotoGPSeason,
  toEventTimestampMs,
} from './timezone.ts';

const {
  supabaseUrl,
  serviceRoleKey,
  anonKey,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
} = dispatcherConfig;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type EventItem = {
  id: string;
  sport: 'juventus' | 'f1' | 'motogp';
  date: string;
  title: string;
  body: string;
  url: string;
};

async function fetchFn(name: string, qs = ''): Promise<any> {
  const url = `${supabaseUrl}/functions/v1/${name}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  if (!r.ok) return null;
  try {
    const j = await r.json();
    return j?.success ? j.data : j;
  } catch { return null; }
}

function shortGp(name: string): string {
  return name
    .replace(/^Gran Premio (del|di|della|delle|d'|dell'|degli)\s+/i, '')
    .replace(/^GP\s+(del|di|della|delle|d'|dell'|degli)\s+/i, '')
    .replace(/^GP\s+/i, '')
    .trim();
}

async function loadF1(): Promise<EventItem[]> {
  const data = await fetchFn('sports-f1', `action=calendar&season=${getF1Season()}`);
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
      const iso = x.s.time ? `${x.s.date}T${String(x.s.time).replace(/Z$/i, '')}Z` : `${x.s.date}T00:00:00Z`;
      out.push({ id: `${baseId}-${x.k}`, sport: 'f1', date: iso,
        title: `F1 · ${ctx}`, body: `${x.l} sta per iniziare`, url: '/formula1' });
    }
    if (r.date) {
      const time = String(r.time ?? '00:00:00Z');
      const iso = `${r.date}T${time.replace(/Z$/i, '')}Z`;
      out.push({ id: `${baseId}-race`, sport: 'f1', date: iso,
        title: `F1 · ${ctx}`, body: 'La gara sta per iniziare', url: '/formula1' });
    }
  }
  return out;
}

async function loadMotoGP(): Promise<EventItem[]> {
  const data = await fetchFn('sports-motogp', `action=calendar&season=${getMotoGPSeason()}`);
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
      // Fallback senza sessions: usiamo solo se conosciamo un orario reale.
      // Evitiamo orari inventati (es. 13:00 UTC) che generano notifiche errate.
      const raceIso = r.time
        ? `${r.date_end}T${String(r.time).replace(/Z$/i, '')}Z`
        : null;
      if (raceIso) {
        out.push({ id: `${baseId}-race`, sport: 'motogp', date: raceIso,
          title: `MotoGP · ${ctx}`, body: 'La gara sta per iniziare', url: '/motogp' });
      }
    }
  }
  return out;
}

async function loadJuventus(): Promise<EventItem[]> {
  const season = getJuventusSeason();
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

Deno.serve(async (req) => {
  const expected = Deno.env.get('DISPATCH_SECRET');
  if (!expected) {
    console.error('[push-dispatcher] DISPATCH_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }
  const provided = req.headers.get('x-dispatch-secret') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  const [f1, motogp, juve] = await Promise.all([loadF1(), loadMotoGP(), loadJuventus()]);
  const events: EventItem[] = [...f1, ...motogp, ...juve]
    .filter((e) => toEventTimestampMs(e.date) !== null);

  const { data: subs, error } = await sb.from('push_subscriptions')
    .select('id,endpoint,p256dh,auth,lead_times')
    .eq('enabled', true);
  if (error) {
    console.error('[push-dispatcher] subscriptions query failed', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }

  const now = Date.now();
  const WINDOW_MS = 6 * 60 * 1000;

  let sent = 0, skipped = 0, removed = 0, errors = 0;

  for (const sub of subs ?? []) {
    for (const leadMin of (sub.lead_times as number[]) ?? []) {
      const targetMs = now + leadMin * 60 * 1000;
      const due = events.filter((e) => {
        const t = toEventTimestampMs(e.date);
        return t !== null && t >= targetMs - WINDOW_MS && t <= targetMs;
      });
      for (const ev of due) {
        const { data: existing } = await sb.from('push_sent_log')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('event_id', ev.id)
          .eq('lead_time', leadMin)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const eventTime = formatRomeEventTime(ev.date);
        const eventDateTime = formatRomeEventDateTime(ev.date);
        const dayLabel = formatRomeDayLabel(ev.date);
        // Indichiamo sempre il giorno se l'evento NON e' oggi (es. notifica
        // di sera per evento dopo mezzanotte), così "alle 00:30" non viene
        // letto come oggi. Per preavvisi brevi aggiungiamo anche "(tra X)"
        // per dare urgenza.
        const dayPrefix = dayLabel && dayLabel !== 'oggi' ? `${dayLabel} ` : '';
        const timeLabel = eventTime ? `${dayPrefix}alle ${eventTime}` : dayLabel;
        let when: string;
        if (leadMin >= 1440) {
          when = timeLabel;
        } else {
          const minutesLabel = leadMin === 60 ? 'tra 1 ora' : `tra ${leadMin} minuti`;
          when = timeLabel ? `${timeLabel} (${minutesLabel})` : minutesLabel;
        }
        const body = when ? `${ev.body} ${when}` : ev.body;
        const payload = JSON.stringify({
          title: ev.title,
          body,
          url: ev.url,
          tag: `${ev.id}-${leadMin}`,
          eventDateTime,
          eventTimeZone: ROME_TIME_ZONE,
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