import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { isPreviewOrIframe } from "@/lib/pushClient";
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
  if (isPreviewOrIframe()) {
    // Pulizia difensiva: niente SW in preview/iframe
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch((err) => console.warn("[sw] rimozione registrazioni fallita", err));
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[sw] registrazione fallita", err));
  });
})();
