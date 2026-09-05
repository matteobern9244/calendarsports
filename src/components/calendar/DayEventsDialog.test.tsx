import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CalendarItem } from "@/hooks/useCalendarEvents";
import type { RomeYMD } from "@/lib/calendarGrid";
import DayEventsDialog from "./DayEventsDialog";

const GIORNO: RomeYMD = { y: 2099, m: 5, d: 3 };

const evento = (id: string, over: Partial<CalendarItem> = {}): CalendarItem => ({
  id,
  sport: "juventus",
  date: "2099-05-03T18:45:00",
  shortLabel: `Gara ${id}`,
  context: "Serie A · Giornata 3",
  title: `Juventus - ${id}`,
  href: "/juventus",
  ...over,
});

const CINQUE = ["a", "b", "c", "d", "e"].map((id) => evento(id));

function renderDialog(
  over: Partial<{
    day: RomeYMD | null;
    events: CalendarItem[];
    isPast: (iso: string) => boolean;
  }> = {},
) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <DayEventsDialog
      day={over.day === undefined ? GIORNO : over.day}
      events={over.events ?? CINQUE}
      isPast={over.isPast ?? (() => false)}
      onSelect={onSelect}
      onClose={onClose}
    />,
  );
  return { onSelect, onClose };
}

describe("DayEventsDialog", () => {
  it("elenca tutti gli eventi del giorno, anche il quinto che la griglia nasconde", () => {
    renderDialog();
    for (const id of ["a", "b", "c", "d", "e"]) {
      expect(screen.getByRole("button", { name: new RegExp(`Gara ${id}`) })).toBeInTheDocument();
    }
  });

  it("il titolo dice di che giorno si tratta", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(/domenica 3 maggio/i);
  });

  it("scegliere un evento lo passa al chiamante", () => {
    const { onSelect } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Gara e/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("e");
  });

  it("un evento concluso lo dice, invece di affidarsi al solo barrato", () => {
    // Stessa ragione della griglia: il `line-through` non arriva a chi
    // usa uno screen reader.
    renderDialog({ events: [evento("a")], isPast: () => true });
    expect(
      screen.getByRole("button", { name: /, concluso\. Apri i dettagli$/ }),
    ).toBeInTheDocument();
  });

  it("senza giorno non mostra niente", () => {
    renderDialog({ day: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
