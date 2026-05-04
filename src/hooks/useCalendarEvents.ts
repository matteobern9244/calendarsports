import { useQuery } from "@tanstack/react-query";
import {
  f1Api,
  footballApi,
  motogpApi,
} from "@/lib/api/sportsApi";
import {
  getCurrentF1Season,
  getCurrentJuventusSeason,
  getCurrentMotoGPSeason,
} from "@/lib/currentSeason";
import { toRomeDate } from "@/lib/dateUtils";

/**
 * Tipo unificato che alimenta la vista mese del calendario
 * (`/calendario`). Ogni `CalendarItem` rappresenta UNA sessione/partita
 * (non un weekend intero). Le date sono ISO normalizzate "naive=UTC"
 * via `toRomeDate`, l'orario in UI viene formattato in `Europe/Rome`.
 */
export type CalendarSport = "juventus" | "f1" | "motogp";

export interface CalendarItem {
  id: string;
  sport: CalendarSport;
  /** ISO datetime (UTC). Usa `toRomeDate` per convertirlo. */
  date: string;
  /** Etichetta breve della sessione, es. "Qualifiche", "Gara", "vs Inter". */
  shortLabel: string;
  /** Contesto (GP, giornata, ecc.), es. "Gran Premio del Canada". */
  context: string;
  /** Titolo completo per la cella e il dialog. */
  title: string;
  /** Path di destinazione al click (pagina sport). */
  href: string;
  /** Optional: broadcaster (Juventus). */
  broadcaster?: string;
}

const SHORT_GP = (gpName: string): string => {
  // "Gran Premio del Canada" -> "Canada"
  return gpName
    .replace(/^Gran Premio (del|di|della|delle|d'|dell'|degli|della)\s+/i, "")
    .replace(/^GP\s+(del|di|della|delle|d'|dell'|degli)\s+/i, "")
    .replace(/^GP\s+/i, "")
    .trim();
};

/** F1 calendar (Jolpica) -> CalendarItem[] espanso per sessioni. */
function expandF1(rounds: unknown[] | undefined): CalendarItem[] {
  if (!Array.isArray(rounds)) return [];
  const out: CalendarItem[] = [];
  for (const r of rounds as Array<Record<string, unknown>>) {
    const round = Number(r.round) || 0;
    const raceName = String(r.raceName ?? "");
    const context = `Gran Premio ${raceName.replace(/Grand Prix/i, "").trim()}`.trim() || raceName;
    const shortContext = SHORT_GP(raceName) || raceName;
    const baseId = `f1-${round}`;

    type Sess = { time?: string; date?: string };
    const sessions: Array<{ key: string; label: string; sess: Sess | null }> = [
      { key: "fp1", label: "Prove libere 1", sess: r.firstPractice as Sess | null },
      { key: "fp2", label: "Prove libere 2", sess: r.secondPractice as Sess | null },
      { key: "fp3", label: "Prove libere 3", sess: r.thirdPractice as Sess | null },
      { key: "spr-q", label: "Qualifiche Sprint", sess: (r.sprintQualifying ?? null) as Sess | null },
      { key: "spr", label: "Sprint", sess: r.sprint as Sess | null },
      { key: "qua", label: "Qualifiche", sess: r.qualifying as Sess | null },
    ];

    for (const s of sessions) {
      if (!s.sess || !s.sess.date) continue;
      const iso = s.sess.time
        ? `${s.sess.date}T${s.sess.time.replace(/Z$/i, "")}Z`
        : `${s.sess.date}T00:00:00Z`;
      out.push({
        id: `${baseId}-${s.key}`,
        sport: "f1",
        date: iso,
        shortLabel: s.label,
        context: shortContext,
        title: `F1: ${s.label} (${context})`,
        href: "/formula1",
      });
    }

    // Gara
    const raceDate = String(r.date ?? "");
    if (raceDate) {
      const time = String(r.time ?? "") || "00:00:00Z";
      const iso = `${raceDate}T${time.replace(/Z$/i, "")}Z`;
      out.push({
        id: `${baseId}-race`,
        sport: "f1",
        date: iso,
        shortLabel: "Gara",
        context: shortContext,
        title: `F1: Gara (${context})`,
        href: "/formula1",
      });
    }
  }
  return out;
}

/** MotoGP calendar (Pulselive) -> CalendarItem[] dalle `sessions`. */
function expandMotoGP(rounds: unknown[] | undefined): CalendarItem[] {
  if (!Array.isArray(rounds)) return [];
  const out: CalendarItem[] = [];
  for (const r of rounds as Array<Record<string, unknown>>) {
    const round = Number(r.round) || 0;
    const name = String(r.name ?? "");
    const shortContext = SHORT_GP(name) || name;
    const baseId = `motogp-${round}`;
    const sessions = Array.isArray(r.sessions) ? (r.sessions as Array<Record<string, unknown>>) : [];

    if (sessions.length > 0) {
      for (const s of sessions) {
        const date = String(s.date ?? "");
        if (!date) continue;
        const label = String(s.label ?? s.type ?? "");
        const type = String(s.type ?? "");
        const num = s.number == null ? "" : String(s.number);
        out.push({
          id: `${baseId}-${type}${num}`,
          sport: "motogp",
          date,
          shortLabel: label,
          context: shortContext,
          title: `MotoGP: ${label} (${name})`,
          href: "/motogp",
        });
      }
    } else {
      // Fallback graceful: solo evento weekend (gara la domenica = date_end)
      const dateEnd = String(r.date_end ?? "");
      if (dateEnd) {
        out.push({
          id: `${baseId}-race`,
          sport: "motogp",
          date: `${dateEnd}T13:00:00Z`,
          shortLabel: "Gara",
          context: shortContext,
          title: `MotoGP: Gara (${name})`,
          href: "/motogp",
        });
      }
    }
  }
  return out;
}

/** Juventus calendar (Sky/Lega Serie A) -> CalendarItem[] (1 per partita). */
function expandJuventus(items: unknown[] | undefined): CalendarItem[] {
  if (!Array.isArray(items)) return [];
  const out: CalendarItem[] = [];
  for (const m of items as Array<Record<string, unknown>>) {
    const date = String(m.date ?? "");
    if (!date) continue;
    const home = String(m.homeTeam ?? "");
    const away = String(m.awayTeam ?? "");
    const competition = String(m.competition ?? "Serie A");
    const matchday = m.matchday;
    const id = String(m.id ?? `${home}-${away}-${date}`);
    const isHome = /juventus/i.test(home);
    const opponent = isHome ? away : home;
    const ctxNum = matchday != null ? `Giornata ${matchday}` : "";
    out.push({
      id: `juve-${id}`,
      sport: "juventus",
      date,
      shortLabel: `${isHome ? "vs" : "@"} ${opponent}`,
      context: [competition, ctxNum].filter(Boolean).join(" · "),
      title: `${home} - ${away}`,
      href: `/juventus/partite/${encodeURIComponent(id)}`,
      broadcaster: m.broadcaster ? String(m.broadcaster) : undefined,
    });
  }
  return out;
}

/**
 * Hook unico per la pagina /calendario. Usa le stesse query keys delle
 * pagine sport: ogni "Sincronizza" globale (`useSyncAll`) aggiorna
 * automaticamente queste cache. Per Juventus carichiamo TUTTE le pagine
 * della stagione corrente (~25) in parallelo.
 */
export function useCalendarEvents() {
  const seasonF1 = getCurrentF1Season();
  const seasonJ = getCurrentJuventusSeason();
  const seasonM = getCurrentMotoGPSeason();

  const f1 = useQuery({
    queryKey: ["f1", "calendar", seasonF1],
    queryFn: () => f1Api.getCalendar(seasonF1),
    staleTime: 5 * 60 * 1000,
  });

  const motogp = useQuery({
    queryKey: ["motogp", "calendar", seasonM],
    queryFn: () => motogpApi.getCalendar(seasonM),
    staleTime: 5 * 60 * 1000,
  });

  // Juventus: pagina 1 per scoprire totalPages; poi tutte le pagine
  const juveFirst = useQuery({
    queryKey: ["juventus", "calendar", seasonJ, 1, 12],
    queryFn: () => footballApi.getCalendar(seasonJ, 1, 12),
    staleTime: 5 * 60 * 1000,
  });

  const totalPages = (juveFirst.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const cap = Math.min(totalPages, 30);

  const juveAll = useQuery({
    queryKey: ["juventus", "calendar-all", seasonJ, cap],
    enabled: !!juveFirst.data,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const first = juveFirst.data as { items?: unknown[] } | undefined;
      const items: unknown[] = Array.isArray(first?.items) ? [...first.items] : [];
      if (cap > 1) {
        const rest = await Promise.allSettled(
          Array.from({ length: cap - 1 }, (_, i) => i + 2).map((p) =>
            footballApi.getCalendar(seasonJ, p, 12) as Promise<{ items?: unknown[] }>,
          ),
        );
        for (const r of rest) {
          if (r.status === "fulfilled" && Array.isArray(r.value?.items)) {
            items.push(...r.value.items);
          }
        }
      }
      return items;
    },
  });

  const events: CalendarItem[] = [
    ...expandF1(f1.data as unknown[] | undefined),
    ...expandMotoGP(motogp.data as unknown[] | undefined),
    ...expandJuventus((juveAll.data as unknown[] | undefined) ?? (juveFirst.data as { items?: unknown[] } | undefined)?.items),
  ]
    .filter((e) => toRomeDate(e.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    events,
    isLoading: f1.isLoading || motogp.isLoading || juveFirst.isLoading || juveAll.isLoading,
    isError: !!(f1.error && motogp.error && juveFirst.error),
    refetchAll: () => {
      f1.refetch();
      motogp.refetch();
      juveFirst.refetch();
      juveAll.refetch();
    },
  };
}