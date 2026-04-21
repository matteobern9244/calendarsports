import { useEffect, useRef, useState } from "react";

/**
 * Hook che espone lo stato di connessione del browser.
 * - `isOnline`: true se il browser dichiara di essere online (`navigator.onLine`).
 * - `justReconnected`: true per ~3s subito dopo il ritorno online, utile
 *   per pilotare un toast di conferma senza ripeterlo a ogni render.
 *
 * Limiti noti:
 * - `navigator.onLine` riflette lo stato del network adapter, non la
 *   raggiungibilita reale dei server (es. WiFi connesso ma DNS rotto).
 * - In SSR, default `true`.
 */
export function useOnlineStatus(): { isOnline: boolean; justReconnected: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setJustReconnected(false);
        timerRef.current = null;
      }, 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { isOnline, justReconnected };
}