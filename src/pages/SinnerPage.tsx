import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sampleMatches = [
  { tournament: "Australian Open", round: "Finale", opponent: "N. Djokovic", date: "26 Gen 2026", time: "09:30", status: "completato" as const, score: "6-3 7-6 6-4" },
  { tournament: "ATP Rotterdam", round: "Semifinale", opponent: "C. Alcaraz", date: "15 Feb 2026", time: "15:00", status: "completato" as const, score: "7-5 6-7 7-6" },
  { tournament: "ATP Indian Wells", round: "Quarti", opponent: "D. Medvedev", date: "14 Mar 2026", time: "21:00", status: "completato" as const, score: "6-4 6-3" },
  { tournament: "ATP Wimbledon", round: "3° Turno", opponent: "A. de Minaur", date: "02 Lug 2026", time: "14:30", status: "prossimo" as const },
];

export default function SinnerPage() {
  const { seasons, setSeason } = useSeasonPreferences();

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Jannik Sinner" subtitle="Tutti i match della stagione" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.sinner} onSelect={(y) => setSeason("sinner", y)} />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="tornei" className="font-heading text-xs tracking-wider uppercase">Tornei</TabsTrigger>
          <TabsTrigger value="risultati" className="font-heading text-xs tracking-wider uppercase">Risultati</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {sampleMatches.map((m, i) => (
              <EventCard
                key={i}
                sport={m.tournament}
                title={`vs. ${m.opponent}`}
                subtitle={m.round}
                date={m.date}
                time={m.time}
                status={m.status}
              >
                {m.score && (
                  <p className="text-sm font-heading font-bold text-primary">{m.score}</p>
                )}
              </EventCard>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="tornei">
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            Lista tornei stagione {seasons.sinner} — Collega le API per dati reali
          </div>
        </TabsContent>

        <TabsContent value="risultati">
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            Risultati dettagliati stagione {seasons.sinner} — Collega le API per dati reali
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
