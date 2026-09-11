import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import { useLineups } from "@/hooks/useSportsData";
import type { SerieATeam } from "@/lib/serieATeams";
import LineupsBoard from "./LineupsBoard";

/**
 * La scheda «Formazioni», con dentro la propria richiesta.
 *
 * Stesso motivo di `SquadPanel`: `TabsContent` non rende le schede chiuse,
 * quindi la pagina Sky si scarica solo quando qualcuno apre la scheda.
 *
 * Lo **stato vuoto** qui e' un caso normale, non un guasto: fuori dal
 * calendario — d'estate, o dopo l'ultima giornata — non ci sono probabili
 * formazioni da pubblicare, e il messaggio deve dirlo senza sembrare un errore.
 */
interface LineupsPanelProps {
  team: SerieATeam;
  season: number;
  source: ExternalSource;
}

export default function LineupsPanel({ team, season, source }: LineupsPanelProps) {
  const { data, isLoading, error, refetch } = useLineups(team.slug, season);
  const vuoto = !data?.home && !data?.away;

  return (
    <DataSection
      isLoading={isLoading}
      error={error}
      isEmpty={vuoto}
      source={source}
      loadingMessage={`Caricamento probabili formazioni ${team.name} da Sky Sport...`}
      errorMessage={`Probabili formazioni ${team.name} non disponibili`}
      errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri direttamente le probabili formazioni su Sky Sport."
      errorCtaHint="Tocca qui per le formazioni"
      onRetry={() => refetch()}
      emptyTitle={`Nessuna probabile formazione per il ${team.name}`}
      emptyDescription="Sky Sport pubblica le probabili formazioni nei giorni che precedono una giornata di campionato. Fuori da quelle finestre — a stagione ferma o dopo l'ultima giornata — non c'è niente da mostrare: non è un errore. Apri la pagina di Sky Sport qui sotto per controllare direttamente."
      emptyCtaHint="Tocca qui per le probabili formazioni"
    >
      {data && <LineupsBoard lineups={data} />}
    </DataSection>
  );
}
