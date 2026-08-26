import { useSyncExternalStore } from "react";
import {
  getNowMinute,
  getNowSecond,
  subscribeCountdown,
} from "@/lib/countdownClock";

/**
 * Orario corrente letto dal clock globale, non da `Date.now()`.
 *
 * Chiamare `Date.now()` dentro un render (o dentro `useMemo`) e' impuro: il
 * risultato non e' riproducibile e React non puo' ricalcolare il valore in
 * sicurezza. Il clock in `countdownClock.ts` e' invece uno store esterno con
 * snapshot stabile, quindi leggerlo in render e' puro e il componente si
 * ridisegna solo quando lo snapshot cambia davvero.
 *
 * Usa la risoluzione al minuto per liste e conti alla rovescia lunghi, quella
 * al secondo solo dove il secondo si vede.
 */
export function useNowMinute(): number {
  return useSyncExternalStore(
    (cb) => subscribeCountdown(cb, "minute"),
    getNowMinute,
    getNowMinute,
  );
}

export function useNowSecond(): number {
  return useSyncExternalStore(
    (cb) => subscribeCountdown(cb, "second"),
    getNowSecond,
    getNowSecond,
  );
}
