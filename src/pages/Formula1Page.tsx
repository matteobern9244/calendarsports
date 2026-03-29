import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useF1Calendar, useF1DriverStandings, useF1ConstructorStandings } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Formula1Page() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: calendar, isLoading: calLoading, error: calError, refetch: calRefetch } = useF1Calendar(seasons.f1);
  const { data: drivers, isLoading: drvLoading, error: drvError, refetch: drvRefetch } = useF1DriverStandings(seasons.f1);
  const { data: constructors, isLoading: conLoading, error: conError } = useF1ConstructorStandings(seasons.f1);

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Formula 1" subtitle="Calendario, classifiche e highlights — Dati reali da Jolpica/Ergast API" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.f1} onSelect={(y) => setSeason("f1", y)} minYear={1950} />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="piloti" className="font-heading text-xs tracking-wider uppercase">Classifica Piloti</TabsTrigger>
          <TabsTrigger value="costruttori" className="font-heading text-xs tracking-wider uppercase">Costruttori</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          {calLoading && <LoadingState message="Caricamento calendario F1..." />}
          {calError && <ErrorState message="Errore nel caricamento del calendario" onRetry={() => calRefetch()} />}
          {!calLoading && !calError && (!calendar || calendar.length === 0) && <EmptyState message="Nessun GP in calendario per questa stagione" />}
          {calendar && calendar.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {calendar.map((r: any) => (
                <EventCard
                  key={r.round}
                  sport={`Round ${r.round}`}
                  title={r.raceName}
                  subtitle={`${r.circuit} · ${r.locality}, ${r.country}`}
                  date={formatDateIT(r.date)}
                  time={formatTimeIT(r.time, r.date)}
                  status={getEventStatus(r.date)}
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
          )}
        </TabsContent>

        <TabsContent value="piloti">
          {drvLoading && <LoadingState message="Caricamento classifica piloti..." />}
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
                        <span className="font-semibold">{d.driver}</span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{d.driverCode}</span>
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
        </TabsContent>

        <TabsContent value="costruttori">
          {conLoading && <LoadingState message="Caricamento classifica costruttori..." />}
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
                      <TableCell className="font-semibold">{c.constructor}</TableCell>
                      <TableCell className="text-center">{c.wins}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{c.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
