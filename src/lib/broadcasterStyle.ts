export type BroadcasterStyle = {
  className: string;
  /** true se richiede pill solida (DAZN style) */
  solid?: boolean;
};

type Rule = {
  match: (n: string) => boolean;
  className: string;
  solid?: boolean;
};

const RULES: Rule[] = [
  {
    match: (n) => n.includes('dazn'),
    className:
      'bg-[hsl(var(--brand-dazn))] text-[hsl(var(--brand-dazn-contrast))] border-[hsl(var(--brand-dazn))] dark:bg-[hsl(var(--brand-dazn-contrast))] dark:text-[hsl(var(--brand-dazn))] dark:border-[hsl(var(--brand-dazn-contrast))]',
    solid: true,
  },
  {
    match: (n) => n.includes('now'),
    className:
      'bg-[hsl(var(--brand-now))]/15 text-[hsl(var(--brand-now))] border-[hsl(var(--brand-now))]/40 dark:bg-[hsl(var(--brand-now))]/25 dark:text-[hsl(var(--brand-now))] dark:border-[hsl(var(--brand-now))]/60',
  },
  {
    match: (n) => n.includes('amazon') || n.includes('prime'),
    className:
      'bg-[hsl(var(--brand-amazon))]/15 text-[hsl(var(--brand-amazon))] border-[hsl(var(--brand-amazon))]/40 dark:bg-[hsl(var(--brand-amazon))]/25 dark:text-[hsl(var(--brand-amazon))] dark:border-[hsl(var(--brand-amazon))]/60',
  },
  {
    match: (n) => n.includes('mediaset'),
    className:
      'bg-[hsl(var(--brand-mediaset))]/15 text-[hsl(var(--brand-mediaset))] border-[hsl(var(--brand-mediaset))]/40 dark:bg-[hsl(var(--brand-mediaset))]/25 dark:text-[hsl(var(--brand-mediaset))] dark:border-[hsl(var(--brand-mediaset))]/60',
  },
  {
    match: (n) => n.includes('rai'),
    className:
      'bg-[hsl(var(--brand-rai))]/15 text-[hsl(var(--brand-rai))] border-[hsl(var(--brand-rai))]/40 dark:bg-[hsl(var(--brand-rai))]/25 dark:text-[hsl(var(--brand-rai))] dark:border-[hsl(var(--brand-rai))]/60',
  },
  {
    match: (n) => n.includes('tv8'),
    className:
      'bg-[hsl(var(--brand-tv8))]/15 text-[hsl(var(--brand-tv8))] border-[hsl(var(--brand-tv8))]/40 dark:bg-[hsl(var(--brand-tv8))]/25 dark:text-[hsl(var(--brand-tv8))] dark:border-[hsl(var(--brand-tv8))]/60',
  },
  {
    match: (n) => n.includes('eurosport'),
    className:
      'bg-[hsl(var(--brand-eurosport))]/15 text-[hsl(var(--brand-eurosport))] border-[hsl(var(--brand-eurosport))]/40 dark:bg-[hsl(var(--brand-eurosport))]/25 dark:text-[hsl(var(--brand-eurosport))] dark:border-[hsl(var(--brand-eurosport))]/60',
  },
  {
    match: (n) => n.includes('discovery'),
    className:
      'bg-[hsl(var(--brand-discovery))]/15 text-[hsl(var(--brand-discovery))] border-[hsl(var(--brand-discovery))]/40 dark:bg-[hsl(var(--brand-discovery))]/25 dark:text-[hsl(var(--brand-discovery))] dark:border-[hsl(var(--brand-discovery))]/60',
  },
  {
    match: (n) => n.includes('sky'),
    className:
      'bg-[hsl(var(--brand-sky))]/20 text-[hsl(var(--brand-sky))] border-[hsl(var(--brand-sky))]/40 dark:bg-[hsl(var(--brand-sky))]/30 dark:text-sky-100 dark:border-[hsl(var(--brand-sky))]/60',
  },
];

/**
 * Restituisce le classi Tailwind per uno stile badge/pill broadcaster
 * coerente con la palette oro/blu del progetto e leggibile sia in light
 * che in dark. Per broadcaster sconosciuti ritorna un fallback neutro
 * basato sui token semantici (`bg-muted`, `text-foreground`, `border-border`).
 */
export function getBroadcasterStyle(rawName: string): BroadcasterStyle {
  const n = (rawName || '').trim().toLowerCase();
  if (!n) return { className: 'bg-muted text-foreground border-border' };
  const rule = RULES.find((r) => r.match(n));
  if (rule) return { className: rule.className, solid: rule.solid };
  return { className: 'bg-muted text-foreground border-border' };
}