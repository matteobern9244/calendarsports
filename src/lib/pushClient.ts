import { supabase, SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

const SW_PATH = "/sw.js";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
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

export async function subscribeToPush(leadTimes: number[]): Promise<{
  ok: boolean; reason?: "denied" | "unsupported" | "error";
}> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  const perm = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
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

  const json = sub.toJSON() as any;
  const payload = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json?.keys?.p256dh ?? bufToB64Url(sub.getKey("p256dh")),
      auth: json?.keys?.auth ?? bufToB64Url(sub.getKey("auth")),
    },
    leadTimes,
    enabled: true,
    userAgent: navigator.userAgent,
  };

  const { error } = await supabase.functions.invoke("push-subscribe", { body: payload });
  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

export async function updatePushSettings(leadTimes: number[], enabled: boolean): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await ensureServiceWorker();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const json = sub.toJSON() as any;
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: {
      endpoint: sub.endpoint,
      keys: {
        p256dh: json?.keys?.p256dh ?? bufToB64Url(sub.getKey("p256dh")),
        auth: json?.keys?.auth ?? bufToB64Url(sub.getKey("auth")),
      },
      leadTimes,
      enabled,
      userAgent: navigator.userAgent,
    },
  });
  return !error;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await updatePushSettings([], false);
    await sub.unsubscribe();
  }
  return true;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || isPreviewOrIframe()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await reg?.pushManager.getSubscription()) ?? null;
}