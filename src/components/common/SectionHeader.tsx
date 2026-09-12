import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Stemma mostrato accanto al titolo, per le pagine che rappresentano una
   * squadra sola.
   *
   * E' un **fratello** dell'`h1`, mai un figlio: dentro l'intestazione
   * entrerebbe nel suo nome accessibile, e «Napoli» diventerebbe «NA Napoli»
   * quando lo stemma ripiega sulle iniziali.
   *
   * Quando la prop manca il markup resta quello di prima, riga per riga: qui
   * passano sette pagine, e una di loro (`StreamingPage`) allinea questo
   * blocco con `sm:items-end` su un contenitore esterno.
   */
  crest?: ReactNode;
}

export default function SectionHeader({ title, subtitle, crest }: SectionHeaderProps) {
  const intestazione = (
    <>
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase">
        <span className="text-gold-gradient">{title}</span>
      </h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 h-1 w-16 rounded-full gold-gradient" />
    </>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      {crest ? (
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="mt-0.5 shrink-0 sm:mt-1">{crest}</span>
          <div className="min-w-0">{intestazione}</div>
        </div>
      ) : (
        intestazione
      )}
    </motion.div>
  );
}
