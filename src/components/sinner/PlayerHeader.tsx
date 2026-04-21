import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ruler, Weight, Hand, MapPin, UserRound, Trophy } from "lucide-react";

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

const RESULT_LABELS: Record<string, string> = {
  V: "Vittoria",
  F: "Finale",
  SF: "Semifinale",
  QF: "Quarti",
  "4T": "Ottavi",
  "3T": "3° turno",
  "2T": "2° turno",
  "1T": "1° turno",
  RR: "Round Robin",
};

function resultLabel(raw: string): string {
  return RESULT_LABELS[raw] ?? raw;
}

export default function PlayerHeader(props: PlayerHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const rankingLabel = props.ranking != null ? `#${props.ranking}` : "—";
  const rankingDate = formatRankingDate(props.rankingDate);
  const visibleSlams = props.slamResults
    ? SLAM_LABELS.filter(({ key }) => props.slamResults?.[key] && props.slamResults[key]?.best)
    : [];

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-border border-t-2 border-t-primary/60 bg-gradient-to-br from-card via-card to-secondary/10 p-5 shadow-sm sm:p-7"
      aria-label="Profilo giocatore"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Photo top-left with gold glow */}
        <div className="relative shrink-0 self-center sm:self-start">
          <div
            aria-hidden
            className="absolute -inset-1 rounded-2xl gold-gradient opacity-30 blur-md"
          />
          {props.photoUrl && !imgError ? (
            <img
              src={props.photoUrl}
              alt={`${props.name} — foto`}
              loading="eager"
              width={128}
              height={160}
              onError={() => setImgError(true)}
              className="relative h-36 w-28 rounded-2xl object-cover object-top ring-2 ring-primary/60 ring-offset-2 ring-offset-card shadow-lg sm:h-40 sm:w-32"
            />
          ) : (
            <div
              className={cn(
                "relative flex h-36 w-28 items-center justify-center rounded-2xl sm:h-40 sm:w-32",
                "gold-gradient font-heading text-4xl font-bold text-primary-foreground ring-2 ring-primary/60 ring-offset-2 ring-offset-card shadow-lg",
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

          {/* KPI cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <p className="font-heading text-[10px] uppercase tracking-widest text-primary/80">
                Ranking ATP
              </p>
              <p className="font-heading text-4xl sm:text-5xl font-bold leading-none text-gold-gradient">
                {rankingLabel}
              </p>
              {rankingDate && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  agg. {rankingDate}
                </p>
              )}
            </div>

            {props.seasonRecord && (
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="font-heading text-[10px] uppercase tracking-widest text-primary/80">
                  Stagione 2026
                </p>
                <p className="font-heading text-3xl font-bold leading-none text-foreground">
                  {props.seasonRecord}
                </p>
                {props.seasonTitles != null && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {props.seasonTitles} {props.seasonTitles === 1 ? "titolo" : "titoli"}
                  </p>
                )}
              </div>
            )}

            {props.careerHigh != null && (
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="font-heading text-[10px] uppercase tracking-widest text-primary/80">
                  Miglior ranking
                </p>
                <p className="font-heading text-3xl font-bold leading-none text-foreground">
                  #{props.careerHigh}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">in carriera</p>
              </div>
            )}
          </div>

          {/* Bio chips */}
          {(props.height || props.weight || props.plays || props.birthPlace || props.coach) && (
            <ul
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Informazioni personali"
            >
              {props.height && (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1.5 text-xs">
                  <Ruler className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-muted-foreground">Altezza</span>
                  <span className="font-semibold text-foreground">{props.height}</span>
                </li>
              )}
              {props.weight && (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1.5 text-xs">
                  <Weight className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-muted-foreground">Peso</span>
                  <span className="font-semibold text-foreground">{props.weight}</span>
                </li>
              )}
              {props.plays && (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1.5 text-xs">
                  <Hand className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-muted-foreground">Mano</span>
                  <span className="font-semibold text-foreground">{props.plays}</span>
                </li>
              )}
              {props.birthPlace && (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1.5 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-muted-foreground">Nato a</span>
                  <span className="font-semibold text-foreground">{props.birthPlace}</span>
                </li>
              )}
              {props.coach && (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-3 py-1.5 text-xs">
                  <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span className="text-muted-foreground">Coach</span>
                  <span className="font-semibold text-foreground">{props.coach}</span>
                </li>
              )}
            </ul>
          )}

          {visibleSlams.length > 0 && (
            <div className="mt-5 border-t border-border/50 pt-4">
              <p className="mb-2.5 font-heading text-[10px] uppercase tracking-widest text-primary/80">
                Grande Slam{" "}
                <span className="text-muted-foreground/70 normal-case tracking-normal">
                  · Miglior risultato
                </span>
              </p>
              <ul
                className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
                aria-label="Risultati Grande Slam"
              >
                {visibleSlams.map(({ key, short, full }) => {
                  const r = props.slamResults![key]!;
                  const isWin = r.best === "V";
                  const label = resultLabel(r.best ?? "");
                  const yearsText = r.years.length > 0 ? r.years.join(" · ") : "";
                  return (
                    <li
                      key={key}
                      title={
                        r.years.length > 0
                          ? `${full}: ${label} (${r.years.join(", ")})`
                          : `${full}: ${label}`
                      }
                      aria-label={`${full}: ${label}${
                        r.years.length ? `, anni ${r.years.join(", ")}` : ""
                      }`}
                      className={cn(
                        "flex min-w-[7.5rem] flex-col gap-0.5 rounded-lg px-3 py-2.5 shadow-sm",
                        isWin
                          ? "gold-gradient text-primary-foreground border border-primary/40"
                          : "border border-border bg-secondary/30 text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-heading text-sm font-bold leading-none">
                        {isWin && <Trophy className="h-3.5 w-3.5" aria-hidden />}
                        {short}
                      </span>
                      <span className="font-heading text-sm font-semibold leading-tight">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "text-xs leading-tight",
                          isWin ? "opacity-90" : "text-muted-foreground",
                        )}
                      >
                        {full}
                      </span>
                      {yearsText && (
                        <span
                          className={cn(
                            "mt-0.5 text-[11px] leading-tight",
                            isWin ? "opacity-80" : "text-muted-foreground/80",
                          )}
                        >
                          {yearsText}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}