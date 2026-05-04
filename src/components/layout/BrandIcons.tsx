import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Home — calendario stilizzato Calendar Events */
export const HomeBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M8 3v4M16 3v4" />
    <circle cx="8" cy="15" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

/** Calendario — griglia mese con marker eventi */
export const CalendarBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    <path d="M3 9h18" />
    <path d="M8 2.5v4M16 2.5v4" />
    <path d="M7 12.5h2M11 12.5h2M15 12.5h2" strokeWidth="1.5" />
    <path d="M7 16h2M11 16h2M15 16h2" strokeWidth="1.5" />
  </svg>
);

/** Streaming — play dentro a uno schermo */
export const StreamingBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
    <path d="M8 21h8M12 17.5V21" />
    <path d="M10.5 8.7v4.6l4-2.3z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);

/** Sinner — racchetta da tennis con pallina */
export const TennisBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="9.5" cy="9.5" rx="6" ry="6.5" transform="rotate(-35 9.5 9.5)" />
    <path d="M5.6 6.2c2.4 1.4 5.4 4.4 6.8 6.8M13.5 5.6c1.4 2.4 1.4 5.6 0 8M5 13.5c2.4 1.4 5.6 1.4 8 0" strokeWidth="1.2" />
    <path d="M13.5 13.5l5.5 5.8" strokeWidth="2.2" />
    <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

/** Juventus — scudo con stelle */
export const JuveBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4h16v8c0 4.5-3.6 7.6-8 9-4.4-1.4-8-4.5-8-9V4z" />
    <path d="M8 4v16M16 4v16M4 8h16M4 14h16" strokeWidth="1.2" />
    <path d="M12 6.2l.6 1.4 1.5.1-1.1 1 .4 1.5-1.4-.8-1.4.8.4-1.5-1.1-1 1.5-.1z" fill="currentColor" stroke="none" />
  </svg>
);

/** F1 — monoposto stilizzata */
export const F1BrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 15h3l2-3h6l3 2h6v2.5H2z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
    <circle cx="6.5" cy="17.5" r="2.2" fill="hsl(var(--background))" stroke="currentColor" />
    <circle cx="17.5" cy="17.5" r="2.2" fill="hsl(var(--background))" stroke="currentColor" />
    <path d="M9 12V9.5h4l1.5 2.5" />
    <path d="M2 9h4M2 7h6" strokeWidth="1.2" />
  </svg>
);

/** MotoGP — moto stilizzata */
export const MotoGPBrandIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="5.5" cy="16.5" r="3.5" />
    <circle cx="18.5" cy="16.5" r="3.5" />
    <path d="M5.5 16.5l4-6h5l2 3.5" />
    <path d="M9 10.5h6l1.5-2.5h2.5" />
    <path d="M14 10.5l4.5 6" />
    <path d="M11 7.5h3" strokeWidth="2.2" />
  </svg>
);
