/**
 * Clock store globale per countdown UI.
 *
 * Sostituisce N `setInterval` indipendenti (uno per chip countdown) con un
 * singolo timer condiviso a livello applicazione. Tutti i subscriber vedono
 * lo stesso istante nello stesso commit React, eliminando flicker e
 * sfasamenti visivi tra card adiacenti.
 *
 * - Tick adattivo: 1s se almeno un subscriber chiede risoluzione "second",
 *   30s altrimenti. Risparmia CPU quando solo i chip "g/h/m" sono visibili.
 * - Pausa quando `document.visibilityState === "hidden"`, riprende con tick
 *   immediato al ritorno in foreground.
 * - Snapshot separati per `second` e `minute`: i subscriber "minute" non
 *   ricevono nuovi valori (e quindi non si re-renderizzano) durante i tick
 *   intra-minuto richiesti dai subscriber "second".
 */

type Resolution = "second" | "minute";

type Subscriber = {
  cb: () => void;
  res: Resolution;
};

const subscribers = new Set<Subscriber>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;
let currentTickMs: number | null = null;

let nowSecond = Date.now();
// `nowMinute` viene aggiornato solo quando il minuto cambia rispetto allo
// snapshot precedente: garantisce identita' referenziale stabile per i
// subscriber che lavorano al minuto.
let nowMinute = nowSecond;
let lastMinuteBucket = Math.floor(nowSecond / 60_000);

function computeDesiredTickMs(): number | null {
  if (subscribers.size === 0) return null;
  for (const s of subscribers) {
    if (s.res === "second") return 1000;
  }
  return 30_000;
}

function tick(): void {
  const next = Date.now();
  const prevSecond = nowSecond;
  nowSecond = next;

  const bucket = Math.floor(next / 60_000);
  const minuteChanged = bucket !== lastMinuteBucket;
  if (minuteChanged) {
    lastMinuteBucket = bucket;
    nowMinute = next;
  }

  // Notifica solo i subscriber il cui snapshot e' effettivamente cambiato.
  // - "second": cambia ad ogni tick.
  // - "minute": cambia solo ai cambi minuto.
  if (prevSecond !== next || minuteChanged) {
    for (const s of subscribers) {
      if (s.res === "second" || minuteChanged) {
        try {
          s.cb();
        } catch {
          // Subscriber callback failures non devono rompere il loop.
        }
      }
    }
  }
}

function rescheduleInterval(): void {
  const desired = computeDesiredTickMs();
  if (desired === currentTickMs) return;

  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  currentTickMs = desired;
  if (desired === null) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  intervalId = setInterval(tick, desired);
}

function handleVisibilityChange(): void {
  if (typeof document === "undefined") return;
  if (document.visibilityState === "hidden") {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    return;
  }
  // Tornati visibili: ricalcola subito e riavvia il timer.
  tick();
  if (subscribers.size > 0 && intervalId === null && currentTickMs !== null) {
    intervalId = setInterval(tick, currentTickMs);
  }
}

function ensureVisibilityBound(): void {
  if (visibilityBound) return;
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  visibilityBound = true;
}

/**
 * Iscrive un callback al clock globale alla risoluzione richiesta.
 * Ritorna la funzione di cleanup.
 */
export function subscribeCountdown(cb: () => void, res: Resolution): () => void {
  const sub: Subscriber = { cb, res };
  subscribers.add(sub);
  ensureVisibilityBound();
  rescheduleInterval();
  return () => {
    subscribers.delete(sub);
    rescheduleInterval();
  };
}

/** Snapshot stabile per subscriber a risoluzione "second". */
export function getNowSecond(): number {
  return nowSecond;
}

/**
 * Snapshot stabile per subscriber a risoluzione "minute". Cambia solo
 * quando passa un minuto reale, anche se il timer interno tickka piu'
 * spesso per altri subscriber.
 */
export function getNowMinute(): number {
  return nowMinute;
}
