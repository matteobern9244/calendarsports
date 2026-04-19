import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary. Catches synchronous render errors in the React tree
 * and shows a readable message instead of a blank page or an infinite spinner.
 *
 * Note: React error boundaries do NOT catch errors inside async callbacks,
 * promise rejections, or event handlers. For data-fetch failures, rely on
 * React Query's `error` state in each page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so it shows up in browser devtools and Lovable logs.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error?.message || "Errore sconosciuto";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Qualcosa è andato storto
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
          </p>
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Dettagli tecnici
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-3 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
              {message}
            </pre>
          </details>
          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Ricarica pagina
          </Button>
        </div>
      </div>
    );
  }
}
