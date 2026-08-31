import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * Paginazione delle due liste di `StreamingPage`.
 *
 * Le frecce ai bordi non si limitano a `pointer-events-none`, che toglie il
 * puntatore e lascia il controllo raggiungibile con Tab e attivabile con
 * Invio: dichiarano `aria-disabled` ed escono dal percorso da tastiera.
 */
export default function PagerNav({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  // `pointer-events-none` toglie il puntatore e basta: il link resta nel tab
  // order e resta attivabile con Invio. Servono anche `aria-disabled`, che lo
  // dichiara agli screen reader, e `tabIndex={-1}`, che lo toglie davvero dal
  // percorso da tastiera. La guardia negli `onClick` impediva gia' il salto
  // fuori intervallo, ma non impediva al controllo di mentire.
  const atFirst = page === 1;
  const atLast = page === pageCount;
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={atFirst}
            tabIndex={atFirst ? -1 : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onChange(page - 1);
            }}
            className={cn(atFirst && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
        {pages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href="#"
              isActive={p === page}
              onClick={(e) => {
                e.preventDefault();
                onChange(p);
              }}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={atLast}
            tabIndex={atLast ? -1 : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (page < pageCount) onChange(page + 1);
            }}
            className={cn(atLast && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
