import { useQuery } from "@tanstack/react-query";
import {
  streamingApi,
  type StreamingFamilyId,
  type StreamingProviderId,
} from "@/lib/api/sportsApi";

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

export interface AvailableProvider {
  id: number;
  key: StreamingProviderId | string | null;
  name: string;
  logo: string | null;
  type: "flatrate" | "free" | "ads";
}

export interface ReleaseItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  releaseDate: string;
  poster: string | null;
  overview: string;
  voteAverage: number | null;
  deepLink: string | null;
  /** Anno YYYY estratto dalla release date, null se mancante. */
  year?: number | null;
  /** Generi TMDB localizzati in italiano (label testuali). */
  genres?: string[];
  /** Provider IT disponibili (flatrate/free/ads), max ~5. */
  availableProviders?: AvailableProvider[];
  /** Link JustWatch generale del titolo (results.IT.link da TMDB). */
  justWatchLink?: string | null;
  /** Popolarità TMDB grezza (per ordinamento client lato vista). */
  popularity?: number;
}

export interface ReleasesPayload {
  provider: StreamingProviderId;
  providerLabel: string;
  providerHomepage?: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  widenedWindow?: boolean;
  items: ReleaseItem[];
  configured: boolean;
}

export interface ReleasesItalyPayload {
  region: "IT";
  dateFrom: string;
  dateTo: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  widenedWindow?: boolean;
  provider: StreamingProviderId | null;
  kind: "movie" | "tv" | "all";
  sort: "release" | "popularity";
  genreId: number | null;
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

export interface ReleaseDetailsPayload {
  type: "movie" | "tv";
  id: string;
  title: string;
  originalTitle: string | null;
  releaseDate: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  voteAverage: number | null;
  voteCount: number;
  runtime: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: string[];
  directors: string[];
  creators: string[];
  cast: CastMember[];
  trailerYouTubeKey: string | null;
  availableProviders: AvailableProvider[];
  justWatchLink: string | null;
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
    queryKey: [
      "streaming-releases-italy",
      opts.provider ?? "all",
      opts.kind ?? "all",
      opts.dateFrom ?? "",
      opts.dateTo ?? "",
      opts.sort ?? "release",
      opts.genreId ?? 0,
    ],
    queryFn: () => streamingApi.getReleasesItaly(opts),
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

export function useReleaseDetails(
  type: "movie" | "tv" | null,
  id: number | null,
) {
  return useQuery<ReleaseDetailsPayload>({
    queryKey: ["streaming-release-details", type, id],
    queryFn: () => streamingApi.getReleaseDetails(type as "movie" | "tv", id as number),
    enabled: !!type && !!id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
