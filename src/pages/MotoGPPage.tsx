import SectionHeader from "@/components/common/SectionHeader";
import EventCard from "@/components/common/EventCard";
import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import OfflineFallback from "@/components/common/OfflineFallback";
import { useNowMinute } from "@/hooks/useNow";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { MotoGPEvent } from "@/lib/api/schemas";
import { getCurrentMotoGPSeason } from "@/lib/currentSeason";
import {
  useMotoGPCalendar,
  useMotoGPStandings,
  useMotoGPConstructorStandings,
} from "@/hooks/useSportsData";
import { formatDateIT, getEventStatus, prioritizeNextUpcoming, toRomeDate } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TeamLogo from "@/components/common/TeamLogo";
import HighlightsSection from "@/components/highlights/HighlightsSection";
import RaceDetailsDialog, { type RaceSession } from "@/components/common/RaceDetailsDialog";
import { useState } from "react";

const CALENDAR_SOURCE: ExternalSource = {
  href: "https://www.motogp.com/it/calendar",
  label: "Vedi calendario su MotoGP.com",
  loadingLabel: "Scopri ora su MotoGP.com",
};

const RIDERS_SOURCE: ExternalSource = {
  href: "https://www.motogp.com/it/world-standing/motogp",
  label: "Vedi classifica piloti su MotoGP.com",
  loadingLabel: "Scopri ora su MotoGP.com",
};

const CONSTRUCTORS_SOURCE: ExternalSource = {
  href: "https://www.motogp.com/it/world-standing/motogp/constructor",
  label: "Vedi classifica costruttori su MotoGP.com",
  loadingLabel: "Scopri ora su MotoGP.com",
};

const MOTOGP_CONSTRUCTOR_COLORS: Record<string, { border: string; bg: string }> = {
  ducati: { border: "hsl(var(--brand-ducati))", bg: "hsl(var(--brand-ducati) / 0.08)" },
  aprilia: { border: "hsl(var(--brand-aprilia))", bg: "hsl(var(--brand-aprilia) / 0.06)" },
  ktm: { border: "hsl(var(--brand-ktm))", bg: "hsl(var(--brand-ktm) / 0.10)" },
  yamaha: { border: "hsl(var(--brand-yamaha))", bg: "hsl(var(--brand-yamaha) / 0.08)" },
  honda: { border: "hsl(var(--brand-honda))", bg: "hsl(var(--brand-honda) / 0.08)" },
};

export default function MotoGPPage() {
  const season = getCurrentMotoGPSeason();
  const {
    data: calendar,
    isLoading: calLoading,
    error: calError,
    refetch: calRefetch,
  } = useMotoGPCalendar(season);
  const {
    data: standings,
    isLoading: stLoading,
    error: stError,
    refetch: stRefetch,
  } = useMotoGPStandings(season);
  const {
    data: constructors,
    isLoading: csLoading,
    error: csError,
    refetch: csRefetch,
  } = useMotoGPConstructorStandings(season);
  const { isOnline } = useOnlineStatus();
  // Letto dal clock condiviso invece che con `Date.now()`: lo stato di
  // ogni weekend di gara si calcola in render, e in render `Date.now()`
  // e' impuro (`react-hooks/purity`).
  const nowMs = useNowMinute();
  const [selectedEvent, setSelectedEvent] = useState<MotoGPEvent | null>(null);

  if (!isOnline && calError && !calendar && stError && !standings && csError && !constructors) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback
          onRetry={() => {
            calRefetch();
            stRefetch();
            csRefetch();
          }}
        />
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
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">
            Calendario
          </TabsTrigger>
          <TabsTrigger value="piloti" className="font-heading text-xs tracking-wider uppercase">
            Classifica Piloti
          </TabsTrigger>
          <TabsTrigger
            value="costruttori"
            className="font-heading text-xs tracking-wider uppercase"
          >
            Classifica Costruttori
          </TabsTrigger>
          <TabsTrigger value="highlights" className="font-heading text-xs tracking-wider uppercase">
            Highlights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <DataSection
            isLoading={calLoading}
            error={calError}
            isEmpty={!calendar?.length}
            source={CALENDAR_SOURCE}
            loadingMessage="Caricamento calendario MotoGP..."
            errorMessage={`Calendario MotoGP ${season} non disponibile`}
            errorDetail="La nostra fonte dati non sta rispondendo correttamente. Puoi riprovare oppure consultare il calendario ufficiale MotoGP mentre risolviamo il problema."
            errorCtaHint="Tocca qui per consultare il calendario ufficiale ora"
            onRetry={() => calRefetch()}
            emptyTitle={`Calendario MotoGP ${season}`}
            emptyDescription="Il calendario dei Gran Premi di questa stagione non è ancora disponibile dalla nostra fonte. Apri il sito ufficiale MotoGP qui sotto per consultare tutte le tappe del Mondiale, gli orari delle sessioni (libere, qualifiche, Sprint e gara) e i circuiti su cui si correrà."
            emptyCtaHint="Tocca qui per orari Sprint e gara"
          >
            {(() => {
              const { items: orderedCalendar, highlightIndex } = prioritizeNextUpcoming(
                calendar ?? [],
                (event) => event.date_start,
                undefined,
                (event) => (event.date_end ? `${event.date_end}T23:59:59Z` : event.date_start),
              );
              return (
                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                >
                  {orderedCalendar.map((e, i) => {
                    const startDate = e.date_start;
                    const endDate = e.date_end;
                    const location = [e.circuit, e.location, e.country].filter(Boolean).join(" · ");
                    // `toRomeDate` normalizza ISO "naive" come UTC (policy
                    // condivisa con le altre pagine sportive). I confronti
                    // sono in millisecondi assoluti quindi indipendenti dal
                    // fuso, ma evitiamo l'interpretazione locale del client
                    // sui giorni senza orario (es. `2026-04-21`).
                    const startMs = toRomeDate(startDate)?.getTime() ?? NaN;
                    const endMsRaw = toRomeDate(endDate)?.getTime();
                    // L'evento e' "in corso" fino alla fine del giorno
                    // dell'ultima sessione (weekend di gara MotoGP).
                    const endMs = endMsRaw != null ? endMsRaw + 24 * 60 * 60 * 1000 - 1 : startMs;

                    const status =
                      Number.isFinite(startMs) && Number.isFinite(endMs)
                        ? nowMs > endMs
                          ? "completato"
                          : nowMs >= startMs
                            ? "in_corso"
                            : "prossimo"
                        : getEventStatus(startDate);

                    return (
                      <EventCard
                        key={e.id || e.round || i}
                        sport={e.round ? `Round ${e.round}` : "MotoGP"}
                        title={e.name}
                        subtitle={location}
                        date={formatDateIT(startDate)}
                        startDate={startDate}
                        endDate={endDate ? `${endDate}T23:59:59Z` : undefined}
                        status={status}
                        highlight={i === highlightIndex}
                        onRetry={() => calRefetch()}
                        onClick={() => setSelectedEvent(e)}
                      >
                        {endDate && startDate !== endDate && (
                          <p className="text-sm text-muted-foreground">
                            Weekend di gara fino al {formatDateIT(endDate)}
                          </p>
                        )}
                      </EventCard>
                    );
                  })}
                </motion.div>
              );
            })()}
          </DataSection>
        </TabsContent>

        <TabsContent value="piloti">
          <DataSection
            isLoading={stLoading}
            error={stError}
            isEmpty={!standings?.length}
            source={RIDERS_SOURCE}
            loadingMessage="Caricamento classifica piloti..."
            errorMessage={`Classifica piloti MotoGP ${season} non disponibile`}
            errorDetail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta la classifica piloti ufficiale aggiornata gara dopo gara su MotoGP.com."
            errorCtaHint="Tocca qui per la classifica piloti ufficiale"
            onRetry={() => stRefetch()}
            emptyTitle={`Classifica Piloti ${season}`}
            emptyDescription="La classifica piloti del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale MotoGP qui sotto per consultare la graduatoria aggiornata, con punti, vittorie e prestazioni di ogni pilota della classe regina."
            emptyCtaHint="Tocca qui per punti e vittorie"
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
                    <TableHead className="font-heading text-xs tracking-wider uppercase">
                      Team
                    </TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
                      Punti
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(standings ?? []).map((s) => (
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
                              className="font-heading font-bold text-xs text-primary bg-primary/10 rounded-full h-7 w-7 flex items-center justify-center shrink-0"
                              aria-label={`Numero di gara ${s.number}`}
                            >
                              #{s.number}
                            </span>
                          )}
                          {s.nationality && (
                            <img
                              src={`https://flagcdn.com/${s.nationality}.svg`}
                              alt={`Bandiera ${s.nationality.toUpperCase()}`}
                              className="h-3.5 w-5 object-cover rounded-sm shrink-0 border border-border/40"
                              loading="lazy"
                              decoding="async"
                              width={20}
                              height={14}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
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
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {s.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataSection>
        </TabsContent>

        <TabsContent value="costruttori">
          <DataSection
            isLoading={csLoading}
            error={csError}
            isEmpty={!constructors?.length}
            source={CONSTRUCTORS_SOURCE}
            loadingMessage="Caricamento classifica costruttori..."
            errorMessage={`Classifica costruttori MotoGP ${season} non disponibile`}
            errorDetail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta la classifica costruttori ufficiale su MotoGP.com."
            errorCtaHint="Tocca qui per la classifica costruttori ufficiale"
            onRetry={() => csRefetch()}
            emptyTitle={`Classifica Costruttori ${season}`}
            emptyDescription="La classifica costruttori del Mondiale di questa stagione non è ancora disponibile dalla nostra fonte. Apri la classifica ufficiale MotoGP qui sotto per consultare la graduatoria delle case motociclistiche, con punti totali e vittorie."
            emptyCtaHint="Tocca qui per la graduatoria delle case"
          >
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">
                      Pos
                    </TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">
                      Team
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
                        <div className="flex items-center gap-3">
                          <div
                            className="relative h-10 w-14 rounded-md border-2 flex items-center justify-center shrink-0 p-1 bg-white dark:bg-white"
                            style={
                              c.constructor && MOTOGP_CONSTRUCTOR_COLORS[c.constructor]
                                ? { borderColor: MOTOGP_CONSTRUCTOR_COLORS[c.constructor].border }
                                : { borderColor: "hsl(var(--border))" }
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
                      <TableCell className="text-center font-bold text-primary">
                        {c.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataSection>
        </TabsContent>

        <TabsContent value="highlights">
          <HighlightsSection sport="motogp" accentVar="gold" />
        </TabsContent>
      </Tabs>

      <RaceDetailsDialog
        open={!!selectedEvent}
        onOpenChange={(o) => !o && setSelectedEvent(null)}
        sport={selectedEvent?.round ? `MotoGP · Round ${selectedEvent.round}` : "MotoGP"}
        title={selectedEvent?.name ?? ""}
        subtitle={
          selectedEvent
            ? [selectedEvent.circuit, selectedEvent.location, selectedEvent.country]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        sessions={
          selectedEvent?.sessions?.length
            ? selectedEvent.sessions.map((s) => ({
                label: s.label,
                date: s.date,
                primary: s.type === "RAC",
              }))
            : selectedEvent
              ? ([
                  selectedEvent.date_start && {
                    label: "Inizio weekend",
                    date: selectedEvent.date_start,
                  },
                  selectedEvent.date_end && {
                    label: "Gara",
                    date: selectedEvent.date_end,
                    primary: true,
                  },
                ].filter(Boolean) as RaceSession[])
              : []
        }
      />
    </div>
  );
}
