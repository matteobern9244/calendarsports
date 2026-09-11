import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import { useFootballCalendar, useSerieAStandings } from "@/hooks/useSportsData";
import { matchesOf } from "@/lib/api/schemas";
import type { SerieATeam } from "@/lib/serieATeams";
import StatsBoard from "./StatsBoard";

/**
 * La scheda «Statistiche», con dentro le proprie richieste.
 *
 * Come `SquadPanel`, sta qui e non in `TeamPage` perche' `TabsContent` di
 * Radix non rende le schede chiuse: la stagione intera si scarica solo se
 * qualcuno apre questa scheda.
 *
 * ## Le due richieste
 *
 * La **classifica** e' gia' in cache: `TeamPage` la chiede per la sua scheda,
 * e la chiave e' la stessa, quindi qui non parte nessuna seconda chiamata.
 * React Query deduplica per chiave, non per componente.
 *
 * Il **calendario** invece si chiede senza `page` ne' `pageSize`, ed e' una
 * richiesta nuova: cosi' la edge function restituisce l'array piatto di tutta
 * la stagione invece di una pagina da dodici. E' una voce di cache distinta
 * da quelle paginate — sta scritto in `queryKeys.ts` — e deve esserlo:
 * calcolare un andamento su dodici partite scelte da un impaginatore
 * disegnerebbe una curva vera per un pezzo di stagione e falsa come stagione.
 */
interface StatsPanelProps {
  team: SerieATeam;
  season: number;
  source: ExternalSource;
}

export default function StatsPanel({ team, season, source }: StatsPanelProps) {
  const standings = useSerieAStandings(season);
  const calendario = useFootballCalendar(team.slug, season);

  const isLoading = standings.isLoading || calendario.isLoading;
  const error = standings.error ?? calendario.error;

  return (
    <DataSection
      isLoading={isLoading}
      error={error}
      // La classifica e' l'unica indispensabile: senza, non c'e' nessun
      // totale da mostrare. Il calendario a mani vuote toglie l'andamento e
      // la divisione casa/trasferta, e `StatsBoard` lo regge da solo.
      isEmpty={!standings.data?.length}
      source={source}
      loadingMessage={`Caricamento statistiche ${team.name}...`}
      errorMessage={`Statistiche ${team.name} non disponibili`}
      errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri la classifica ufficiale su Sky Sport."
      errorCtaHint="Tocca qui per i dati ufficiali"
      onRetry={() => {
        standings.refetch();
        calendario.refetch();
      }}
      emptyTitle={`Statistiche ${team.name}`}
      emptyDescription="Le statistiche di questa stagione si ricavano dalla classifica di Serie A, che al momento la nostra fonte non espone. Apri la classifica ufficiale Sky Sport qui sotto per consultare punti, gol e differenza reti di tutte le squadre."
      emptyCtaHint="Tocca qui per la classifica ufficiale"
    >
      {standings.data && (
        <StatsBoard team={team} standings={standings.data} matches={matchesOf(calendario.data)} />
      )}
    </DataSection>
  );
}
