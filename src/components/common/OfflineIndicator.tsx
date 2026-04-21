import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Banner sticky mostrato in cima al main quando il browser e offline.
 * Usa il token semantico `--destructive` per coerenza con la palette.
 * Animazione slide-down 180ms; rispetta `prefers-reduced-motion` via
 * Framer Motion (che disattiva auto-tween se l'utente lo ha richiesto).
 */
export default function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  return (
    <AnimatePresence initial={false}>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          className="sticky top-0 z-40 w-full bg-destructive text-destructive-foreground shadow-md"
        >
          <div className="container flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-heading uppercase tracking-wider">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Sei offline · alcuni dati potrebbero non essere aggiornati
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}