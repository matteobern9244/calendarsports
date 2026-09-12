import { useCallback, useEffect, useRef, useState } from "react";
import {
  isPushSupported,
  isPreviewOrIframe,
  subscribeToPush,
  unsubscribeFromPush,
  updatePushSettings,
  getCurrentSubscription,
  type PushSports,
} from "@/lib/pushClient";

const LS_LEAD = "push.leadTimes";
const LS_ENABLED = "push.enabled";
const LS_SPORTS = "push.sports";

export type LeadTime = 15 | 60 | 1440;
export const DEFAULT_LEAD_TIMES: LeadTime[] = [60];
export type { PushSports };
export type SportKey = keyof PushSports;

/**
 * Tutti accesi: e' il comportamento che le notifiche avevano prima che gli
 * sport si potessero scegliere, e chi non tocca niente deve ritrovarlo.
 */
export const DEFAULT_SPORTS: PushSports = { football: true, f1: true, motogp: true };

function loadLead(): LeadTime[] {
  try {
    const raw = localStorage.getItem(LS_LEAD);
    if (!raw) return DEFAULT_LEAD_TIMES;
    const arr = JSON.parse(raw) as number[];
    const valid = arr.filter((n): n is LeadTime => n === 15 || n === 60 || n === 1440);
    return valid.length ? valid : DEFAULT_LEAD_TIMES;
  } catch {
    return DEFAULT_LEAD_TIMES;
  }
}

function loadSports(): PushSports {
  try {
    const raw = localStorage.getItem(LS_SPORTS);
    if (!raw) return DEFAULT_SPORTS;
    const parsed = JSON.parse(raw) as Partial<Record<SportKey, unknown>>;
    // Solo un `false` esplicito spegne: un valore malformato non toglie niente.
    return {
      football: parsed.football !== false,
      f1: parsed.f1 !== false,
      motogp: parsed.motogp !== false,
    };
  } catch {
    return DEFAULT_SPORTS;
  }
}

function persist(key: string, value: string) {
  // localStorage puo' fallire (modalita' privata, quota): lo stato in memoria
  // e' gia' allineato, la mancata persistenza non e' recuperabile.
  try {
    localStorage.setItem(key, value);
  } catch {
    /* persistenza best-effort */
  }
}

/**
 * Le notifiche push di questo dispositivo.
 *
 * `teamSlug` e' la squadra seguita: viaggia con l'iscrizione, perche' il
 * server manda le partite **solo** di quella. Se cambia mentre le notifiche
 * sono attive, l'iscrizione viene aggiornata da sola: prima il server
 * continuava a mandare la squadra vecchia finche' non si spegneva e riaccendeva.
 */
export function usePushNotifications(teamSlug: string) {
  const supported = isPushSupported() && !isPreviewOrIframe();
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_ENABLED) === "1";
    } catch {
      return false;
    }
  });
  const [leadTimes, setLeadTimesState] = useState<LeadTime[]>(loadLead);
  const [sports, setSportsState] = useState<PushSports>(loadSports);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [busy, setBusy] = useState(false);

  // Mantieni allineato lo stato di subscription effettiva
  useEffect(() => {
    if (!supported) return;
    (async () => {
      const sub = await getCurrentSubscription();
      if (!sub && enabled) {
        setEnabledState(false);
        persist(LS_ENABLED, "0");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  // La squadra segue la preferenza. L'effect salta il primo render — la
  // squadra iniziale e' gia' quella con cui ci si e' iscritti — e gira solo
  // quando lo slug cambia davvero.
  const previousTeam = useRef(teamSlug);
  useEffect(() => {
    if (previousTeam.current === teamSlug) return;
    previousTeam.current = teamSlug;
    if (!enabled) return;
    void updatePushSettings({ leadTimes, team: teamSlug, sports, enabled: true });
  }, [teamSlug, enabled, leadTimes, sports]);

  const enable = useCallback(async () => {
    setBusy(true);
    const res = await subscribeToPush({ leadTimes, team: teamSlug, sports });
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
    if (res.ok) {
      setEnabledState(true);
      persist(LS_ENABLED, "1");
      persist(LS_LEAD, JSON.stringify(leadTimes));
      persist(LS_SPORTS, JSON.stringify(sports));
    }
    setBusy(false);
    return res;
  }, [leadTimes, teamSlug, sports]);

  const disable = useCallback(async () => {
    setBusy(true);
    await unsubscribeFromPush({ leadTimes, team: teamSlug, sports });
    setEnabledState(false);
    persist(LS_ENABLED, "0");
    setBusy(false);
  }, [leadTimes, teamSlug, sports]);

  const setLeadTimes = useCallback(
    async (times: LeadTime[]) => {
      const safe = times.length ? times : DEFAULT_LEAD_TIMES;
      setLeadTimesState(safe);
      persist(LS_LEAD, JSON.stringify(safe));
      if (enabled) {
        await updatePushSettings({ leadTimes: safe, team: teamSlug, sports, enabled: true });
      }
    },
    [enabled, teamSlug, sports],
  );

  const setSport = useCallback(
    async (sport: SportKey, on: boolean) => {
      const next = { ...sports, [sport]: on };
      setSportsState(next);
      persist(LS_SPORTS, JSON.stringify(next));
      if (enabled) {
        await updatePushSettings({ leadTimes, team: teamSlug, sports: next, enabled: true });
      }
    },
    [enabled, leadTimes, teamSlug, sports],
  );

  return {
    supported,
    enabled,
    leadTimes,
    sports,
    permission,
    busy,
    enable,
    disable,
    setLeadTimes,
    setSport,
  };
}
