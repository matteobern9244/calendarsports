import OfflineFallback from "@/components/common/OfflineFallback";

interface OfflinePageFallbackProps {
  /** Tipicamente i `refetch()` delle sezioni della pagina, in sequenza. */
  onRetry: () => void;
}

/**
 * `OfflineFallback` che occupa la pagina intera, cioe' dentro il
 * contenitore che le quattro pagine sportive usano per il loro contenuto.
 * Era lo stesso `div` ripetuto quattro volte accanto a quattro `if`
 * diversi: la condizione resta di chi la scrive (`allSectionsUnavailable`),
 * qui sta solo la resa.
 */
export default function OfflinePageFallback({ onRetry }: OfflinePageFallbackProps) {
  return (
    <div className="container py-8 sm:py-12">
      <OfflineFallback onRetry={onRetry} />
    </div>
  );
}
