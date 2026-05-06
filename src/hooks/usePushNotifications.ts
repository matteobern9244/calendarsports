import { useCallback, useEffect, useState } from "react";
import {
  isPushSupported,
  isPreviewOrIframe,
  subscribeToPush,
  unsubscribeFromPush,
  updatePushSettings,
  getCurrentSubscription,
} from "@/lib/pushClient";

const LS_LEAD = "push.leadTimes";
const LS_ENABLED = "push.enabled";

export type LeadTime = 15 | 60 | 1440;
export const DEFAULT_LEAD_TIMES: LeadTime[] = [60];

function loadLead(): LeadTime[] {
  try {
    const raw = localStorage.getItem(LS_LEAD);
    if (!raw) return DEFAULT_LEAD_TIMES;
    const arr = JSON.parse(raw) as number[];
    const valid = arr.filter((n): n is LeadTime => n === 15 || n === 60 || n === 1440);
    return valid.length ? valid : DEFAULT_LEAD_TIMES;
  } catch { return DEFAULT_LEAD_TIMES; }
}

export function usePushNotifications() {
  const supported = isPushSupported() && !isPreviewOrIframe();
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_ENABLED) === "1"; } catch { return false; }
  });
  const [leadTimes, setLeadTimesState] = useState<LeadTime[]>(loadLead);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [busy, setBusy] = useState(false);

  // Mantieni allineato lo stato di subscription effettiva
  useEffect(() => {
    if (!supported) return;
    (async () => {
      const sub = await getCurrentSubscription();
      if (!sub && enabled) {
        setEnabledState(false);
        try { localStorage.setItem(LS_ENABLED, "0"); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const enable = useCallback(async (times: LeadTime[]) => {
    setBusy(true);
    const res = await subscribeToPush(times);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
    if (res.ok) {
      setEnabledState(true);
      try {
        localStorage.setItem(LS_ENABLED, "1");
        localStorage.setItem(LS_LEAD, JSON.stringify(times));
      } catch {}
    }
    setBusy(false);
    return res;
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setEnabledState(false);
    try { localStorage.setItem(LS_ENABLED, "0"); } catch {}
    setBusy(false);
  }, []);

  const setLeadTimes = useCallback(async (times: LeadTime[]) => {
    const safe = times.length ? times : DEFAULT_LEAD_TIMES;
    setLeadTimesState(safe);
    try { localStorage.setItem(LS_LEAD, JSON.stringify(safe)); } catch {}
    if (enabled) {
      await updatePushSettings(safe, true);
    }
  }, [enabled]);

  return {
    supported, enabled, leadTimes, permission, busy,
    enable, disable, setLeadTimes,
  };
}