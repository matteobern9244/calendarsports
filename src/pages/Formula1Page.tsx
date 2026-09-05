import EventCard from "@/components/common/EventCard";
import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import OfflinePageFallback from "@/components/common/OfflinePageFallback";
import SportTabs from "@/components/common/SportTabs";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { F1Race } from "@/lib/api/schemas";
import { getCurrentF1Season } from "@/lib/currentSeason";
import { allSectionsUnavailable } from "@/lib/offlineSections";
import {
  useF1Calendar,
  useF1DriverStandings,
  useF1ConstructorStandings,
} from "@/hooks/useSportsData";
import {
  formatDateIT,
  formatTimeIT,
  getEventStatus,
  prioritizeNextUpcoming,
} from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from "lucide-react";
import { f1NationalityToIso } from "@/lib/f1Utils";
import TeamLogo from "@/components/common/TeamLogo";
import HighlightsSection from "@/components/highlights/HighlightsSection";
import RaceDetailsDialog, { type RaceSession } from "@/components/common/RaceDetailsDialog";
import { useState } from "react";

const TABS = [
  { value: "calendario", label: "Calendario" },
  { value: "piloti", label: "Classifica Piloti" },
  { value: "costruttori", label: "Costruttori" },
  { value: "highlights", label: "Highlights" },
] as const;

const CALENDAR_SOURCE: ExternalSource = {
  href: "https://www.formula1.com/en/racing/2025",
  label: "Vedi calendario su Formula1.com",
  loadingLabel: "Scopri ora su Formula1.com",
};

const DRIVERS_SOURCE: ExternalSource = {
  href: "https://www.formula1.com/en/results/2025/drivers",
  label: "Vedi classifica piloti su Formula1.com",
  loadingLabel: "Scopri ora su Formula1.com",
};

const CONSTRUCTORS_SOURCE: ExternalSource = {
  href: "https://www.formula1.com/en/results/2025/team",
  label: "Vedi classifica costruttori su Formula1.com",
  loadingLabel: "Scopri ora su Formula1.com",
};

export default function Formula1Page() {
  const season = getCurrentF1Season();
  const {
    data: calendar,
    isLoading: calLoading,
    error: calError,
    refetch: calRefetch,
  } = useF1Calendar(season);
  const {
    data: drivers,
    isLoading: drvLoading,
    error: drvError,
    refetch: drvRefetch,
  } = useF1DriverStandings(season);
  const {
    data: constructors,
    isLoading: conLoading,
    error: conError,
    refetch: conRefetch,
  } = useF1ConstructorStandings(season);
  const { isOnline } = useOnlineStatus();
  const [selectedRace, setSelectedRace] = useState<F1Race | null>(null);

  // Fallback offline: nessuna sezione ha dati in cache e siamo offline
  const sezioni = [
    { data: calendar, error: calError },
    { data: drivers, error: drvError },
    { data: constructors, error: conError },
  ];
  if (!isOnline && allSectionsUnavailable(sezioni)) {
    return (
      <OfflinePageFallback
        onRetry={() => {
          calRefetch();
          drvRefetch();
        }}
      />
    );
  }

  return (
    <SportTabs
      title="Formula 1"
      defaultValue="calendario"
      tabs={TABS}
      afterTabs={
        <RaceDetailsDialog
          open={!!selectedRace}
          onOpenChange={(o) => !o && setSelectedRace(null)}
          sport={selectedRace ? `Formula 1 · Round ${selectedRace.round}` : "Formula 1"}
          title={selectedRace?.raceName ?? ""}
          subtitle={
            selectedRace
              ? `${selectedRace.circuit} · ${selectedRace.locality}, ${selectedRace.country}`
              : undefined
          }
          sessions={
            selectedRace
              ? ([
                  selectedRace.firstPractice && {
                    label: "Prove libere 1",
                    date: `${selectedRace.firstPractice.date}T${selectedRace.firstPractice.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.secondPractice && {
                    label: "Prove libere 2",
                    date: `${selectedRace.secondPractice.date}T${selectedRace.secondPractice.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.thirdPractice && {
                    label: "Prove libere 3",
                    date: `${selectedRace.thirdPractice.date}T${selectedRace.thirdPractice.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.sprintQualifying && {
                    label: "Sprint Qualifying",
                    date: `${selectedRace.sprintQualifying.date}T${selectedRace.sprintQualifying.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.sprint && {
                    label: "Sprint",
                    date: `${selectedRace.sprint.date}T${selectedRace.sprint.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.qualifying && {
                    label: "Qualifiche",
                    date: `${selectedRace.qualifying.date}T${selectedRace.qualifying.time ?? "00:00:00Z"}`,
                  },
                  selectedRace.time && {
                    label: "Gara",
                    date: `${selectedRace.date}T${selectedRace.time}`,
                    primary: true,
                  },
                ].filter(Boolean) as RaceSession[])
              : []
          }
        />
      }
    >
      <TabsContent value="calendario">
        <DataSection
          isLoading={calLoading}
          error={calError}
          isEmpty={!calendar?.length}
          source={CALENDAR_SOURCE}
          loadingMessage="Caricamento calendario F1..."
          errorMessage={`Calendario F1 ${season} non disponibile`}
          errorDetail="La nostra fonte dati non sta rispondendo correttamente. Puoi riprovare oppure consultare il calendario ufficiale Formula 1 mentre risolviamo il problema."
          errorCtaHint="Tocca qui per consultare il calendario ufficiale ora"
          onRetry={() => calRefetch()}
          emptyTitle={`Calendario F1 ${season}`}
          emptyDescription="Il calendario dei Gran Premi di questa stagione non è ancora disponibile dalla nostra fonte. Apri il sito ufficiale Formula 1 qui sotto per consultare tutte le tappe del Mondiale, gli orari delle sessioni (prove libere, qualifiche e gara) e i circuiti su cui si correrà."
          emptyCtaHint="Tocca qui per orari e circuiti del Mondiale"
        >
          {(() => {
            const { items: orderedCalendar, highlightIndex } = prioritizeNextUpcoming(
              calendar ?? [],
              (race) => race.date,
            );
            return (
              <motion.div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              >
                {orderedCalendar.map((r, idx) => (
                  <EventCard
                    key={r.round}
                    sport={`Round ${r.round}`}
                    title={r.raceName}
                    subtitle={`${r.circuit} · ${r.locality}, ${r.country}`}
                    date={formatDateIT(r.date)}
                    time={formatTimeIT(r.time, r.date)}
                    startDate={r.time ? `${r.date}T${r.time}` : r.date}
                    status={getEventStatus(r.date)}
                    highlight={idx === highlightIndex}
                    onRetry={() => calRefetch()}
                    onClick={() => setSelectedRace(r)}
                  >
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {r.firstPractice && (
                        <span>PL1: {formatTimeIT(r.firstPractice.time, r.firstPractice.date)}</span>
                      )}
                      {r.secondPractice && (
                        <span>
                          PL2: {formatTimeIT(r.secondPractice.time, r.secondPractice.date)}
                        </span>
                      )}
                      {r.thirdPractice && (
                        <span>PL3: {formatTimeIT(r.thirdPractice.time, r.thirdPractice.date)}</span>
                      )}
                      {r.qualifying && (
                        <span>Qual: {formatTimeIT(r.qualifying.time, r.qualifying.date)}</span>
                      )}
                      {r.sprint && (
                        <span>Sprint: {formatTimeIT(r.sprint.time, r.sprint.date)}</span>
                      )}
                      <span
                        className={`font-semibold text-primary ${!r.sprint && !r.thirdPractice ? "" : "col-span-2"}`}
                      >
                        Gara: {formatTimeIT(r.time, r.date)}
                      </span>
                    </div>
                  </EventCard>
                ))}
              </motion.div>
            );
          })()}
        </DataSection>
      </TabsContent>

      <TabsContent value="piloti">
        <DataSection
          isLoading={drvLoading}
          error={drvError}
          isEmpty={!drivers?.length}
          source={DRIVERS_SOURCE}
          loadingMessage="Caricamento classifica piloti..."
          errorMessage={`Classifica piloti F1 ${season} non disponibile`}
          errorDetail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta la classifica ufficiale aggiornata gara dopo gara su Formula1.com."
          errorCtaHint="Tocca qui per la classifica piloti ufficiale"
          onRetry={() => drvRefetch()}
          emptyTitle={`Classifica Piloti ${season}`}
          emptyDescription="La classifica piloti del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale Formula 1 qui sotto per consultare la graduatoria aggiornata gara dopo gara, con punti, vittorie e podi di ogni pilota."
          emptyCtaHint="Tocca qui per punti, vittorie e podi"
        >
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">
                    Pos
                  </TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase">
                    Pilota
                  </TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase hidden sm:table-cell">
                    Scuderia
                  </TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
                    Vittorie
                  </TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
                    Punti
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drivers ?? []).map((d) => (
                  <TableRow key={d.position}>
                    <TableCell className="font-heading font-bold">{d.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.photoUrl ? (
                          <img
                            src={d.photoUrl}
                            alt={d.driver}
                            loading="lazy"
                            decoding="async"
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover bg-muted shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        {(() => {
                          const iso = f1NationalityToIso(d.nationality);
                          return iso ? (
                            <img
                              src={`https://flagcdn.com/${iso}.svg`}
                              alt={`Bandiera ${iso.toUpperCase()}`}
                              className="h-3.5 w-5 object-cover rounded-sm shrink-0 border border-border/40"
                              loading="lazy"
                              decoding="async"
                              width={20}
                              height={14}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : null;
                        })()}
                        <div>
                          <span className="font-semibold">{d.driver}</span>
                          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                            {d.driverCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {d.constructor}
                    </TableCell>
                    <TableCell className="text-center">{d.wins}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{d.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataSection>
      </TabsContent>

      <TabsContent value="costruttori">
        <DataSection
          isLoading={conLoading}
          error={conError}
          isEmpty={!constructors?.length}
          source={CONSTRUCTORS_SOURCE}
          loadingMessage="Caricamento classifica costruttori..."
          errorMessage={`Classifica costruttori F1 ${season} non disponibile`}
          errorDetail="La nostra fonte dati non risponde in questo momento. Puoi riprovare oppure consultare la classifica costruttori ufficiale aggiornata sul sito Formula 1."
          errorCtaHint="Tocca qui per la classifica costruttori ufficiale"
          onRetry={() => conRefetch()}
          emptyTitle={`Classifica Costruttori ${season}`}
          emptyDescription="La classifica costruttori del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale Formula 1 qui sotto per consultare la graduatoria delle scuderie, con punti totali, vittorie e prestazioni dei team."
          emptyCtaHint="Tocca qui per la graduatoria delle scuderie"
        >
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">
                    Pos
                  </TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase">
                    Scuderia
                  </TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
                    Vittorie
                  </TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
                    Punti
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(constructors ?? []).map((c) => (
                  <TableRow key={c.position}>
                    <TableCell className="font-heading font-bold">{c.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-12 items-center justify-center rounded-md bg-white p-0.5 border border-border/40 shrink-0">
                          <TeamLogo
                            src={c.logoUrl}
                            name={c.constructor}
                            size={32}
                            shape="rounded"
                            className="h-7 w-11 bg-transparent border-0"
                          />
                        </div>
                        <span className="font-semibold">{c.constructor}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{c.wins}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{c.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataSection>
      </TabsContent>

      <TabsContent value="highlights">
        <HighlightsSection sport="f1" accentVar="gold" />
      </TabsContent>
    </SportTabs>
  );
}
