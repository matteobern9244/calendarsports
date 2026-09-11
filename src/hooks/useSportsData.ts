import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { keepPreviousPageOf } from "@/lib/queryPlaceholder";
import {
  f1Api,
  footballApi,
  tennisApi,
  motogpApi,
  highlightsApi,
  type HighlightSport,
} from "@/lib/api/sportsApi";

// === F1 Hooks ===
export function useF1Calendar(season: number) {
  return useQuery({
    queryKey: queryKeys.f1.calendar(season),
    queryFn: () => f1Api.getCalendar(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1DriverStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.f1.driverStandings(season),
    queryFn: () => f1Api.getDriverStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1ConstructorStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.f1.constructorStandings(season),
    queryFn: () => f1Api.getConstructorStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1NextRace() {
  return useQuery({
    queryKey: queryKeys.f1.nextRace(),
    queryFn: () => f1Api.getNextRace(),
    staleTime: 60 * 1000,
  });
}

// === Football Hooks (Sky Sport) ===
export function useSerieAStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.football.standings(season),
    queryFn: () => footballApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFootballCalendar(
  teamSlug: string,
  season: number,
  page?: number,
  pageSize?: number,
  upcomingOnly = false,
) {
  return useQuery({
    queryKey: queryKeys.football.calendar(teamSlug, season, page, pageSize, upcomingOnly),
    queryFn: () => footballApi.getCalendar(teamSlug, season, page, pageSize, upcomingOnly),
    staleTime: 5 * 60 * 1000,
    // Niente flash di skeleton al click su Successiva, ma il placeholder si
    // ferma al confine della lista: cambiare squadra, stagione o filtro
    // mostra il caricamento, non le partite di prima.
    placeholderData: keepPreviousPageOf(
      queryKeys.football.calendarList(teamSlug, season, upcomingOnly),
    ),
  });
}

export function useFootballInfo(teamSlug: string, season: number) {
  return useQuery({
    queryKey: queryKeys.football.info(teamSlug, season),
    queryFn: () => footballApi.getTeamInfo(teamSlug, season),
    staleTime: 60 * 1000,
  });
}

/**
 * Rosa, allenatore e stadio della squadra.
 *
 * `staleTime` lungo di proposito: una rosa cambia due volte l'anno, alle
 * finestre di mercato. Ricaricarla ogni minuto come la classifica sarebbe
 * traffico verso Sky senza nessuna informazione in cambio.
 */
export function useTeamSquad(teamSlug: string, season: number) {
  return useQuery({
    queryKey: queryKeys.football.squad(teamSlug, season),
    queryFn: () => footballApi.getSquad(teamSlug, season),
    staleTime: 60 * 60 * 1000,
  });
}

// === Tennis/Sinner Hooks ===
export function useSinnerInfo() {
  return useQuery({
    queryKey: queryKeys.sinner.info(),
    queryFn: () => tennisApi.getPlayerInfo(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSinnerNextEvent() {
  return useQuery({
    queryKey: queryKeys.sinner.nextEvent(),
    queryFn: () => tennisApi.getNextEvent(),
    staleTime: 60 * 1000,
  });
}

export function useSinnerSchedule(season: number) {
  return useQuery({
    queryKey: queryKeys.sinner.schedule(season),
    queryFn: () => tennisApi.getSchedule(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSinnerResults(season: number, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: queryKeys.sinner.results(season, page, pageSize),
    queryFn: () => tennisApi.getResults(season, page, pageSize),
    staleTime: 5 * 60 * 1000,
    // Mantieni i risultati della pagina precedente durante il fetch della
    // nuova: niente flash di skeleton al click su Successiva. Al rollover di
    // stagione la lista cambia, e li' il placeholder si ferma.
    placeholderData: keepPreviousPageOf(queryKeys.sinner.resultsList(season)),
  });
}

// === MotoGP Hooks ===
export function useMotoGPCalendar(season: number) {
  return useQuery({
    queryKey: queryKeys.motogp.calendar(season),
    queryFn: () => motogpApi.getCalendar(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMotoGPNextEvent() {
  return useQuery({
    queryKey: queryKeys.motogp.nextEvent(),
    queryFn: () => motogpApi.getNextEvent(),
    staleTime: 60 * 1000,
  });
}

export function useMotoGPStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.motogp.standings(season),
    queryFn: () => motogpApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMotoGPConstructorStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.motogp.constructorStandings(season),
    queryFn: () => motogpApi.getConstructorStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

// === Highlights Hook (YouTube RSS) ===
export function useHighlights(sport: HighlightSport, limit = 12) {
  return useQuery({
    queryKey: queryKeys.highlights(sport, limit),
    queryFn: () => highlightsApi.list(sport, limit),
    staleTime: 10 * 60 * 1000,
  });
}
