import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

const races = [
  { gp: "GP d'Olanda", round: 9, circuit: "TT Circuit Assen", dates: "26–28 Giu 2026", status: "prossimo" as const },
  { gp: "GP di Germania", round: 10, circuit: "Sachsenring", dates: "10–12 Lug 2026", status: "prossimo" as const },
  { gp: "GP di Gran Bretagna", round: 11, circuit: "Silverstone Circuit", dates: "07–09 Ago 2026", status: "prossimo" as const },
];

const riderStandings = [
  { pos: 1, name: "F. Bagnaia", team: "Ducati Lenovo", pts: 195 },
  { pos: 2, name: "J. Martín", team: "Aprilia Racing", pts: 182 },
  { pos: 3, name: "M. Márquez", team: "Ducati Lenovo", pts: 170 },
  { pos: 4, name: "E. Bastianini", team: "KTM", pts: 140 },
  { pos: 5, name: "P. Acosta", team: "KTM Tech3", pts: 125 },
];

const constructorStandings = [
  { pos: 1, name: "Ducati", pts: 365 },
  { pos: 2, name: "KTM", pts: 265 },
  { pos: 3, name: "Aprilia", pts: 220 },
];

const highlights = [
  { title: "Highlights GP d'Italia 2026", url: "https://www.youtube.com/watch?v=example4" },
  { title: "Highlights GP di Catalogna 2026", url: "https://www.youtube.com/watch?v=example5" },
];

export default function MotoGPPage() {
  const { seasons, setSeason } = useSeasonPreferences();

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="MotoGP" subtitle="Calendario, classifiche e highlights" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.motogp} onSelect={(y) => setSeason("motogp", y)} />
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
                  <span>PL: Ven 10:45</span>
                  <span>Pre-Qual: Ven 15:00</span>
                  <span>Qualifiche: Sab 10:50</span>
                  <span>Sprint: Sab 15:00</span>
                  <span className="col-span-2 font-semibold text-primary">Gara: Dom 14:00</span>
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
                  <TableHead className="font-heading text-xs tracking-wider uppercase hidden sm:table-cell">Team</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Punti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riderStandings.map((d) => (
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
                  <TableHead className="font-heading text-xs tracking-wider uppercase">Costruttore</TableHead>
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
          {highlights.length > 0 ? (
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
          ) : (
            <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              Highlights non disponibile
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
