import DataSection from "@/components/common/DataSection";
import { usePlayerStats } from "@/hooks/useSportsData";
import type { CompetitionStats } from "@/lib/api/schemas";
import type { SkyPlayerRef } from "@/lib/teamRoutes";
import { ETICHETTE_GRAFICI, ETICHETTE_STATISTICHE } from "./playerStatsLabels";

/**
 * Le statistiche di un giocatore, dentro la sua riga della rosa.
 *
 * ## Perche' una richiesta per volta
 *
 * La scheda atleta di Sky pesa circa 460 KB, e il JSON che ci serve ne occupa
 * tre. Un indirizzo piu' leggero e' stato cercato l'11 settembre 2026 e non
 * esiste. Con venticinque giocatori per rosa, una tabella con tutti costerebbe
 * venticinque richieste e undici megabyte a ogni apertura della scheda: per
 * questo si scarica **il giocatore che qualcuno ha aperto**, e nessun altro.
 *
 * Il componente viene montato solo dalla riga espansa, quindi `enabled` segue
 * il montaggio; resta esplicito perche' e' l'unica cosa che tiene in piedi
 * quel conto.
 */
interface PlayerStatsPanelProps {
  riferimento: SkyPlayerRef;
  nome: string;
  season: number;
}

function Voce({ label, valore }: { label: string; valore: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-sm font-bold tabular-nums">{valore}</span>
    </div>
  );
}

function Competizione({ dati }: { dati: CompetitionStats }) {
  // Solo le voci che questo giocatore ha davvero. Un portiere non ha `Goals`,
  // e un «0» al suo posto sarebbe un numero inventato per riempire una riga.
  const voci = ETICHETTE_STATISTICHE.filter(({ id }) => dati.stats[id] !== undefined);
  const grafici = dati.charts.filter((c) => ETICHETTE_GRAFICI[c.id]);

  return (
    <div>
      <p className="font-heading text-[11px] uppercase tracking-widest text-[hsl(var(--team-accent-text))]">
        {dati.competition} <span className="text-muted-foreground">{dati.season}</span>
      </p>

      {voci.length === 0 && grafici.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Per questa competizione la fonte non pubblica statistiche.
        </p>
      ) : (
        <>
          <div className="mt-1 grid grid-cols-2 gap-x-5 sm:grid-cols-3">
            {voci.map(({ id, label }) => (
              <Voce key={id} label={label} valore={dati.stats[id]} />
            ))}
          </div>

          {grafici.length > 0 && (
            <ul className="mt-2 space-y-2 border-t border-border/40 pt-2">
              {grafici.map(({ id, success, failure }) => {
                const totale = success + failure;
                return (
                  <li key={id}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{ETICHETTE_GRAFICI[id]}</span>
                      <span className="tabular-nums">
                        <span className="font-heading font-bold">{success}</span>
                        <span className="text-muted-foreground"> riusciti su {totale}</span>
                      </span>
                    </div>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${ETICHETTE_GRAFICI[id]}: ${success} riusciti su ${totale}.`}
                    >
                      <div
                        className="h-full bg-[hsl(var(--team-accent))]"
                        style={{ width: totale > 0 ? `${(success / totale) * 100}%` : "0%" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function PlayerStatsPanel({ riferimento, nome, season }: PlayerStatsPanelProps) {
  const { data, isLoading, error, refetch } = usePlayerStats(
    riferimento.slug,
    riferimento.id,
    season,
    true,
  );

  return (
    <div className="border-t border-border/40 bg-muted/20 px-3 py-3">
      <DataSection
        isLoading={isLoading}
        error={error}
        isEmpty={!data?.competitions.length}
        source={{
          href: `https://sport.sky.it/calcio/atleti/${riferimento.slug}/${riferimento.id}`,
          label: `Vedi ${nome} su Sky Sport`,
        }}
        loadingMessage={`Caricamento statistiche di ${nome}...`}
        errorMessage={`Statistiche di ${nome} non disponibili`}
        errorDetail="La nostra fonte dati (Sky Sport) non risponde in questo momento. Riprova oppure apri la scheda del giocatore su Sky Sport."
        errorCtaHint="Tocca qui per la scheda completa"
        onRetry={() => refetch()}
        emptyTitle={`Statistiche di ${nome}`}
        emptyDescription="Per questa stagione la nostra fonte non pubblica ancora statistiche di questo giocatore: può essere appena arrivato, oppure non aver ancora giocato. Apri la sua scheda su Sky Sport qui sotto per le stagioni precedenti."
        emptyCtaHint="Tocca qui per la scheda completa"
      >
        {data && (
          <div className="space-y-4">
            {data.competitions.map((c) => (
              <Competizione key={`${c.seasonYear}-${c.competitionId}`} dati={c} />
            ))}
            <p className="text-[11px] text-muted-foreground">
              Statistiche di stagione da Sky Sport. Le voci mostrate dipendono dal ruolo: la fonte
              non pubblica le stesse per un portiere e per un attaccante.
            </p>
          </div>
        )}
      </DataSection>
    </div>
  );
}
