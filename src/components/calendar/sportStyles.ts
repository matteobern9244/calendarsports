import type { CalendarSport } from "@/hooks/useCalendarEvents";
import type { SerieATeam } from "@/lib/serieATeams";

/**
 * Colori ed etichette per sport della pagina calendario. Stanno qui e non
 * dentro una delle viste perche' le tre viste e la pagina — legenda e dialog —
 * usano gli stessi: tenerli in una sola vista significherebbe che le altre
 * importano da un fratello.
 */
/**
 * Il colore di ciascuna fonte nel calendario aggregato.
 *
 * **Il calcio segue la squadra, gli altri due no.** F1 e MotoGP hanno un
 * colore fisso; il calcio legge `--team-accent`, che `TeamPalette` scrive su
 * `<html>` a partire dalla squadra preferita. Cosi' il pallino del Napoli e'
 * azzurro e quello del Sassuolo verde, e il calendario aggregato parla della
 * stessa squadra di cui parla la sua etichetta.
 *
 * **Il limite di questa scelta, dichiarato**: qui il calcio sta accanto a F1 e
 * MotoGP, e tre colori scelti per distinguersi fra loro reggono meglio di tre
 * scelti altrove. Alcune squadre finiscono vicine a una delle altre due fonti
 * — il rosso di Genoa, Milan e Monza sta al rosso della F1, il viola della
 * Fiorentina al viola della MotoGP. Resta leggibile perche' accanto al pallino
 * c'e' sempre l'etichetta, che per il calcio e' il **nome della squadra**: e'
 * il testo a distinguere, non il solo colore — che e' anche la regola di
 * accessibilita' giusta, visto che un daltonico dal colore non distinguerebbe
 * comunque.
 *
 * Il testo della pastiglia usa `--team-accent-text` e non `--team-accent`:
 * e' la variante passata dalla misura di contrasto in `teamTheme.ts`, perche'
 * li' un contrasto basso non e' un difetto estetico ma di leggibilita'.
 */
export const SPORT_DOT: Record<CalendarSport, string> = {
  football: "bg-[hsl(var(--team-accent))]",
  f1: "bg-[hsl(var(--sport-f1))]",
  motogp: "bg-[hsl(var(--sport-motogp))]",
};

export const SPORT_BADGE: Record<CalendarSport, string> = {
  football:
    "border-[hsl(var(--team-accent))]/40 text-[hsl(var(--team-accent-text))] bg-[hsl(var(--team-accent))]/10",
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
 * Da questa versione anche il **colore** del calcio segue la squadra: vedi
 * `SPORT_DOT` qui sopra. Il limite dichiarato nel changelog della 3.0.0 e'
 * chiuso.
 */
export function sportLabel(sport: CalendarSport, team: SerieATeam): string {
  return sport === "football" ? team.name : ALTRI_SPORT[sport];
}
