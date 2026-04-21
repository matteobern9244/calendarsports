import { Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnavailableExternalSourceProps {
  title: string;
  description: string;
  externalLink?: string | null;
  externalLabel?: string;
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
}: UnavailableExternalSourceProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-4 rounded-2xl border border-dashed border-border bg-muted/30 text-center">
      <Info className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {externalLink && (
        <Button asChild variant="outline" size="sm">
          <a href={externalLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            {externalLabel}
          </a>
        </Button>
      )}
    </div>
  );
}
