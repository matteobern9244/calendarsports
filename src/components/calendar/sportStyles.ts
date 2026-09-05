import type { CalendarItem } from "@/hooks/useCalendarEvents";

/**
 * I colori per sport della pagina calendario. Stanno qui e non dentro una
 * delle viste perche' le tre viste e la pagina — legenda e dialog — usano
 * gli stessi tre dizionari: tenerli in una sola vista significherebbe che
 * le altre importano da un fratello.
 */
export const SPORT_DOT: Record<CalendarItem["sport"], string> = {
  juventus: "bg-[hsl(var(--sport-juventus))]",
  f1: "bg-[hsl(var(--sport-f1))]",
  motogp: "bg-[hsl(var(--sport-motogp))]",
};

export const SPORT_LABEL: Record<CalendarItem["sport"], string> = {
  juventus: "Juventus",
  f1: "F1",
  motogp: "MotoGP",
};

export const SPORT_BADGE: Record<CalendarItem["sport"], string> = {
  juventus:
    "border-[hsl(var(--sport-juventus))]/40 text-[hsl(var(--sport-juventus))] bg-[hsl(var(--sport-juventus))]/10",
  f1: "border-[hsl(var(--sport-f1))]/40 text-[hsl(var(--sport-f1))] bg-[hsl(var(--sport-f1))]/10",
  motogp:
    "border-[hsl(var(--sport-motogp))]/40 text-[hsl(var(--sport-motogp))] bg-[hsl(var(--sport-motogp))]/10",
};
