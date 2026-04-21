import { Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnavailableExternalSourceProps {
  title: string;
  description: string;
  externalLink?: string | null;
  externalLabel?: string;
  /**
   * Microcopy mostrata appena sopra il pulsante (es. "Tocca qui per
   * vedere le formazioni ufficiali su Sky Sport"). Se non fornita,
   * viene generata automaticamente a partire da `externalLabel`.
   */
  ctaHint?: string;
}

/**
 * Stato vuoto onesto per sezioni la cui fonte dati gratuita non
 * espone i contenuti richiesti (formazione, modulo, cronaca eventi
 * delle partite Juventus). Rimanda all'eventuale link esterno reale
 * presente nel payload (es. pagina Sky Sport della partita).
 */
export default function UnavailableExternalSource({
  title,
  description,
  externalLink,
  externalLabel = "Apri su Sky Sport",
  ctaHint,
}: UnavailableExternalSourceProps) {
  const hint = ctaHint ?? `Tocca il pulsante qui sotto per ${externalLabel.toLowerCase()}`;
  // id stabile derivato dal titolo per associare titolo/descrizione al container
  const baseId = `unavailable-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;
  // aria-label completo del link: chiarisce destinazione, contesto e che si apre in nuova scheda.
  const linkAriaLabel = externalLink
    ? `${externalLabel}. ${hint}. Si apre in una nuova scheda del browser.`
    : undefined;
  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="flex flex-col items-center justify-center py-12 px-4 gap-4 rounded-2xl border border-dashed border-border bg-muted/30 text-center"
    >
      <Info className="h-8 w-8 text-muted-foreground" aria-hidden="true" focusable="false" />
      <div className="space-y-2 max-w-prose">
        <h3
          id={titleId}
          className="font-heading text-base sm:text-lg font-bold uppercase tracking-wider text-foreground"
        >
          {title}
        </h3>
        <p id={descId} className="text-[0.95rem] leading-relaxed text-foreground/80">
          {description}
        </p>
      </div>
      {externalLink && (
        <div className="flex flex-col items-center gap-2.5 mt-1">
          <p
            aria-hidden="true"
            className="text-sm font-medium text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))]"
          >
            {hint}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[hsl(var(--gold))]/40 hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10 focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
          >
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={linkAriaLabel}
            >
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" focusable="false" />
              <span>{externalLabel}</span>
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </a>
          </Button>
        </div>
      )}
    </section>
  );
}
