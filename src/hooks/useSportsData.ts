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

// === Football/Juventus Hooks (Sky Sport) ===
export function useSerieAStandings(season: number) {
  return useQuery({
    queryKey: ["juventus", "standings", season],
    queryFn: () => footballApi.getStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJuventusCalendar(season: number, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: ["juventus", "calendar", season, page ?? null, pageSize ?? null],
    queryFn: () => footballApi.getCalendar(season, page, pageSize),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useJuventusInfo(season: number) {
  return useQuery({
    queryKey: ["juventus", "info", season],
    queryFn: () => footballApi.getJuventusInfo(season),
    staleTime: 60 * 1000,
  });
}

// === Tennis/Sinner Hooks ===
export function useSinnerInfo() {
  return useQuery({
    queryKey: ["sinner", "info"],
    queryFn: () => tennisApi.getPlayerInfo(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSinnerNextEvent() {
  return useQuery({
    queryKey: ["sinner", "next-event"],
    queryFn: () => tennisApi.getNextEvent(),
    staleTime: 60 * 1000,
  });
}

export function useSinnerSchedule(season: number) {
  return useQuery({
    queryKey: ["sinner", "schedule", season],
    queryFn: () => tennisApi.getSchedule(season),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSinnerResults(season: number) {
  return useQuery({
    queryKey: ["sinner", "results", season],
    queryFn: () => tennisApi.getResults(season),
    staleTime: 5 * 60 * 1000,
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

export function useMotoGPConstructorStandings(season: number) {
  return useQuery({
    queryKey: ["motogp", "constructor-standings", season],
    queryFn: () => motogpApi.getConstructorStandings(season),
    staleTime: 5 * 60 * 1000,
  });
}
