import { supabase, SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

const SW_PATH = "/sw.js";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isInIframe(): boolean {
  // L'accesso a window.top e' bloccato cross-origin: se solleva, siamo
  // certamente dentro un iframe di un'altra origine.
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  const inIframe = isInIframe();
  const host = window.location.hostname;
  const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
  return inIframe || isPreview;
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported() || isPreviewOrIframe()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH);
  } catch {
    return null;
  }
}

async function fetchVapidKey(): Promise<string> {
  const r = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/push-vapid-key`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const j = await r.json();
  return j.publicKey || "";
}

/** Gli sport per cui questo dispositivo vuole avvisi. */
export interface PushSports {
  football: boolean;
  f1: boolean;
  motogp: boolean;
}

/**
 * Cio' che il server deve sapere di questa iscrizione, oltre alle chiavi.
 * `team` e' lo slug della squadra seguita: le partite arrivano solo per lei.
 */
export interface PushSettings {
  leadTimes: number[];
  team: string;
  sports: PushSports;
}

function subscriptionPayload(sub: PushSubscription, settings: PushSettings, enabled: boolean) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json?.keys?.p256dh ?? bufToB64Url(sub.getKey("p256dh")),
      auth: json?.keys?.auth ?? bufToB64Url(sub.getKey("auth")),
    },
    leadTimes: settings.leadTimes,
    team: settings.team,
    sports: settings.sports,
    enabled,
    userAgent: navigator.userAgent,
  };
}

export async function subscribeToPush(settings: PushSettings): Promise<{
  ok: boolean;
  reason?: "denied" | "unsupported" | "error";
}> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  const perm =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const publicKey = await fetchVapidKey();
  if (!publicKey) return { ok: false, reason: "error" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: subscriptionPayload(sub, settings, true),
  });
  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

export async function updatePushSettings(
  settings: PushSettings & { enabled: boolean },
): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await ensureServiceWorker();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: subscriptionPayload(sub, settings, settings.enabled),
  });
  return !error;
}

export async function unsubscribeFromPush(settings: PushSettings): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    // La riga viene spenta ma conserva squadra e sport: il server fa l'upsert
    // di tutti i campi, e mandarne di vuoti la riporterebbe ai default.
    await updatePushSettings({ ...settings, enabled: false });
    await sub.unsubscribe();
  }
  return true;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || isPreviewOrIframe()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await reg?.pushManager.getSubscription()) ?? null;
}
