import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader
        title="Prossimi Eventi"
        subtitle="Segui gli eventi sportivi più importanti in tempo reale"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2"
      >
        {/* Sinner */}
        <EventCard
          sport="Tennis · Jannik Sinner"
          title="ATP Wimbledon 2026"
          subtitle="3° Turno vs. A. de Minaur"
          date="02 Lug 2026"
          time="14:30"
          status="prossimo"
        >
          <p className="text-xs text-muted-foreground">
            Centre Court · Londra, Regno Unito
          </p>
        </EventCard>

        {/* Juventus */}
        <EventCard
          sport="Calcio · Juventus"
          title="Juventus vs Milan"
          subtitle="Serie A · Giornata 38"
          date="25 Mag 2026"
          time="20:45"
          status="prossimo"
        >
          <p className="text-xs text-muted-foreground">
            Allianz Stadium · Torino
          </p>
        </EventCard>

        {/* Formula 1 */}
        <EventCard
          sport="Formula 1"
          title="GP di Silverstone"
          subtitle="Round 12 · Campionato Mondiale 2026"
          date="03–05 Lug 2026"
          status="prossimo"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Sessioni del weekend:</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Prove Libere 1: Ven 13:30</span>
              <span>Prove Libere 2: Ven 17:00</span>
              <span>Prove Libere 3: Sab 12:30</span>
              <span>Qualifiche: Sab 16:00</span>
              <span className="col-span-2 font-semibold text-primary">Gara: Dom 15:00</span>
            </div>
          </div>
        </EventCard>

        {/* MotoGP */}
        <EventCard
          sport="MotoGP"
          title="GP d'Olanda"
          subtitle="Round 9 · Campionato Mondiale 2026"
          date="26–28 Giu 2026"
          status="prossimo"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Sessioni del weekend:</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Prove Libere: Ven 10:45</span>
              <span>Pre-Qualifiche: Ven 15:00</span>
              <span>Qualifiche: Sab 10:50</span>
              <span>Sprint Race: Sab 15:00</span>
              <span className="col-span-2 font-semibold text-primary">Gara: Dom 14:00</span>
            </div>
          </div>
        </EventCard>
      </motion.div>

      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          ⚡ I dati mostrati sono esempi strutturali. Collega le API reali per i dati aggiornati in tempo reale.
        </p>
      </div>
    </div>
  );
}
