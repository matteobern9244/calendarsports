import { AlertTriangle, ExternalLink, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  /**
   * Dettaglio aggiuntivo opzionale (es. "Il sito Formula1.com potrebbe
   * essere temporaneamente lento o irraggiungibile."). Aiuta l'utente
   * a capire che il problema potrebbe essere lato fonte esterna.
   */
  detail?: string;
  /**
   * Link verso la fonte ufficiale. Quando fornito, mostra un secondo
   * pulsante che invita ad aprire la fonte esterna mentre la nostra
   * API non risponde.
   */
  externalLink?: string;
  externalLabel?: string;
  ctaHint?: string;
}

export default function ErrorState({
  message = "Non riusciamo a caricare i dati in questo momento.",
  onRetry,
  detail,
  externalLink,
  externalLabel,
  ctaHint,
}: ErrorStateProps) {
  const fallbackHint =
    externalLink && externalLabel
      ? ctaHint ?? `Nel frattempo puoi consultare i dati ufficiali: tocca qui per ${externalLabel.toLowerCase()}.`
      : null;
  const linkAriaLabel =
    externalLink && externalLabel
      ? `${externalLabel}. ${fallbackHint}. Si apre in una nuova scheda del browser.`
      : undefined;
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-16 px-4 gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" focusable="false" />
      <div className="space-y-1.5 max-w-prose">
        <p className="text-base font-heading font-bold text-foreground">{message}</p>
        {detail && (
          <p className="text-[0.95rem] leading-relaxed text-foreground/80">{detail}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Riprova a caricare i dati"
          >
            <RotateCw className="h-4 w-4 mr-2" aria-hidden="true" focusable="false" />
            Riprova
          </Button>
        )}
        {externalLink && externalLabel && (
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
        )}
      </div>
      {fallbackHint && (
        <p
          aria-hidden="true"
          className="text-sm font-medium text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))]"
        >
          {fallbackHint}
        </p>
      )}
    </section>
  );
}
