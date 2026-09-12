/**
 * Validazione del corpo di `push-subscribe`, separata da `index.ts` perche'
 * quello chiama `Deno.serve` all'import e non si puo' testare.
 *
 * Tutto cio' che arriva dal client si riduce qui a una riga di
 * `push_subscriptions` con valori sicuri: la squadra passa dalla whitelist
 * (lo slug finisce nel parametro `team` di `sports-football`, quindi in una
 * URL), gli anticipi dalla lista chiusa, gli sport diventano tre booleani.
 *
 * I campi nuovi sono facoltativi e i loro default riproducono il
 * comportamento precedente: un client vecchio, che non li manda, continua a
 * ricevere Juventus, F1 e MotoGP come prima.
 */
import { DEFAULT_TEAM_SLUG, resolveTeamStrict } from "../_shared/serieATeams.ts";

const VALID_LEAD_TIMES = new Set([15, 60, 1440]);
const DEFAULT_LEAD_TIMES = [60];
const MAX_ENDPOINT_LENGTH = 2000;

export interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  lead_times: number[];
  enabled: boolean;
  team: string;
  notify_football: boolean;
  notify_f1: boolean;
  notify_motogp: boolean;
}

export type ParseResult = { ok: true; row: SubscriptionRow } | { ok: false; error: string };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function flag(v: unknown): boolean {
  // Solo un `false` esplicito spegne: un campo assente o malformato non deve
  // togliere notifiche a nessuno.
  return v !== false;
}

export function parseSubscriptionBody(body: unknown): ParseResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const keys = (b.keys && typeof b.keys === "object" ? b.keys : {}) as Record<string, unknown>;
  const sports = (b.sports && typeof b.sports === "object" ? b.sports : {}) as Record<
    string,
    unknown
  >;

  const endpoint = str(b.endpoint);
  const p256dh = str(keys.p256dh);
  const auth = str(keys.auth);
  if (!endpoint || !p256dh || !auth || endpoint.length > MAX_ENDPOINT_LENGTH) {
    return { ok: false, error: "Missing fields" };
  }

  const rawLead = Array.isArray(b.leadTimes) ? b.leadTimes : DEFAULT_LEAD_TIMES;
  const leadTimes = [...new Set(rawLead.map(Number).filter((n) => VALID_LEAD_TIMES.has(n)))];
  if (leadTimes.length === 0) leadTimes.push(...DEFAULT_LEAD_TIMES);

  const rawTeam = str(b.team);
  const team = rawTeam ? resolveTeamStrict(rawTeam) : resolveTeamStrict(DEFAULT_TEAM_SLUG);
  if (!team) return { ok: false, error: "Squadra sconosciuta" };

  return {
    ok: true,
    row: {
      endpoint,
      p256dh,
      auth,
      user_agent: str(b.userAgent) ? str(b.userAgent).slice(0, 500) : null,
      lead_times: leadTimes,
      enabled: b.enabled !== false,
      team: team.slug,
      notify_football: flag(sports.football),
      notify_f1: flag(sports.f1),
      notify_motogp: flag(sports.motogp),
    },
  };
}
