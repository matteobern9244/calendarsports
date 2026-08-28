import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  streamingApi,
  type StreamingFamilyId,
  type StreamingProviderId,
} from "@/lib/api/sportsApi";
import type {
  AvailableProvider,
  CastMember,
  CreditsPayload,
  ReleaseDetailsPayload,
  ReleaseItem,
  ReleasesItalyPayload,
  ReleasesPayload,
  TvChannel,
  TvFamilyPayload,
  TvProgram,
} from "@/lib/api/schemas";

// I tipi dei payload vivono con gli altri schemi del confine API; qui
// restano riesportati perche' mezzo src li importa da questo modulo.
export type {
  AvailableProvider,
  CastMember,
  CreditsPayload,
  ReleaseDetailsPayload,
  ReleaseItem,
  ReleasesItalyPayload,
  ReleasesPayload,
  TvChannel,
  TvFamilyPayload,
  TvProgram,
};

export const STREAMING_FAMILIES: { id: StreamingFamilyId; label: string }[] = [
  { id: "rai", label: "RAI" },
  { id: "mediaset", label: "Mediaset" },
  { id: "sky-sport", label: "Sky Sport" },
  { id: "sky-cinema", label: "Sky Cinema" },
  { id: "discovery", label: "Discovery" },
];

export const STREAMING_PROVIDERS: { id: StreamingProviderId; label: string }[] = [
  { id: "netflix", label: "Netflix" },
  { id: "prime", label: "Prime Video" },
  { id: "disney", label: "Disney+" },
  { id: "hbo", label: "HBO Max" },
];

export function useTvByFamily(family: StreamingFamilyId) {
  return useQuery<TvFamilyPayload>({
    queryKey: queryKeys.streaming.tv(family),
    queryFn: () => streamingApi.getTvByFamily(family),
    staleTime: 15 * 60 * 1000,
  });
}

export function useReleasesByProvider(
  provider: StreamingProviderId,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery<ReleasesPayload>({
    queryKey: queryKeys.streaming.releases(provider, dateFrom, dateTo),
    queryFn: () => streamingApi.getReleasesByProvider(provider, dateFrom, dateTo),
    staleTime: 60 * 60 * 1000,
  });
}

export interface UseReleasesItalyOpts {
  provider?: StreamingProviderId | "all";
  kind?: "movie" | "tv" | "all";
  dateFrom?: string;
  dateTo?: string;
  sort?: "release" | "popularity";
  genreId?: number;
}

export function useReleasesItaly(opts: UseReleasesItalyOpts) {
  return useQuery<ReleasesItalyPayload>({
    queryKey: queryKeys.streaming.releasesItaly(
      opts.provider,
      opts.kind,
      opts.dateFrom,
      opts.dateTo,
      opts.sort,
      opts.genreId,
    ),
    queryFn: () => streamingApi.getReleasesItaly(opts),
    staleTime: 60 * 60 * 1000,
  });
}

export function useReleaseCredits(type: "movie" | "tv" | null, id: number | null) {
  return useQuery<CreditsPayload>({
    queryKey: queryKeys.streaming.credits(type, id),
    queryFn: () => streamingApi.getReleaseCredits(type as "movie" | "tv", id as number),
    enabled: !!type && !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useReleaseDetails(type: "movie" | "tv" | null, id: number | null) {
  return useQuery<ReleaseDetailsPayload>({
    queryKey: queryKeys.streaming.details(type, id),
    queryFn: () => streamingApi.getReleaseDetails(type as "movie" | "tv", id as number),
    enabled: !!type && !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
