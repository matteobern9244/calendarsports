import DataSection from "@/components/common/DataSection";
import EventCountdown from "@/components/common/EventCountdown";
import EmptyState from "@/components/common/EmptyState";
import { useMatchDetail } from "@/hooks/useSportsData";
import type { FootballMatch } from "@/lib/api/schemas";
import type { SerieATeam } from "@/lib/serieATeams";
import {
  SchedaCronologia,
  SchedaFormazione,
  SchedaModulo,
  SchedaRisultato,
} from "./MatchDetailPanels";

/**
 * Una scheda del dettaglio partita, con dentro la propria richiesta.
 *
 * ## Perché quattro montaggi non fanno quattro richieste
 *
 * Ogni scheda monta questo componente e ognuno chiama `useMatchDetail`, ma la
 * chiave di cache è la stessa: React Query deduplica per chiave, non per
 * componente, quindi la partita si scarica **una volta sola** e le altre tre
 * schede la trovano già pronta.
 *
 * E si scarica solo all'apertura: `TabsContent` di Radix non rende le schede
 * chiuse, e i tre widget insieme pesano un centinaio di kilobyte. La scheda
 * predefinita è «Anteprima», che non ne ha bisogno.
 *
 * ## Quando non c'è niente da chiedere
 *
 * Una partita senza `skyMatchId` non ha un dettaglio: succede se la fonte
 * smette di pubblicarlo, ed è il motivo per cui il campo è opzionale. In quel
 * caso la scheda lo dice, invece di mostrare un caricamento che non finisce.
 */
type Scheda = "formazione" | "modulo" | "risultato" | "cronologia";

interface MatchDetailSectionProps {
  team: SerieATeam;
  match: FootballMatch;
  scheda: Scheda;
  onRetry: () => void;
}

const MESSAGGI: Record<Scheda, { caricamento: string; errore: string; vuoto: string }> = {
  formazione: {
    caricamento: "Caricamento formazioni...",
    errore: "Formazioni non disponibili",
    vuoto: "Formazioni",
  },
  modulo: {
    caricamento: "Caricamento modulo...",
    errore: "Modulo non disponibile",
    vuoto: "Modulo",
  },
  risultato: {
    caricamento: "Caricamento risultato...",
    errore: "Risultato non disponibile",
    vuoto: "Risultato",
  },
  cronologia: {
    caricamento: "Caricamento cronologia...",
    errore: "Cronologia non disponibile",
    vuoto: "Cronologia",
  },
};

export default function MatchDetailSection({
  team,
  match,
  scheda,
  onRetry,
}: MatchDetailSectionProps) {
  const { data, isLoading, error, refetch } = useMatchDetail(match.skyMatchId);
  const testi = MESSAGGI[scheda];

  if (!match.skyMatchId) {
    return (
      <EmptyState message="La nostra fonte non pubblica un identificativo per questa partita, quindi il dettaglio non è disponibile." />
    );
  }

  // Il risultato prima del fischio d'inizio non è un dato mancante: è una
  // partita che non si è giocata. Il conto alla rovescia dice la stessa cosa
  // meglio di qualunque messaggio di errore.
  const daGiocare = !isLoading && !error && data !== undefined && data.score === null;
  if (scheda === "risultato" && daGiocare) {
    return (
      <div className="space-y-4">
        <EmptyState message="Risultato non ancora disponibile: la partita non è stata giocata." />
        {match.date && (
          <div className="flex justify-center">
            <EventCountdown startDate={match.date} onRetry={onRetry} />
          </div>
        )}
      </div>
    );
  }

  return (
    <DataSection
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      source={match.link ? { href: match.link, label: "Vedi la partita su Sky Sport" } : undefined}
      loadingMessage={testi.caricamento}
      errorMessage={testi.errore}
      errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova, oppure apri la pagina della partita."
      errorCtaHint="Tocca qui per la pagina della partita"
      onRetry={() => refetch()}
      emptyTitle={testi.vuoto}
      emptyDescription="La nostra fonte non pubblica ancora questi dati per la partita. Apri la pagina ufficiale qui sotto per consultarli."
      emptyCtaHint="Tocca qui per la pagina della partita"
    >
      {data && scheda === "formazione" && <SchedaFormazione detail={data} />}
      {data && scheda === "modulo" && <SchedaModulo detail={data} />}
      {data && scheda === "cronologia" && <SchedaCronologia detail={data} />}
      {data && scheda === "risultato" && data.score && (
        <SchedaRisultato detail={data} team={team} />
      )}
    </DataSection>
  );
}
