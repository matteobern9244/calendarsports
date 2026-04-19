import { useQuery } from "@tanstack/react-query";
import {
  streamingApi,
  type StreamingFamilyId,
  type StreamingProviderId,
} from "@/lib/api/sportsApi";

export const STREAMING_FAMILIES: { id: StreamingFamilyId; label: string }[] = [
  { id: "sky-sport", label: "Sky Sport" },
  { id: "sky-cinema", label: "Sky Cinema" },
  { id: "rai", label: "RAI" },
  { id: "mediaset", label: "Mediaset" },
  { id: "discovery", label: "Discovery" },
];

export const STREAMING_PROVIDERS: { id: StreamingProviderId; label: string }[] = [
  { id: "netflix", label: "Netflix" },
  { id: "prime", label: "Prime Video" },
  { id: "disney", label: "Disney+" },
  { id: "hbo", label: "HBO Max" },
];

export interface TvProgram {
  start: string;
  end: string;
  title: string;
  genre?: string;
  description?: string;
}

export interface TvChannel {
  id: string;
  name: string;
  logo: string | null;
  number?: number;
  programs: TvProgram[];
}

export interface TvFamilyPayload {
  family: StreamingFamilyId;
  familyLabel: string;
  date: string;
  channels: TvChannel[];
  programsAvailable: boolean;
}

export interface ReleaseItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  releaseDate: string;
  poster: string | null;
  overview: string;
  voteAverage: number | null;
}

export interface ReleasesPayload {
  provider: StreamingProviderId;
  providerLabel: string;
  providerHomepage?: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  items: ReleaseItem[];
  configured: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile: string | null;
}

export interface CreditsPayload {
  type: "movie" | "tv";
  id: string;
  cast: CastMember[];
  configured: boolean;
}

export function useTvByFamily(family: StreamingFamilyId) {
  return useQuery<TvFamilyPayload>({
    queryKey: ["streaming-tv", family],
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
    queryKey: ["streaming-releases", provider, dateFrom ?? "", dateTo ?? ""],
    queryFn: () => streamingApi.getReleasesByProvider(provider, dateFrom, dateTo),
    staleTime: 60 * 60 * 1000,
  });
}

export function useReleaseCredits(
  type: "movie" | "tv" | null,
  id: number | null,
) {
  return useQuery<CreditsPayload>({
    queryKey: ["streaming-credits", type, id],
    queryFn: () => streamingApi.getReleaseCredits(type as "movie" | "tv", id as number),
    enabled: !!type && !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
