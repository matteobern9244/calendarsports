import SectionHeader from "@/components/common/SectionHeader";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import OfflineFallback from "@/components/common/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCurrentMotoGPSeason } from "@/lib/currentSeason";
import { useMotoGPCalendar, useMotoGPStandings, useMotoGPConstructorStandings } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TeamLogo from "@/components/common/TeamLogo";
import HighlightsSection from "@/components/highlights/HighlightsSection";

const MOTOGP_CONSTRUCTOR_COLORS: Record<string, { border: string; bg: string }> = {
  ducati:  { border: 'hsl(var(--brand-ducati))',  bg: 'hsl(var(--brand-ducati) / 0.08)' },
  aprilia: { border: 'hsl(var(--brand-aprilia))', bg: 'hsl(var(--brand-aprilia) / 0.06)' },
  ktm:     { border: 'hsl(var(--brand-ktm))',     bg: 'hsl(var(--brand-ktm) / 0.10)' },
  yamaha:  { border: 'hsl(var(--brand-yamaha))',  bg: 'hsl(var(--brand-yamaha) / 0.08)' },
  honda:   { border: 'hsl(var(--brand-honda))',   bg: 'hsl(var(--brand-honda) / 0.08)' },
};

export default function MotoGPPage() {
  const season = getCurrentMotoGPSeason();
  const { data: calendar, isLoading: calLoading, error: calError, refetch: calRefetch } = useMotoGPCalendar(season);
  const { data: standings, isLoading: stLoading, error: stError, refetch: stRefetch } = useMotoGPStandings(season);
  const { data: constructors, isLoading: csLoading, error: csError, refetch: csRefetch } = useMotoGPConstructorStandings(season);
  const { isOnline } = useOnlineStatus();

  if (!isOnline && calError && !calendar && stError && !standings && csError && !constructors) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback onRetry={() => { calRefetch(); stRefetch(); csRefetch(); }} />
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-2">
        <SectionHeader title="MotoGP" />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="piloti" className="font-heading text-xs tracking-wider uppercase">Classifica Piloti</TabsTrigger>
          <TabsTrigger value="costruttori" className="font-heading text-xs tracking-wider uppercase">Classifica Costruttori</TabsTrigger>
          <TabsTrigger value="highlights" className="font-heading text-xs tracking-wider uppercase">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          {calLoading && <LoadingState message="Caricamento calendario MotoGP..." />}
          {calError && <ErrorState message="Errore nel caricamento del calendario" onRetry={() => calRefetch()} />}
          {!calLoading && !calError && (!calendar || calendar.length === 0) && (
            <EmptyState message="Nessun evento in calendario per questa stagione" />
          )}
          {calendar && calendar.length > 0 && (() => {
            const { items: orderedCalendar, highlightIndex } = prioritizeNextUpcoming(
              calendar,
              (event: any) => event.date || event.date_start
            );
            return (
            <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {orderedCalendar.map((e: any, i: number) => {
                const startDate = e.date || e.date_start;
                const endDate = e.date_end;
                const location = [e.circuit, e.location || e.venue, e.city, e.country].filter(Boolean).join(" · ");
                const startTimestamp = startDate ? new Date(startDate).getTime() : NaN;
                const endTimestamp = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1 : startTimestamp;

                const status = Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp)
                  ? Date.now() > endTimestamp
                    ? "completato"
                    : Date.now() >= startTimestamp
                      ? "in_corso"
                      : "prossimo"
                  : startDate
                    ? getEventStatus(startDate)
                    : "prossimo";

                return (
                <EventCard
                  key={e.id || e.round || i}
                  sport={e.round ? `Round ${e.round}` : "MotoGP"}
                  title={e.name}
                  subtitle={location}
                  date={startDate ? formatDateIT(startDate) : "—"}
                  time={e.time ? formatTimeIT(e.time, startDate) : undefined}
                  startDate={e.time && startDate ? `${startDate}T${e.time}` : startDate}
                  status={status}
                  highlight={i === highlightIndex}
                >
                  {endDate && startDate !== endDate && (
                    <p className="text-sm text-muted-foreground">Weekend di gara fino al {formatDateIT(endDate)}</p>
                  )}
                  {e.result && (
                    <p className="text-sm text-muted-foreground">{e.result}</p>
                  )}
                </EventCard>
                );
              })}
            </motion.div>
            );
          })()}
        </TabsContent>

        <TabsContent value="piloti">
          {stLoading && <LoadingState message="Caricamento classifica piloti..." />}
          {stError && <ErrorState message="Errore nel caricamento della classifica" onRetry={() => stRefetch()} />}
          {!stLoading && !stError && (!standings || standings.length === 0) && (
            <EmptyState message="Classifica piloti non disponibile per questa stagione" />
          )}
          {standings && standings.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Pilota</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Team</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s: any) => (
                    <TableRow key={s.position}>
                      <TableCell className="font-heading font-bold">{s.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            src={s.photoUrl}
                            name={s.name}
                            size={32}
                            shape="circle"
                            className="object-cover"
                          />
                          {s.number != null && (
                            <span
                              className="font-heading font-bold text-xs text-primary bg-primary/10 rounded-full h-7 w-7 flex items-center justify-center flex-shrink-0"
                              aria-label={`Numero di gara ${s.number}`}
                            >
                              #{s.number}
                            </span>
                          )}
                          {s.nationality && (
                            <img
                              src={`https://flagcdn.com/${s.nationality}.svg`}
                              alt={`Bandiera ${s.nationality.toUpperCase()}`}
                              className="h-3.5 w-5 object-cover rounded-sm flex-shrink-0 border border-border/40"
                              loading="lazy"
                              decoding="async"
                              width={20}
                              height={14}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <span className="font-semibold">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.team ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo
                              src={s.teamLogoUrl}
                              name={s.team}
                              size={20}
                              shape="rounded"
                              className="bg-background"
                            />
                            <span>{s.team}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{s.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="costruttori">
          {csLoading && <LoadingState message="Caricamento classifica costruttori..." />}
          {csError && <ErrorState message="Errore nel caricamento della classifica" onRetry={() => csRefetch()} />}
          {!csLoading && !csError && (!constructors || constructors.length === 0) && (
            <EmptyState message="Classifica costruttori non disponibile per questa stagione" />
          )}
          {constructors && constructors.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Team</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {constructors.map((c: any) => (
                    <TableRow key={c.position}>
                      <TableCell className="font-heading font-bold">{c.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-14 rounded-md border-2 flex items-center justify-center flex-shrink-0 p-1"
                            style={
                              c.constructor && MOTOGP_CONSTRUCTOR_COLORS[c.constructor]
                                ? {
                                    borderColor: MOTOGP_CONSTRUCTOR_COLORS[c.constructor].border,
                                    backgroundColor: MOTOGP_CONSTRUCTOR_COLORS[c.constructor].bg,
                                  }
                                : { borderColor: 'hsl(var(--border))' }
                            }
                          >
                            <TeamLogo
                              src={c.logoUrl}
                              name={c.team}
                              size={32}
                              shape="rounded"
                              className="h-full w-full bg-transparent border-0"
                            />
                          </div>
                          <span className="font-semibold">{c.team}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{c.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="highlights">
          <HighlightsSection sport="motogp" accentVar="gold" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
