import { useEffect, useState } from "react";
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
  /** Mostra anche un glow gold pulsante sincronizzato col loop */
  glow?: boolean;
}

interface Spark {
  id: number;
  dx: number;
  dy: number;
  delay: number;
  scale: number;
}

/** Un ciclo di scintille: `id` cambia a ogni burst e fa da chiave di animazione. */
interface Burst {
  id: number;
  sparks: Spark[];
}

function buildSparks(count: number, radius: number): Spark[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = radius * (0.7 + Math.random() * 0.5);
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      delay: Math.random() * 0.25,
      scale: 0.7 + Math.random() * 0.6,
    };
  });
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
  glow = false,
}: SparkleLoopProps) {
  const reduce = useReducedMotion();
  // Le scintille sono generate a caso, quindi non possono nascere durante il
  // render: un valore impuro non e' ricalcolabile in sicurezza da React.
  // Vengono prodotte nell'effect che scandisce i burst e conservate in stato
  // insieme all'id del burst, che serve come `key` per far ripartire
  // l'animazione a ogni ciclo.
  const [burst, setBurst] = useState<Burst>({ id: 0, sparks: [] });

  useEffect(() => {
    if (reduce) return;
    const nextBurst = () => setBurst((b) => ({ id: b.id + 1, sparks: buildSparks(count, radius) }));
    // Primo burst leggermente ritardato per non partire subito al mount
    const initial = window.setTimeout(nextBurst, 800);
    const id = window.setInterval(nextBurst, intervalMs + Math.random() * 800);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [intervalMs, reduce, count, radius]);

  const { id: tick, sparks } = burst;

  if (reduce) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {glow && (
        <motion.span
          key={`glow-${tick}`}
          className="absolute rounded-full"
          style={{
            width: radius * 2,
            height: radius * 2,
            background:
              "radial-gradient(circle, hsl(var(--gold-light) / 0.55) 0%, hsl(var(--gold) / 0.35) 40%, transparent 70%)",
            filter: "blur(2px)",
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [0.6, 1.15, 0.85],
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: 1.4,
            ease: "easeOut",
            times: [0, 0.45, 1],
          }}
        />
      )}
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
              boxShadow: "0 0 6px hsl(var(--gold) / 0.85), 0 0 2px hsl(var(--gold-light))",
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
