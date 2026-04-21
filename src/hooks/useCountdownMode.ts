/**
 * Hook React per leggere/scrivere la modalita' globale dei countdown
 * ("realtime" vs "saver"), persistita su `localStorage` e sincronizzata
 * con `src/lib/countdownClock.ts`.
 *
 * - "realtime": tick globale a 1s quando almeno un chip lo richiede,
 *   altrimenti 30s. Default.
 * - "saver": tick globale fisso a 60s, riduce il consumo CPU sui
 *   dispositivi mobili. I chip "secondi" mostrano comunque il valore,
 *   ma aggiornato una volta al minuto.
 *
 * La sincronizzazione tra tab/finestre avviene via evento `storage`
 * standard del browser.
 */
import { useEffect, useState } from "react";
import {
  type CountdownMode,
  getCountdownMode,
  setCountdownMode as setGlobalCountdownMode,
} from "@/lib/countdownClock";

const STORAGE_KEY = "cse-countdown-mode";

export function useCountdownMode(): {
  mode: CountdownMode;
  setMode: (mode: CountdownMode) => void;
} {
  const [mode, setModeState] = useState<CountdownMode>(() => getCountdownMode());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next: CountdownMode = e.newValue === "saver" ? "saver" : "realtime";
      setModeState(next);
      setGlobalCountdownMode(next);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setMode = (next: CountdownMode) => {
    setModeState(next);
    setGlobalCountdownMode(next);
  };

  return { mode, setMode };
}

export type { CountdownMode };