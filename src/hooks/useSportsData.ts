import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
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

// === Football/Juventus Hooks (Sky Sport) ===
export function useSerieAStandings(season: number) {
  return useQuery({
    queryKey: queryKeys.juventus.standings(season),
    queryFn: () => footballApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJuventusCalendar(
  season: number,
  page?: number,
  pageSize?: number,
  upcomingOnly = false,
) {
  return useQuery({
    queryKey: queryKeys.juventus.calendar(season, page, pageSize, upcomingOnly),
    queryFn: () => footballApi.getCalendar(season, page, pageSize, upcomingOnly),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useJuventusInfo(season: number) {
  return useQuery({
    queryKey: queryKeys.juventus.info(season),
    queryFn: () => footballApi.getJuventusInfo(season),
    staleTime: 60 * 1000,
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
    // Mantieni i risultati della pagina precedente durante il fetch
    // della nuova: niente flash di skeleton al click su Successiva.
    placeholderData: (prev) => prev,
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
