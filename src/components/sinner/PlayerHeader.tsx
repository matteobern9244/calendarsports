import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PlayerHeaderProps {
  name: string;
  ranking: number | null;
  rankingDate?: string | null;
  careerHigh?: number | null;
  nationality?: string;
  height?: string;
  birthPlace?: string;
  plays?: string;
  coach?: string;
  seasonRecord?: string | null;
  seasonTitles?: number | null;
  prizeMoney?: string;
  photoUrl?: string;
  source?: string;
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

export default function PlayerHeader(props: PlayerHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const rankingLabel = props.ranking != null ? `#${props.ranking}` : "—";
  const rankingDate = formatRankingDate(props.rankingDate);

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

          {props.source && (
            <p className="mt-3 text-[11px] text-muted-foreground">Fonte dati: {props.source}</p>
          )}
        </div>
      </div>
    </section>
  );
}