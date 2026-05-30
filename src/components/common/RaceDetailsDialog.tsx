import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin } from "lucide-react";
import { toRomeDate } from "@/lib/dateUtils";

export interface RaceSession {
  /** Etichetta italiana (es. "Prove libere 1", "Qualifiche", "Sprint", "Gara") */
  label: string;
  /** ISO datetime — può essere "naive" (sarà trattato come UTC) o con offset */
  date: string;
  /** Evidenzia la sessione principale (es. la gara) */
  primary?: boolean;
}

interface RaceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  sport: string;
  sessions: RaceSession[];
}

const DAY_FMT = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome",
});
const TIME_FMT = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});
const DAY_KEY_FMT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Rome",
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function RaceDetailsDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  sport,
  sessions,
}: RaceDetailsDialogProps) {
  // Normalizza + ordina cronologicamente in fuso Roma
  const parsed = sessions
    .map((s) => {
      const d = toRomeDate(s.date);
      return d ? { ...s, parsed: d } : null;
    })
    .filter((s): s is RaceSession & { parsed: Date } => s !== null)
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());

  // Raggruppa per giorno (in fuso Roma)
  const groups = new Map<string, { label: string; items: typeof parsed }>();
  for (const s of parsed) {
    const key = DAY_KEY_FMT.format(s.parsed);
    const label = capitalize(DAY_FMT.format(s.parsed));
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(s);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl gap-0 p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 bg-gradient-to-br from-card to-muted/40 px-5 py-4 sm:px-6 sm:py-5">
          <span className="text-[10px] font-heading font-bold tracking-[0.2em] uppercase text-primary">
            {sport}
          </span>
          <DialogTitle className="font-heading text-xl sm:text-2xl leading-tight text-foreground">
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{subtitle}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] sm:max-h-[65vh]">
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            {groups.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                Orari delle sessioni non ancora disponibili.
              </p>
            ) : (
              <ol className="space-y-5">
                {Array.from(groups.entries()).map(([key, group]) => (
                  <li key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <h4 className="font-heading text-xs tracking-wider uppercase text-primary">
                        {group.label}
                      </h4>
                    </div>
                    <ul className="space-y-1.5">
                      {group.items.map((s, idx) => (
                        <li
                          key={`${key}-${idx}`}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                            s.primary
                              ? "border-[hsl(var(--gold))]/60 bg-[hsl(var(--gold))]/5"
                              : "border-border/60 bg-muted/30"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              s.primary
                                ? "font-heading font-bold uppercase tracking-wider text-foreground"
                                : "font-medium text-foreground"
                            }`}
                          >
                            {s.label}
                          </span>
                          <span
                            className={`flex items-center gap-1.5 text-sm tabular-nums whitespace-nowrap ${
                              s.primary ? "text-primary font-bold" : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {TIME_FMT.format(s.parsed)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-5 text-[11px] text-muted-foreground">
              Tutti gli orari sono indicati nel fuso italiano (Europe/Rome).
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}