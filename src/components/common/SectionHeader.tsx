import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase">
        <span className="text-gold-gradient">{title}</span>
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-3 h-1 w-16 rounded-full gold-gradient" />
    </motion.div>
  );
}
