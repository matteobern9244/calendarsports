import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import { useTeamSquad } from "@/hooks/useSportsData";
import type { SerieATeam } from "@/lib/serieATeams";
import SquadSection from "./SquadSection";

/**
 * La scheda «Rosa», con dentro la propria richiesta.
 *
 * La richiesta sta **qui** e non in `TeamPage` di proposito: `TabsContent` di
 * Radix non rende il contenuto delle schede chiuse, quindi questo componente
 * viene montato solo quando qualcuno apre la scheda, e la rosa si scarica solo
 * allora. Se l'hook stesse nella pagina partirebbe a ogni visita, e la pagina
 * rosa di Sky pesa oltre duecento kilobyte: sarebbero duecento kilobyte
 * chiesti a Sky per una scheda che la maggior parte delle visite non apre.
 *
 * Il rovescio da conoscere: «Sincronizza» non puo' scaldare questa cache,
 * perche' scrive chiavi di cose che la pagina legge subito. La prima apertura
 * della scheda mostra sempre un caricamento.
 */
interface SquadPanelProps {
  team: SerieATeam;
  season: number;
  source: ExternalSource;
}

export default function SquadPanel({ team, season, source }: SquadPanelProps) {
  const { data, isLoading, error, refetch } = useTeamSquad(team.slug, season);

  return (
    <DataSection
      isLoading={isLoading}
      error={error}
      isEmpty={!data?.players.length}
      source={source}
      loadingMessage={`Caricamento rosa ${team.name} da Sky Sport...`}
      errorMessage={`Rosa ${team.name} non disponibile`}
      errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri direttamente la pagina ufficiale della squadra su Sky Sport."
      errorCtaHint="Tocca qui per la rosa completa"
      onRetry={() => refetch()}
      emptyTitle={`Rosa ${team.name}`}
      emptyDescription="La rosa di questa squadra non è disponibile dalla nostra fonte in questo momento. Apri la pagina ufficiale Sky Sport qui sotto per consultare l'elenco completo dei giocatori, con ruolo, numero di maglia e dati anagrafici."
      emptyCtaHint="Tocca qui per la rosa completa"
    >
      {data && <SquadSection team={team} squad={data} />}
    </DataSection>
  );
}
