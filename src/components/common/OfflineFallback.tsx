import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface OfflineFallbackProps {
  /**
   * Callback invocato quando l'utente clicca "Riprova".
   * Tipicamente un `refetch()` di React Query.
   */
  onRetry?: () => void;
  /**
   * Messaggio descrittivo opzionale.
   */
  message?: string;
}

/**
 * Schermata di fallback mostrata quando una pagina dati non ha cache
 * disponibile e l'utente e offline. Il pulsante "Riprova" e disabilitato
 * finche non torna la connessione.
 */
export default function OfflineFallback({ onRetry, message }: OfflineFallbackProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="font-heading text-xl font-bold tracking-wide uppercase">
          Nessuna connessione
        </h2>
        <p className="text-sm text-muted-foreground">
          {message ??
            "Non riesco a raggiungere i server. Controlla la connessione e riprova quando sei di nuovo online."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={!isOnline || !onRetry}
        onClick={() => onRetry?.()}
        className="gap-2 rounded-full font-heading uppercase tracking-widest text-xs"
      >
        <RefreshCw className="h-4 w-4" />
        {isOnline ? "Riprova" : "In attesa di connessione..."}
      </Button>
    </div>
  );
}