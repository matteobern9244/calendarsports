import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

const races = [
  { gp: "GP di Silverstone", round: 12, circuit: "Silverstone Circuit", dates: "03–05 Lug 2026", status: "prossimo" as const },
  { gp: "GP del Belgio", round: 13, circuit: "Spa-Francorchamps", dates: "24–26 Lug 2026", status: "prossimo" as const },
  { gp: "GP d'Ungheria", round: 14, circuit: "Hungaroring", dates: "31 Lug–02 Ago 2026", status: "prossimo" as const },
];

const driverStandings = [
  { pos: 1, name: "M. Verstappen", team: "Red Bull Racing", pts: 218 },
  { pos: 2, name: "L. Hamilton", team: "Ferrari", pts: 195 },
  { pos: 3, name: "C. Leclerc", team: "Ferrari", pts: 178 },
  { pos: 4, name: "L. Norris", team: "McLaren", pts: 162 },
  { pos: 5, name: "O. Piastri", team: "McLaren", pts: 145 },
];

const constructorStandings = [
  { pos: 1, name: "Ferrari", pts: 373 },
  { pos: 2, name: "McLaren", pts: 307 },
  { pos: 3, name: "Red Bull Racing", pts: 295 },
];

const highlights = [
  { title: "Highlights GP di Spagna 2026", url: "https://www.youtube.com/watch?v=example1" },
  { title: "Highlights GP di Monaco 2026", url: "https://www.youtube.com/watch?v=example2" },
  { title: "Highlights GP del Canada 2026", url: "https://www.youtube.com/watch?v=example3" },
];

export default function Formula1Page() {
  const { seasons, setSeason } = useSeasonPreferences();

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Formula 1" subtitle="Calendario, classifiche e highlights" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.f1} onSelect={(y) => setSeason("f1", y)} />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="piloti" className="font-heading text-xs tracking-wider uppercase">Classifica Piloti</TabsTrigger>
          <TabsTrigger value="costruttori" className="font-heading text-xs tracking-wider uppercase">Costruttori</TabsTrigger>
          <TabsTrigger value="highlights" className="font-heading text-xs tracking-wider uppercase">Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {races.map((r, i) => (
              <EventCard key={i} sport={`Round ${r.round}`} title={r.gp} subtitle={r.circuit} date={r.dates} status={r.status}>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>PL1: Ven 13:30</span>
                  <span>PL2: Ven 17:00</span>
                  <span>PL3: Sab 12:30</span>
                  <span>Qualifiche: Sab 16:00</span>
                  <span className="col-span-2 font-semibold text-primary">Gara: Dom 15:00</span>
                </div>
              </EventCard>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="piloti">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase">Pilota</TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase hidden sm:table-cell">Scuderia</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverStandings.map((d) => (
                  <TableRow key={d.pos}>
                    <TableCell className="font-heading font-bold">{d.pos}</TableCell>
                    <TableCell className="font-semibold">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{d.team}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{d.pts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="costruttori">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase">Scuderia</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {constructorStandings.map((c) => (
                  <TableRow key={c.pos}>
                    <TableCell className="font-heading font-bold">{c.pos}</TableCell>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{c.pts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="highlights">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h, i) => (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">{h.title}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
