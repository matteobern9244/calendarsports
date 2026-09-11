import type { CalendarSport } from "@/hooks/useCalendarEvents";
import type { SerieATeam } from "@/lib/serieATeams";

/**
 * Colori ed etichette per sport della pagina calendario. Stanno qui e non
 * dentro una delle viste perche' le tre viste e la pagina — legenda e dialog —
 * usano gli stessi: tenerli in una sola vista significherebbe che le altre
 * importano da un fratello.
 */
export const SPORT_DOT: Record<CalendarSport, string> = {
  football: "bg-[hsl(var(--sport-football))]",
  f1: "bg-[hsl(var(--sport-f1))]",
  motogp: "bg-[hsl(var(--sport-motogp))]",
};

export const SPORT_BADGE: Record<CalendarSport, string> = {
  football:
    "border-[hsl(var(--sport-football))]/40 text-[hsl(var(--sport-football))] bg-[hsl(var(--sport-football))]/10",
  f1: "border-[hsl(var(--sport-f1))]/40 text-[hsl(var(--sport-f1))] bg-[hsl(var(--sport-f1))]/10",
  motogp:
    "border-[hsl(var(--sport-motogp))]/40 text-[hsl(var(--sport-motogp))] bg-[hsl(var(--sport-motogp))]/10",
};

const ALTRI_SPORT: Record<Exclude<CalendarSport, "football">, string> = {
  f1: "F1",
  motogp: "MotoGP",
};

/**
 * L'etichetta con cui una fonte si presenta: legenda, filtri, nomi
 * accessibili dei bottoni evento.
 *
 * E' una funzione e non piu' un dizionario perche' una delle tre voci non e'
 * una costante. La riga del calcio dice di **chi** sono quelle partite, ed e'
 * l'unica scritta che lo dica: lasciarla ferma su «Juventus» sopra il
 * calendario del Napoli sarebbe un filtro che promette una squadra e ne
 * accende un'altra.
 *
 * I colori restano invece fissi sul bianconero: il tema della pagina squadra
 * e' fuori scopo qui, ed e' un limite dichiarato nel changelog.
 */
export function sportLabel(sport: CalendarSport, team: SerieATeam): string {
  return sport === "football" ? team.name : ALTRI_SPORT[sport];
}
