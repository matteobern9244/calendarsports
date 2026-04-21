import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function getRomeTimezoneAbbreviation(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tz = parts.find((p) => p.type === "timeZoneName")?.value;
    if (tz === "GMT+1" || tz === "UTC+1") return "CET";
    if (tz === "GMT+2" || tz === "UTC+2") return "CEST";
    return tz || "CET";
  } catch {
    return "CET";
  }
}

interface TimezoneBadgeProps {
  className?: string;
}

export default function TimezoneBadge({ className }: TimezoneBadgeProps) {
  const tz = getRomeTimezoneAbbreviation();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--gold))]/30",
              "bg-[hsl(var(--gold))]/10 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider",
              "text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))]",
              "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/50",
              className,
            )}
            aria-label={`Tutti gli orari sono in ora italiana locale (${tz})`}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            Orari in ora italiana
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Tutti gli orari mostrati sono nel fuso Europe/Rome ({tz}).
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}