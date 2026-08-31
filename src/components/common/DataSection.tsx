import type { ReactNode } from "react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import UnavailableExternalSource from "@/components/common/UnavailableExternalSource";

/**
 * La fonte ufficiale a cui rimandare quando i nostri dati mancano o
 * non arrivano. Si dichiara una volta per sezione: prima veniva
 * ripetuta tre volte, una per stato, ed era gia' andata a divergere.
 */
export interface ExternalSource {
  href: string;
  /** Etichetta del link in errore e nello stato vuoto. */
  label: string;
  /**
   * Etichetta della micro-CTA durante il caricamento. Se assente, in
   * caricamento non compare nessun link: e' il caso delle sezioni
   * Juventus, che rimandano a Sky Sport solo quando c'e' davvero un
   * problema da aggirare.
   */
  loadingLabel?: string;
}

interface DataSectionProps {
  /** Vero solo quando non c'e' ancora niente da mostrare. */
  isLoading: boolean;
  /** L'errore di React Query, letto come booleano. */
  error: unknown;
  /**
   * Vero quando non ci sono dati da rendere. Governa sia lo stato
   * vuoto sia i `children`: una condizione sola, quindi impossibile
   * da disallineare.
   */
  isEmpty: boolean;
  source?: ExternalSource;
  loadingMessage: string;
  errorMessage: string;
  errorDetail?: string;
  errorCtaHint?: string;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyCtaHint?: string;
  children: ReactNode;
}

/**
 * Una sezione che mostra dati presi da una fonte esterna, con i tre
 * stati che ne conseguono: caricamento, errore, fonte che non ha il
 * dato. Vive dentro un `TabsContent` delle pagine sportive.
 *
 * I `children` dipendono solo da `isEmpty`, non da `isLoading` ne' da
 * `error`: React Query conserva `data` quando un aggiornamento
 * fallisce, e in quel caso l'avviso va mostrato *sopra* i dati gia' in
 * pagina, non al posto loro.
 */
export default function DataSection({
  isLoading,
  error,
  isEmpty,
  source,
  loadingMessage,
  errorMessage,
  errorDetail,
  errorCtaHint,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyCtaHint,
  children,
}: DataSectionProps) {
  return (
    <>
      {isLoading && (
        <LoadingState
          message={loadingMessage}
          externalLink={source?.loadingLabel ? source.href : undefined}
          externalLabel={source?.loadingLabel}
        />
      )}
      {!!error && (
        <ErrorState
          message={errorMessage}
          detail={errorDetail}
          onRetry={onRetry}
          externalLink={source?.href}
          externalLabel={source?.label}
          ctaHint={errorCtaHint}
        />
      )}
      {!isLoading && !error && isEmpty && (
        <UnavailableExternalSource
          title={emptyTitle}
          description={emptyDescription}
          externalLink={source?.href}
          externalLabel={source?.label}
          ctaHint={emptyCtaHint}
        />
      )}
      {!isEmpty && children}
    </>
  );
}
