import { cn } from "@/lib/utils";

interface SeasonSelectorProps {
  currentSeason: number;
  onSelect: (year: number) => void;
  minYear?: number;
}

export default function SeasonSelector({
  currentSeason,
  onSelect,
  minYear = 2026,
}: SeasonSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-heading tracking-widest uppercase text-muted-foreground mr-1">
        Stagione:
      </span>
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onSelect(year)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
            year === currentSeason
              ? "gold-gradient text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
