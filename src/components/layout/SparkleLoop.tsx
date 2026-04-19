import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface SparkleLoopProps {
  /** Numero di scintille per ogni "burst" ambient (3-5 consigliato) */
  count?: number;
  /** Intervallo medio tra i burst in ms (default 4500) */
  intervalMs?: number;
  /** Raggio massimo di irradiazione in px */
  radius?: number;
  /** Dimensione massima di ciascuna scintilla in px */
  size?: number;
}

interface Spark {
  id: number;
  dx: number;
  dy: number;
  delay: number;
  scale: number;
}

/**
 * Loop ambient di scintille gold che si irradiano dal centro del genitore
 * (tipicamente l'icona della voce attiva del menu). Rispetta
 * `prefers-reduced-motion` disattivandosi automaticamente.
 *
 * Il genitore deve avere `position: relative` (qui è dentro un `inline-flex`
 * con `relative` impostato già nel Link/icon wrapper).
 */
export function SparkleLoop({
  count = 4,
  intervalMs = 4500,
  radius = 18,
  size = 4,
}: SparkleLoopProps) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    // Primo burst leggermente ritardato per non partire subito al mount
    const initial = window.setTimeout(() => setTick((t) => t + 1), 800);
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      intervalMs + Math.random() * 800
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [intervalMs, reduce]);

  const sparks = useMemo<Spark[]>(() => {
    const arr: Spark[] = [];
    const n = count;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const dist = radius * (0.7 + Math.random() * 0.5);
      arr.push({
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        delay: Math.random() * 0.25,
        scale: 0.7 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [count, radius, tick]);

  if (reduce) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <AnimatePresence>
        {sparks.map((s) => (
          <motion.span
            key={`${tick}-${s.id}`}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background:
                "radial-gradient(circle, hsl(var(--gold-light)) 0%, hsl(var(--gold)) 55%, transparent 75%)",
              boxShadow:
                "0 0 6px hsl(var(--gold) / 0.85), 0 0 2px hsl(var(--gold-light))",
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: s.dx,
              y: s.dy,
              scale: s.scale,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.1,
              delay: s.delay,
              ease: "easeOut",
              times: [0, 0.4, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );
}
