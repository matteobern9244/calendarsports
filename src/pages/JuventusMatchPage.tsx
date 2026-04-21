import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/common/SectionHeader";
import EventCountdown from "@/components/common/EventCountdown";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import TeamLogo from "@/components/common/TeamLogo";
import UnavailableExternalSource from "@/components/common/UnavailableExternalSource";
import { useJuventusCalendar } from "@/hooks/useSportsData";
import { getCurrentJuventusSeason } from "@/lib/currentSeason";
import { formatJuventusDateTime } from "@/lib/dateUtils";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";

const PAGE_SIZE = 12;

type PaginatedCalendar = {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextUpcomingIndex: number;
};

const COMPETITION_COLORS: Record<string, string> = {
  "Serie A":
    "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] border-[hsl(var(--gold))]/40",
  "Champions League":
    "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] dark:text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))]/40",
  "Coppa Italia":
    "bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))] dark:text-[hsl(var(--gold))] border-[hsl(var(--secondary))]/40",
};

function findMatch(calendar: PaginatedCalendar | undefined, matchId: string) {
  if (!calendar) return null;
  return calendar.items.find((m: any) => String(m?.id) === matchId) ?? null;
}

export default function JuventusMatchPage() {
  const { matchId = "" } = useParams<{ matchId: string }>();
  const season = getCurrentJuventusSeason();

  // First page: discover total/totalPages and try to find the match here
  const firstPageQuery = useJuventusCalendar(season, 1, PAGE_SIZE);
  const firstPage = firstPageQuery.data as PaginatedCalendar | undefined;

  // Search across all pages until we find the match
  const [searchPage, setSearchPage] = useState(1);
  const searchQuery = useJuventusCalendar(
    season,
    searchPage === 1 ? undefined : searchPage,
    searchPage === 1 ? undefined : PAGE_SIZE,
  );
  const searchData = (searchPage === 1 ? firstPage : (searchQuery.data as PaginatedCalendar | undefined));

  const [foundMatch, setFoundMatch] = useState<any | null>(null);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setFoundMatch(null);
    setExhausted(false);
    setSearchPage(1);
  }, [matchId, season]);

  useEffect(() => {
    if (foundMatch || !searchData) return;
    const m = findMatch(searchData, matchId);
    if (m) {
      setFoundMatch(m);
      return;
    }
    if (searchPage >= searchData.totalPages) {
      setExhausted(true);
      return;
    }
    setSearchPage((p) => p + 1);
  }, [searchData, matchId, foundMatch, searchPage]);

  const isLoading =
    !foundMatch && !exhausted && (firstPageQuery.isLoading || searchQuery.isLoading);
  const error = firstPageQuery.error ?? searchQuery.error;

  if (isLoading) {
    return (
      <div className="container py-8 sm:py-12">
        <LoadingState message="Caricamento dettaglio partita..." />
      </div>
    );
  }

  if (error && !foundMatch) {
    return (
      <div className="container py-8 sm:py-12">
        <ErrorState
          message="Impossibile caricare il dettaglio della partita."
          onRetry={() => {
            setFoundMatch(null);
            setExhausted(false);
            setSearchPage(1);
            firstPageQuery.refetch();
          }}
        />
        <div className="mt-4 text-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/juventus">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al calendario
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (exhausted && !foundMatch) {
    return (
      <div className="container py-8 sm:py-12">
        <ErrorState message="Partita non trovata nel calendario." />
        <div className="mt-4 text-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/juventus">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al calendario
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!foundMatch) {
    return (
      <div className="container py-8 sm:py-12">
        <LoadingState message="Caricamento dettaglio partita..." />
      </div>
    );
  }

  return <MatchDetail match={foundMatch} />;
}

function MatchDetail({ match }: { match: any }) {
  const isFinished = match.status === "FullTime";
  const isJuveHome = match.homeTeam?.toLowerCase().includes("juventus");
  const opponent = isJuveHome ? match.awayTeam : match.homeTeam;
  const { date: dateStr, time: timeStr, full: fullStr } = formatJuventusDateTime(match.date);
  const compColor = COMPETITION_COLORS[match.competition] || "";

  const juveGoals = isJuveHome ? match.homeScore : match.awayScore;
  const oppGoals = isJuveHome ? match.awayScore : match.homeScore;
  const juveResult = useMemo(() => {
    if (!isFinished) return null;
    if (juveGoals > oppGoals) return "V" as const;
    if (juveGoals < oppGoals) return "S" as const;
    return "P" as const;
  }, [isFinished, juveGoals, oppGoals]);

  const broadcasters: string[] = match.broadcaster
    ? String(match.broadcaster).split(" | ").map((b: string) => b.trim()).filter(Boolean)
    : [];

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/juventus">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al calendario
          </Link>
        </Button>
      </div>

      <SectionHeader title={`${match.homeTeam} – ${match.awayTeam}`} subtitle={fullStr} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "relative mt-6 mb-6 overflow-hidden rounded-2xl border border-[hsl(var(--gold))]/40 px-5 py-5 sm:px-6 sm:py-6",
          "bg-gradient-to-br from-[hsl(var(--gold))]/15 via-card to-[hsl(var(--navy))]/20",
          "shadow-[0_18px_44px_-22px_hsl(var(--gold)/0.55),0_4px_14px_-6px_hsl(var(--navy-dark)/0.45)]",
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))] to-transparent opacity-80"
        />
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" aria-hidden="true" />
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border",
              compColor,
            )}
          >
            {match.competition}
          </Badge>
          {match.matchday != null && (
            <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
              {match.competition === "Serie A" ? `Giornata ${match.matchday}` : `Turno ${match.matchday}`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamLogo src={match.homeLogo} name={match.homeTeam} size={56} shape="circle" />
            <p className="text-sm sm:text-base font-heading font-bold text-foreground line-clamp-2">
              {match.homeTeam}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            {isFinished ? (
              <div className="flex items-baseline gap-2 font-heading font-bold tabular-nums">
                <span className="text-3xl sm:text-5xl">{match.homeScore}</span>
                <span className="text-xl text-muted-foreground">–</span>
                <span className="text-3xl sm:text-5xl">{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-2xl sm:text-3xl font-heading font-bold text-muted-foreground">
                vs
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {dateStr}{timeStr ? ` · ${timeStr}` : ""}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <TeamLogo src={match.awayLogo} name={match.awayTeam} size={56} shape="circle" />
            <p className="text-sm sm:text-base font-heading font-bold text-foreground line-clamp-2">
              {match.awayTeam}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {broadcasters.map((b) => {
            const { className } = getBroadcasterStyle(b);
            return (
              <span
                key={b}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  className,
                )}
              >
                {b}
              </span>
            );
          })}
          {!isFinished && match.date && <EventCountdown startDate={match.date} />}
        </div>
      </motion.div>

      <Tabs defaultValue="anteprima" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="anteprima" className="font-heading text-xs tracking-wider uppercase">
            Anteprima
          </TabsTrigger>
          <TabsTrigger value="formazione" className="font-heading text-xs tracking-wider uppercase">
            Formazione
          </TabsTrigger>
          <TabsTrigger value="modulo" className="font-heading text-xs tracking-wider uppercase">
            Modulo
          </TabsTrigger>
          <TabsTrigger value="risultato" className="font-heading text-xs tracking-wider uppercase">
            Risultato
          </TabsTrigger>
          <TabsTrigger value="cronologia" className="font-heading text-xs tracking-wider uppercase">
            Cronologia eventi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anteprima">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Competizione" value={match.competition} />
            {match.matchday != null && (
              <InfoRow
                label={match.competition === "Serie A" ? "Giornata" : "Turno"}
                value={String(match.matchday)}
              />
            )}
            <InfoRow label="Data" value={dateStr} />
            <InfoRow label="Ora (Italia)" value={timeStr || "—"} />
            <InfoRow
              label="Squadra di casa"
              value={match.homeTeam}
              highlighted={isJuveHome}
            />
            <InfoRow
              label="Squadra ospite"
              value={match.awayTeam}
              highlighted={!isJuveHome}
            />
            <InfoRow
              label="Diretta TV"
              value={broadcasters.length > 0 ? broadcasters.join(" · ") : "—"}
            />
            <InfoRow
              label="Stato"
              value={
                isFinished
                  ? "Terminata"
                  : match.status === "Live" || match.status === "InProgress"
                    ? "In corso"
                    : "In programma"
              }
            />
          </div>
          {match.link && (
            <div className="mt-6">
              <Button asChild variant="outline" size="sm">
                <a href={match.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Approfondisci su Sky Sport
                </a>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="formazione">
          <UnavailableExternalSource
            title="Formazione non disponibile"
            description="Sky Sport e Lega Serie A non espongono le formazioni via API pubblica gratuita."
            externalLink={match.link}
          />
        </TabsContent>

        <TabsContent value="modulo">
          <UnavailableExternalSource
            title="Modulo non disponibile"
            description="Lo schieramento tattico non è esposto dalle fonti pubbliche gratuite (Sky, Lega Serie A)."
            externalLink={match.link}
          />
        </TabsContent>

        <TabsContent value="risultato">
          {isFinished ? (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4">
                <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                  Risultato finale
                </span>
                <div className="flex items-baseline gap-3 font-heading font-bold tabular-nums">
                  <span className="text-5xl sm:text-7xl">{match.homeScore}</span>
                  <span className="text-2xl text-muted-foreground">–</span>
                  <span className="text-5xl sm:text-7xl">{match.awayScore}</span>
                </div>
                {juveResult && (
                  <span
                    className={cn(
                      "text-sm font-heading font-bold uppercase tracking-widest",
                      juveResult === "V" && "text-green-500",
                      juveResult === "S" && "text-red-500",
                      juveResult === "P" && "text-yellow-500",
                    )}
                  >
                    {juveResult === "V" && "Vittoria Juventus"}
                    {juveResult === "S" && "Sconfitta Juventus"}
                    {juveResult === "P" && "Pareggio"}
                  </span>
                )}
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  Marcatori non disponibili dalla fonte attuale.
                  {match.link ? " Apri su Sky Sport per il dettaglio della partita." : ""}
                </p>
                {match.link && (
                  <Button asChild variant="outline" size="sm">
                    <a href={match.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Vedi marcatori su Sky Sport
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState message="Risultato non ancora disponibile: la partita non è stata giocata." />
              {match.date && (
                <div className="flex justify-center">
                  <EventCountdown startDate={match.date} />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cronologia">
          <UnavailableExternalSource
            title="Cronologia eventi non disponibile"
            description="Gol, ammonizioni e sostituzioni non sono esposti dalle fonti pubbliche gratuite (Sky, Lega Serie A)."
            externalLink={match.link}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-4 py-3",
        highlighted && "border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/5",
      )}
    >
      <p className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-foreground",
          highlighted && "text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
