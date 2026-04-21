import SectionHeader from "@/components/common/SectionHeader";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import UnavailableExternalSource from "@/components/common/UnavailableExternalSource";
import OfflineFallback from "@/components/common/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCurrentF1Season } from "@/lib/currentSeason";
import { useF1Calendar, useF1DriverStandings, useF1ConstructorStandings } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from "lucide-react";
import { f1NationalityToIso } from "@/lib/f1Utils";
import TeamLogo from "@/components/common/TeamLogo";
import HighlightsSection from "@/components/highlights/HighlightsSection";

export default function Formula1Page() {
  const season = getCurrentF1Season();
  const { data: calendar, isLoading: calLoading, error: calError, refetch: calRefetch } = useF1Calendar(season);
  const { data: drivers, isLoading: drvLoading, error: drvError, refetch: drvRefetch } = useF1DriverStandings(season);
  const { data: constructors, isLoading: conLoading, error: conError } = useF1ConstructorStandings(season);
  const { isOnline } = useOnlineStatus();

  // Fallback offline: nessuna sezione ha dati in cache e siamo offline
  if (!isOnline && calError && !calendar && drvError && !drivers && conError && !constructors) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback onRetry={() => { calRefetch(); drvRefetch(); }} />
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-2">
        <SectionHeader title="Formula 1" />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="piloti" className="font-heading text-xs tracking-wider uppercase">Classifica Piloti</TabsTrigger>
          <TabsTrigger value="costruttori" className="font-heading text-xs tracking-wider uppercase">Costruttori</TabsTrigger>
          <TabsTrigger value="highlights" className="font-heading text-xs tracking-wider uppercase">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          {calLoading && (
            <LoadingState
              message="Caricamento calendario F1..."
              externalLink="https://www.formula1.com/en/racing/2025"
              externalLabel="Scopri ora su Formula1.com"
            />
          )}
          {calError && <ErrorState message="Errore nel caricamento del calendario" onRetry={() => calRefetch()} />}
          {!calLoading && !calError && (!calendar || calendar.length === 0) && (
            <UnavailableExternalSource
              title={`Calendario F1 ${season}`}
              description="Il calendario dei Gran Premi di questa stagione non è ancora disponibile dalla nostra fonte. Apri il sito ufficiale Formula 1 qui sotto per consultare tutte le tappe del Mondiale, gli orari delle sessioni (prove libere, qualifiche e gara) e i circuiti su cui si correrà."
              externalLink="https://www.formula1.com/en/racing/2025"
              externalLabel="Vedi calendario su Formula1.com"
              ctaHint="Tocca qui per orari e circuiti del Mondiale"
            />
          )}
          {calendar && calendar.length > 0 && (() => {
            const { items: orderedCalendar, highlightIndex } = prioritizeNextUpcoming(calendar, (race: any) => race.date);
            return (
            <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {orderedCalendar.map((r: any, idx: number) => (
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
                >
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {r.firstPractice && <span>PL1: {formatTimeIT(r.firstPractice.time, r.firstPractice.date)}</span>}
                    {r.secondPractice && <span>PL2: {formatTimeIT(r.secondPractice.time, r.secondPractice.date)}</span>}
                    {r.thirdPractice && <span>PL3: {formatTimeIT(r.thirdPractice.time, r.thirdPractice.date)}</span>}
                    {r.qualifying && <span>Qual: {formatTimeIT(r.qualifying.time, r.qualifying.date)}</span>}
                    {r.sprint && <span>Sprint: {formatTimeIT(r.sprint.time, r.sprint.date)}</span>}
                    <span className={`font-semibold text-primary ${!r.sprint && !r.thirdPractice ? '' : 'col-span-2'}`}>
                      Gara: {formatTimeIT(r.time, r.date)}
                    </span>
                  </div>
                </EventCard>
              ))}
            </motion.div>
            );
          })()}
        </TabsContent>

        <TabsContent value="piloti">
          {drvLoading && (
            <LoadingState
              message="Caricamento classifica piloti..."
              externalLink="https://www.formula1.com/en/results/2025/drivers"
              externalLabel="Scopri ora su Formula1.com"
            />
          )}
          {drvError && <ErrorState message="Errore nel caricamento della classifica" onRetry={() => drvRefetch()} />}
          {drivers && drivers.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Pilota</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase hidden sm:table-cell">Scuderia</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Vittorie</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d: any) => (
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
                              className="h-8 w-8 rounded-full object-cover bg-muted flex-shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {(() => {
                            const iso = f1NationalityToIso(d.nationality);
                            return iso ? (
                              <img
                                src={`https://flagcdn.com/${iso}.svg`}
                                alt={`Bandiera ${iso.toUpperCase()}`}
                                className="h-3.5 w-5 object-cover rounded-sm flex-shrink-0 border border-border/40"
                                loading="lazy"
                                decoding="async"
                                width={20}
                                height={14}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : null;
                          })()}
                          <div>
                            <span className="font-semibold">{d.driver}</span>
                            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{d.driverCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{d.constructor}</TableCell>
                      <TableCell className="text-center">{d.wins}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{d.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!drvLoading && !drvError && (!drivers || drivers.length === 0) && (
            <UnavailableExternalSource
              title={`Classifica Piloti ${season}`}
              description="La classifica piloti del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale Formula 1 qui sotto per consultare la graduatoria aggiornata gara dopo gara, con punti, vittorie e podi di ogni pilota."
              externalLink="https://www.formula1.com/en/results/2025/drivers"
              externalLabel="Vedi classifica piloti su Formula1.com"
              ctaHint="Tocca qui per punti, vittorie e podi"
            />
          )}
        </TabsContent>

        <TabsContent value="costruttori">
          {conLoading && (
            <LoadingState
              message="Caricamento classifica costruttori..."
              externalLink="https://www.formula1.com/en/results/2025/team"
              externalLabel="Scopri ora su Formula1.com"
            />
          )}
          {conError && <ErrorState message="Errore nel caricamento della classifica" />}
          {constructors && constructors.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Scuderia</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Vittorie</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructors.map((c: any) => (
                    <TableRow key={c.position}>
                      <TableCell className="font-heading font-bold">{c.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-12 items-center justify-center rounded-md bg-white p-0.5 border border-border/40 flex-shrink-0">
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
          )}
          {!conLoading && !conError && (!constructors || constructors.length === 0) && (
            <UnavailableExternalSource
              title={`Classifica Costruttori ${season}`}
              description="La classifica costruttori del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale Formula 1 qui sotto per consultare la graduatoria delle scuderie, con punti totali, vittorie e prestazioni dei team."
              externalLink="https://www.formula1.com/en/results/2025/team"
              externalLabel="Vedi classifica costruttori su Formula1.com"
              ctaHint="Tocca qui per la graduatoria delle scuderie"
            />
          )}
        </TabsContent>

        <TabsContent value="highlights">
          <HighlightsSection sport="f1" accentVar="gold" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
