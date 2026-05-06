import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cleanup one-shot: rimuove la chiave delle preferenze stagione obsolete.
// Da quando le stagioni sono calcolate automaticamente (vedi `src/lib/currentSeason.ts`),
// il valore salvato non ha più effetto sulla UI.
try {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    localStorage.removeItem("cse-seasons");
  }
} catch {
  // localStorage può non essere disponibile (private mode, quota, ecc.).
}

createRoot(document.getElementById("root")!).render(<App />);

// Registrazione service worker per notifiche push.
// Solo in produzione fuori dall'iframe Lovable e dagli host di preview.
(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  const host = window.location.hostname;
  const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
  if (inIframe || isPreview) {
    // Pulizia difensiva: niente SW in preview/iframe
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
})();
