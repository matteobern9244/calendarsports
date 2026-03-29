import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sampleMatches = [
  { comp: "Serie A", round: "Giornata 36", opponent: "Napoli", venue: "Allianz Stadium", date: "11 Mag 2026", time: "18:00", status: "completato" as const, score: "2–1" },
  { comp: "Serie A", round: "Giornata 37", opponent: "Inter", venue: "San Siro", date: "18 Mag 2026", time: "20:45", status: "completato" as const, score: "1–1" },
  { comp: "Serie A", round: "Giornata 38", opponent: "Milan", venue: "Allianz Stadium", date: "25 Mag 2026", time: "20:45", status: "prossimo" as const },
  { comp: "Champions League", round: "Semifinale", opponent: "Barcelona", venue: "Allianz Stadium", date: "30 Apr 2026", time: "21:00", status: "completato" as const, score: "3–2" },
];

const standings = [
  { pos: 1, team: "Juventus", pts: 82, g: 37, v: 25, n: 7, p: 5 },
  { pos: 2, team: "Inter", pts: 79, g: 37, v: 24, n: 7, p: 6 },
  { pos: 3, team: "Napoli", pts: 76, g: 37, v: 23, n: 7, p: 7 },
  { pos: 4, team: "Milan", pts: 70, g: 37, v: 21, n: 7, p: 9 },
  { pos: 5, team: "Atalanta", pts: 68, g: 37, v: 20, n: 8, p: 9 },
];

export default function JuventusPage() {
  const { seasons, setSeason } = useSeasonPreferences();

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Juventus" subtitle="Calendario, risultati e classifiche" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.juventus} onSelect={(y) => setSeason("juventus", y)} />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="classifica" className="font-heading text-xs tracking-wider uppercase">Classifica</TabsTrigger>
          <TabsTrigger value="rosa" className="font-heading text-xs tracking-wider uppercase">Rosa</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {sampleMatches.map((m, i) => (
              <EventCard
                key={i}
                sport={m.comp}
                title={`Juventus vs ${m.opponent}`}
                subtitle={`${m.round} · ${m.venue}`}
                date={m.date}
                time={m.time}
                status={m.status}
              >
                {m.score && (
                  <p className="text-lg font-heading font-bold text-primary">{m.score}</p>
                )}
              </EventCard>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="classifica">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                  <TableHead className="font-heading text-xs tracking-wider uppercase">Squadra</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">G</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">V</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">N</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">P</TableHead>
                  <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((s) => (
                  <TableRow key={s.pos} className={s.team === "Juventus" ? "bg-primary/5 font-bold" : ""}>
                    <TableCell className="font-heading">{s.pos}</TableCell>
                    <TableCell className={s.team === "Juventus" ? "text-primary font-heading font-bold" : ""}>{s.team}</TableCell>
                    <TableCell className="text-center">{s.g}</TableCell>
                    <TableCell className="text-center">{s.v}</TableCell>
                    <TableCell className="text-center">{s.n}</TableCell>
                    <TableCell className="text-center">{s.p}</TableCell>
                    <TableCell className="text-center font-bold">{s.pts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rosa">
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            Rosa stagione {seasons.juventus} — Collega le API per dati reali
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
