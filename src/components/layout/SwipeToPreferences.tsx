import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";
import { useAuth } from "@/contexts/useAuth";
import { useSwipeFromRight, useTouchDevice } from "@/hooks/useSwipeFromRight";

const CHIAVE_VISTO = "cse-swipe-preferenze";

function giaVisto(): boolean {
  try {
    return window.localStorage.getItem(CHIAVE_VISTO) === "1";
  } catch {
    return false;
  }
}

function segnaVisto() {
  try {
    window.localStorage.setItem(CHIAVE_VISTO, "1");
  } catch {
    /* localStorage puo' non essere disponibile */
  }
}

/**
 * La linguetta sul bordo destro che apre le preferenze: si tocca, o si tira.
 *
 * Fino alla 3.3.1 qui c'era un indizio: una striscia d'oro al 22% che
 * respirava fra il 20% e il 55% di opacita' per dodici secondi e poi spariva,
 * per sempre dopo il primo swipe. Sul navy scuro quell'oro effettivo era
 * intorno al 12%: il proprietario del prodotto, sul telefono, non l'ha mai
 * visto. Un suggerimento che non si vede non suggerisce niente, e un gesto
 * senza niente da toccare non ha nessun ripiego quando il sistema se lo
 * prende.
 *
 * Ora e' un comando: una linguetta sempre visibile, per chi ha l'accesso e
 * uno schermo tattile, su ogni schermata sotto il `Layout`. Il tocco apre il
 * pannello; il trascinamento verso sinistra, da lei o dalla fascia destra
 * dello schermo, anche. Pulsa finche' non e' stata usata una volta — un
 * richiamo per chi non la conosce — e poi resta ferma: chi ha imparato non
 * ha piu' bisogno del richiamo, ma il comando resta dov'e'.
 *
 * Il pulsante nell'intestazione resta la strada principale: questa e' una
 * scorciatoia in piu', non un modo diverso di fare la stessa cosa.
 *
 * Vive dentro il provider del pannello e non nel `Layout`, che quel provider
 * lo monta: da fuori l'hook non lo vedrebbe.
 */
export default function SwipeToPreferences() {
  const { open, setOpen } = usePreferencesPanel();
  const { user } = useAuth();
  const tattile = useTouchDevice();
  const [imparato, setImparato] = useState(giaVisto);
  const linguetta = useRef<HTMLButtonElement>(null);
  /*
    Il gesto apre le preferenze, e le preferenze esistono solo con l'accesso:
    senza sessione non c'e' niente da aprire, e una linguetta che non apre
    niente e' peggio di nessuna linguetta.
  */
  const disponibile = tattile && Boolean(user);

  const apri = useCallback(() => {
    setOpen(true);
    segnaVisto();
    setImparato(true);
  }, [setOpen]);

  useSwipeFromRight(apri, disponibile, linguetta);

  if (!disponibile || open) return null;

  return (
    <button
      ref={linguetta}
      type="button"
      aria-label="Apri le preferenze"
      aria-controls="preferences-panel"
      data-testid="linguetta-preferenze"
      onClick={apri}
      className={cn(
        // Sotto l'intestazione e il pannello (z-50): quando si aprono, passano sopra.
        "fixed right-0 top-1/2 z-40 flex h-14 w-[22px] -translate-y-1/2 items-center justify-center",
        "rounded-l-xl border border-r-0 border-[hsl(var(--gold))]/60 bg-[hsl(var(--gold))]/35",
        "text-[hsl(var(--gold))] shadow-[-4px_0_14px_-6px_hsl(var(--gold)/0.6)] backdrop-blur-sm",
        "touch-manipulation select-none transition-colors active:bg-[hsl(var(--gold))]/55",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]",
        !imparato && "motion-safe:animate-swipe-hint",
      )}
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
