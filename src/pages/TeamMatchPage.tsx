import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import MatchDetailSection from "@/components/team/MatchDetailSection";
import MatchHero from "@/components/team/MatchHero";
import { useFootballCalendar } from "@/hooks/useSportsData";
import { type SerieATeam } from "@/lib/serieATeams";
import { getCurrentFootballSeason } from "@/lib/currentSeason";
import { matchesOf, type FootballCalendar, type FootballMatch } from "@/lib/api/schemas";
import { matchSide } from "@/lib/teamMatch";
import { matchPhase, type FasePartita } from "@/lib/matchPhase";
import { useNowMinute } from "@/hooks/useNow";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { skyTeamPageUrl, teamPath } from "@/lib/teamRoutes";

/**
 * `matchesOf` accetta entrambe le forme che l'edge function puo'
 * restituire (array nudo, o inviluppo `{ items }` quando la richiesta
 * porta `page`/`pageSize`) e vive con gli schemi del confine API, dove la
 * doppia forma e' descritta una volta sola.
 */
function findMatch(calendar: FootballCalendar | undefined, matchId: string) {
  return (
    matchesOf(calendar).find((m) => {
      const id = String(m.id);
      if (id === "" || id === "undefined" || id === "null") return false;
      return id === matchId;
    }) ?? null
  );
}

interface TeamMatchPageProps {
  /**
   * La squadra **del calendario da cui si e' arrivati**, gia' risolta da
   * `TeamRoute`. E' anche quella a cui riporta il «Torna al calendario»: la
   * stessa Juventus-Napoli si apre da due indirizzi, e ognuno torna al suo.
   */
  team: SerieATeam;
}

export default function TeamMatchPage({ team }: TeamMatchPageProps) {
  const { matchId = "" } = useParams<{ matchId: string }>();
  const decodedMatchId = useMemo(() => {
    try {
      return decodeURIComponent(matchId);
    } catch {
      return matchId;
    }
  }, [matchId]);
  const season = getCurrentFootballSeason();

  // Senza parametri di pagina l'edge function restituisce il calendario
  // completo della stagione: una manciata di decine di partite. Cercare la
  // partita in memoria costa una query sola, mentre camminare le pagine una
  // alla volta costava fino a `totalPages` round-trip in sequenza, ognuno in
  // attesa del precedente. E' anche la stessa chiave di cache che usa la Home,
  // quindi arrivando da li' il dato e' gia' pronto.
  const calendarQuery = useFootballCalendar(team.slug, season);

  const foundMatch = useMemo(
    () => findMatch(calendarQuery.data, decodedMatchId),
    [calendarQuery.data, decodedMatchId],
  );

  const isLoading = calendarQuery.isLoading;
  const error = calendarQuery.error;

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
          message="Dettaglio partita non disponibile"
          detail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri direttamente la pagina ufficiale su Sky Sport."
          onRetry={() => calendarQuery.refetch()}
          externalLink={skyTeamPageUrl(team)}
          externalLabel={`Vedi ${team.name} su Sky Sport`}
          ctaHint="Tocca qui per le info ufficiali della partita"
        />
        <div className="mt-4 text-center">
          <Button asChild variant="outline" size="sm">
            <Link to={teamPath(team)}>
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
        <ErrorState
          message="Partita non trovata nel calendario"
          detail={`Questa partita non risulta più nel calendario aggiornato. Puoi tornare alla pagina ${team.name} oppure consultare il calendario completo su Sky Sport.`}
          externalLink={skyTeamPageUrl(team)}
          externalLabel={`Vedi ${team.name} su Sky Sport`}
          ctaHint="Tocca qui per cercare la partita su Sky Sport"
        />
        <div className="mt-4 text-center">
          <Button asChild variant="outline" size="sm">
            <Link to={teamPath(team)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al calendario
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <MatchDetail team={team} match={foundMatch} onRetry={() => calendarQuery.refetch()} />;
}

/** La fase come la legge chi apre la scheda «Anteprima». */
const STATO_A_PAROLE: Record<FasePartita, string> = {
  prepartita: "In programma",
  "in-corso": "In corso",
  finita: "Terminata",
};

function MatchDetail({
  team,
  match,
  onRetry,
}: {
  team: SerieATeam;
  match: FootballMatch;
  onRetry: () => void;
}) {
  const now = useNowMinute();
  const { fase } = matchPhase(match, now);
  // Casa/trasferta e risultato arrivano da `teamMatch`, non da un confronto
  // scritto qui: erano una seconda implementazione delle stesse due deduzioni,
  // per di piu' con `includes("juventus")`, che in Coppa Italia avrebbe preso
  // la Juve Stabia per la Juventus.
  const { isHome } = matchSide(match, team);
  const { date: dateStr, time: timeStr, full: fullStr } = formatFootballDateTime(match.date);

  const broadcasters: string[] = match.broadcaster
    ? String(match.broadcaster)
        .split(" | ")
        .map((b: string) => b.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={teamPath(team)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al calendario
          </Link>
        </Button>
      </div>

      <SectionHeader title={`${match.homeTeam} – ${match.awayTeam}`} subtitle={fullStr} />

      <MatchHero team={team} match={match} onRetry={onRetry} />

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
            <InfoRow label="Squadra di casa" value={match.homeTeam} highlighted={isHome} />
            <InfoRow label="Squadra ospite" value={match.awayTeam} highlighted={!isHome} />
            <InfoRow
              label="Diretta TV"
              value={broadcasters.length > 0 ? broadcasters.join(" · ") : "—"}
            />
            {/*
              Cercava `status === "Live" || "InProgress"`, due valori che la
              fonte non ha mai prodotto — Sky scrive `PreMatch`, `SecondHalf`,
              `FullTime` — quindi a partita in corso questa riga diceva «In
              programma». Codice morto che affermava una cosa falsa proprio
              quando era importante.
            */}
            <InfoRow label="Stato" value={STATO_A_PAROLE[fase]} />
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
          <MatchDetailSection match={match} scheda="formazione" />
        </TabsContent>

        <TabsContent value="modulo">
          <MatchDetailSection match={match} scheda="modulo" />
        </TabsContent>

        <TabsContent value="cronologia">
          <MatchDetailSection match={match} scheda="cronologia" />
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
        highlighted && "border-[hsl(var(--team-accent))]/50 bg-[hsl(var(--team-accent))]/5",
      )}
    >
      <p className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-foreground",
          highlighted && "text-[hsl(var(--team-accent-text))]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
