import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SlamResultProp {
  best: string | null;
  years: number[];
  raw: string;
}

export interface PlayerHeaderProps {
  name: string;
  ranking: number | null;
  rankingDate?: string | null;
  careerHigh?: number | null;
  nationality?: string;
  height?: string;
  weight?: string;
  birthPlace?: string;
  plays?: string;
  coach?: string;
  seasonRecord?: string | null;
  seasonTitles?: number | null;
  prizeMoney?: string;
  photoUrl?: string;
  source?: string;
  statsUpdatedAt?: string | null;
  slamResults?: {
    australianOpen: SlamResultProp | null;
    rolandGarros: SlamResultProp | null;
    wimbledon: SlamResultProp | null;
    usOpen: SlamResultProp | null;
    tourFinals: SlamResultProp | null;
  } | null;
}

function formatRankingDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return iso;
  }
}

const SLAM_LABELS: { key: keyof NonNullable<PlayerHeaderProps["slamResults"]>; short: string; full: string }[] = [
  { key: "australianOpen", short: "AO", full: "Australian Open" },
  { key: "rolandGarros", short: "RG", full: "Roland Garros" },
  { key: "wimbledon", short: "W", full: "Wimbledon" },
  { key: "usOpen", short: "US", full: "US Open" },
  { key: "tourFinals", short: "Finals", full: "ATP Finals" },
];

function shortYears(years: number[]): string {
  if (!years.length) return "";
  return years.map((y) => String(y).slice(2)).join("·");
}

export default function PlayerHeader(props: PlayerHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const rankingLabel = props.ranking != null ? `#${props.ranking}` : "—";
  const rankingDate = formatRankingDate(props.rankingDate);
  const statsUpdated = formatRankingDate(props.statsUpdatedAt);
  const visibleSlams = props.slamResults
    ? SLAM_LABELS.filter(({ key }) => props.slamResults?.[key] && props.slamResults[key]?.best)
    : [];

  return (
    <section
      className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-6"
      aria-label="Profilo giocatore"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Photo top-left */}
        <div className="shrink-0">
          {props.photoUrl && !imgError ? (
            <img
              src={props.photoUrl}
              alt={`${props.name} — foto`}
              loading="eager"
              width={96}
              height={96}
              onError={() => setImgError(true)}
              className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/40 shadow-md"
            />
          ) : (
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-2xl",
                "gold-gradient font-heading text-3xl font-bold text-primary-foreground ring-2 ring-primary/40",
              )}
              aria-hidden
            >
              JS
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">
              {props.name}
            </h2>
            {props.nationality && (
              <span className="text-sm text-muted-foreground">🇮🇹 {props.nationality}</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-heading">
                Ranking ATP Singolare
              </p>
              <p className="font-heading text-4xl sm:text-5xl font-bold text-primary leading-none">
                {rankingLabel}
              </p>
              {rankingDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  aggiornato al {rankingDate}
                </p>
              )}
            </div>

            {props.seasonRecord && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-heading">
                  Stagione 2026
                </p>
                <p className="font-heading text-xl font-bold">{props.seasonRecord}</p>
                {props.seasonTitles != null && (
                  <p className="text-xs text-muted-foreground">
                    {props.seasonTitles} {props.seasonTitles === 1 ? "titolo" : "titoli"}
                  </p>
                )}
              </div>
            )}

            {props.careerHigh != null && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-heading">
                  Best ranking
                </p>
                <p className="font-heading text-xl font-bold">#{props.careerHigh}</p>
              </div>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {props.height && (
              <div className="flex gap-2"><dt className="text-muted-foreground">Altezza</dt><dd className="font-medium">{props.height}</dd></div>
            )}
            {props.weight && (
              <div className="flex gap-2"><dt className="text-muted-foreground">Peso</dt><dd className="font-medium">{props.weight}</dd></div>
            )}
            {props.plays && (
              <div className="flex gap-2"><dt className="text-muted-foreground">Mano</dt><dd className="font-medium">{props.plays}</dd></div>
            )}
            {props.birthPlace && (
              <div className="flex gap-2"><dt className="text-muted-foreground">Nato a</dt><dd className="font-medium">{props.birthPlace}</dd></div>
            )}
            {props.coach && (
              <div className="flex gap-2"><dt className="text-muted-foreground">Coach</dt><dd className="font-medium">{props.coach}</dd></div>
            )}
          </dl>

          {visibleSlams.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-2">
                Grande Slam
              </p>
              <ul className="flex flex-wrap gap-2" aria-label="Risultati Grande Slam">
                {visibleSlams.map(({ key, short, full }) => {
                  const r = props.slamResults![key]!;
                  const isWin = r.best === "V";
                  return (
                    <li
                      key={key}
                      title={`${full}: ${r.raw}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-heading",
                        isWin
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted text-foreground",
                      )}
                    >
                      <span className="font-bold">{short}</span>
                      <span className="opacity-80">{r.best}</span>
                      {r.years.length > 0 && (
                        <span className="opacity-70">·{shortYears(r.years)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(props.source || statsUpdated) && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {props.source ? `Fonte: ${props.source}` : null}
              {props.source && statsUpdated ? " · " : ""}
              {statsUpdated ? `Statistiche aggiornate al ${statsUpdated}` : null}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}