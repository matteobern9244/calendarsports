import { Loader2 } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import { cn } from "@/lib/utils";

interface LandingSpinnerProps {
  /**
   * Titolo della sezione mostrato sopra lo spinner (es. "Juventus").
   * Quando definito, viene renderizzato con `SectionHeader` per
   * mantenere coerente l'header tra stato di caricamento e stato
   * "pronto", evitando un riposizionamento del titolo dopo il fetch.
   */
  title?: string;
  /**
   * Messaggio italiano sotto lo spinner. Default coerente con la
   * policy di lingua del progetto.
   */
  message?: string;
  /**
   * Altezza minima riservata dallo spinner. Default `60vh` per
   * occupare la fold della pagina e prevenire qualsiasi salto di
   * layout o "micro-lampeggio" tra spinner e contenuto reale anche
   * su dispositivi lenti. Accetta classi Tailwind se serve override.
   */
  minHeightClassName?: string;
  /**
   * Classi extra opzionali sul wrapper esterno.
   */
  className?: string;
}

/**
 * Spinner di atterraggio riusabile e SSR-friendly.
 *
 * - Nessun hook lato client (`useEffect`, `useState`, ecc.) e nessun
 *   accesso a `window`/`document`: il markup e' identico tra render
 *   server e render browser, quindi non genera mismatch idratazione
 *   ne' "doppio mount" che causerebbero un lampeggio.
 * - Il wrapper riserva un'altezza minima fissa (default `60vh`) per
 *   evitare che il contenuto reale, una volta caricato, sposti la
 *   pagina di centinaia di pixel. Tutta l'animazione e' delegata a
 *   `animate-spin` di Tailwind, che usa `transform` e non causa
 *   layout shift.
 * - Tutti i colori provengono dai token semantici (`primary`,
 *   `muted-foreground`), nessun colore hardcoded.
 */
export default function LandingSpinner({
  title,
  message = "Caricamento in corso...",
  minHeightClassName = "min-h-[60vh]",
  className,
}: LandingSpinnerProps) {
  return (
    <div className={cn("container py-8 sm:py-12", className)}>
      {title && (
        <div className="mb-2">
          <SectionHeader title={title} />
        </div>
      )}
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn(
          "flex flex-col items-center justify-center gap-4",
          minHeightClassName,
        )}
      >
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}
