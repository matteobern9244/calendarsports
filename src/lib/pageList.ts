/**
 * Le pagine da mostrare in una barra di paginazione, con gli ellissi.
 *
 * Fino a sette pagine si elencano tutte. Oltre, restano la prima, l'ultima e
 * le vicine della corrente, e le lacune diventano un'ellissi. Viveva dentro
 * `JuventusPage.tsx` senza test: e' aritmetica che sbaglia di uno ai bordi
 * senza far rumore, perche' la barra mostra comunque *qualcosa*.
 */
export type PageListItem = number | "ellipsis";

export function buildPageList(current: number, total: number): PageListItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: PageListItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}
