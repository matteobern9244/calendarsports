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

/**
 * Registrazione del service worker: notifiche push e cache offline.
 *
 * Solo in produzione, fuori dall'iframe Lovable e dagli host di preview.
 *
 * **L'app installata si aggiorna da sola, sempre all'ultima versione.**
 * Tre pezzi, che funzionano solo insieme:
 *
 *   1. L'indirizzo dello script porta l'identificativo della build. Un
 *      indirizzo nuovo e' uno script che il browser **deve** scaricare: senza,
 *      la cache HTTP puo' tenersi il vecchio `sw.js` fino a un giorno intero,
 *      e chi ha la PWA aperta dalla schermata Home resta alla versione di ieri
 *      senza saperlo. Lo scope resta `/`, quindi la registrazione — e con lei
 *      l'iscrizione push — e' la stessa di prima.
 *   2. Lo script nuovo fa `skipWaiting` e `clients.claim` (in `sw.js`), cioe'
 *      prende il controllo subito invece di aspettare che tutte le schede si
 *      chiudano — cosa che in una PWA non succede mai.
 *   3. Quando il controllo passa allo script nuovo, la pagina si ricarica:
 *      il documento e' network-first, quindi torna con i riferimenti ai
 *      chunk nuovi. Si ricarica **solo** se c'era gia' un controllore: alla
 *      prima installazione non c'e' niente di vecchio da sostituire, e una
 *      ricarica li' sarebbe un lampo a vuoto.
 *
 * `updateViaCache: "none"` completa il primo punto per gli script importati,
 * e il controllo al ritorno in primo piano copre la PWA lasciata aperta per
 * giorni: il browser controlla gli aggiornamenti a ogni navigazione, ma in
 * un'app installata di navigazioni non ce ne sono.
 */
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

  let ricaricando = false;
  const controlloreIniziale = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!controlloreIniziale || ricaricando) return;
    ricaricando = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?build=${encodeURIComponent(__BUILD_ID__)}`, { updateViaCache: "none" })
      .then((registrazione) => {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registrazione.update().catch(() => {
              /* offline: si riprova alla prossima volta in primo piano */
            });
          }
        });
      })
      .catch((err) => console.warn("[sw] registrazione fallita", err));
  });
})();
