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
