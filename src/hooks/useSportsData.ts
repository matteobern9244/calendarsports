import { useQuery } from "@tanstack/react-query";
import { f1Api, footballApi, tennisApi, motogpApi } from "@/lib/api/sportsApi";

// === F1 Hooks ===
export function useF1Calendar(season: number) {
  return useQuery({
    queryKey: ["f1", "calendar", season],
    queryFn: () => f1Api.getCalendar(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1DriverStandings(season: number) {
  return useQuery({
    queryKey: ["f1", "driver-standings", season],
    queryFn: () => f1Api.getDriverStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1ConstructorStandings(season: number) {
  return useQuery({
    queryKey: ["f1", "constructor-standings", season],
    queryFn: () => f1Api.getConstructorStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useF1NextRace() {
  return useQuery({
    queryKey: ["f1", "next-race"],
    queryFn: () => f1Api.getNextRace(),
    staleTime: 60 * 1000,
  });
}

// === Football Hooks ===
export function useJuventusNextMatch() {
  return useQuery({
    queryKey: ["juventus", "next-match"],
    queryFn: () => footballApi.getNextMatch(),
    staleTime: 60 * 1000,
  });
}

export function useJuventusLastMatches() {
  return useQuery({
    queryKey: ["juventus", "last-matches"],
    queryFn: () => footballApi.getLastMatches(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSerieAStandings(season: number) {
  return useQuery({
    queryKey: ["juventus", "standings", season],
    queryFn: () => footballApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJuventusSeasonMatches(season: number) {
  return useQuery({
    queryKey: ["juventus", "season-matches", season],
    queryFn: () => footballApi.getSeasonMatches(season),
    staleTime: 5 * 60 * 1000,
  });
}

// === Tennis Hooks ===
export function useSinnerInfo() {
  return useQuery({
    queryKey: ["sinner", "info"],
    queryFn: () => tennisApi.getPlayerInfo(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useSinnerLastEvents(season: number) {
  return useQuery({
    queryKey: ["sinner", "last-events", season],
    queryFn: () => tennisApi.getLastEvents(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSinnerNextEvents() {
  return useQuery({
    queryKey: ["sinner", "next-events"],
    queryFn: () => tennisApi.getNextEvents(),
    staleTime: 60 * 1000,
  });
}

// === MotoGP Hooks ===
export function useMotoGPCalendar(season: number) {
  return useQuery({
    queryKey: ["motogp", "calendar", season],
    queryFn: () => motogpApi.getCalendar(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMotoGPNextEvent() {
  return useQuery({
    queryKey: ["motogp", "next-event"],
    queryFn: () => motogpApi.getNextEvent(),
    staleTime: 60 * 1000,
  });
}

export function useMotoGPStandings(season: number) {
  return useQuery({
    queryKey: ["motogp", "standings", season],
    queryFn: () => motogpApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}
