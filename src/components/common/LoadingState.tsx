import { Loader2, ExternalLink } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  /**
   * Link opzionale verso la fonte ufficiale (es. ATP Tour,
   * Formula1.com, MotoGP.com). Quando fornito, renderizza una
   * micro-CTA discreta che permette all'utente di consultare i
   * dati subito anche se il caricamento richiede tempo.
   */
  externalLink?: string;
  externalLabel?: string;
}

export default function LoadingState({
  message = "Caricamento in corso...",
  externalLink,
  externalLabel = "Scopri ora su fonte ufficiale",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {externalLink && (
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-[hsl(var(--gold))]/90 hover:text-[hsl(var(--gold))] underline-offset-4 hover:underline transition-colors"
        >
          {externalLabel}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
