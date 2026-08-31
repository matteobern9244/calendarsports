import { describe, expect, it } from "vitest";
import type { TvFamilyPayload } from "@/hooks/useStreamingData";
import {
  combineTvHighlights,
  overlapsPrimeWindow,
  primeWindowOverlapMinutes,
  type TvHighlight,
  type TvQueryResult,
} from "./tonightTv";

/**
 * Questi test non montano niente e non fingono `@tanstack/react-query`.
 * `TonightTvList.test.tsx` esercita la stessa logica attraverso due
 * `vi.mock` della libreria, e quei mock descrivono le nostre abitudini: uno
 * implementava `useQueries` senza `combine`, e finche' nessuno la usava
 * sembrava fedele. Qui i dati sono dati e le funzioni sono funzioni.
 */

const FAMILY_ORDER = ["rai", "mediaset", "sky-sport", "sky-cinema", "discovery"] as const;

function payload(
  family: (typeof FAMILY_ORDER)[number],
  channels: TvFamilyPayload["channels"],
): TvFamilyPayload {
  return {
    family,
    familyLabel: family.toUpperCase(),
    date: "2026-04-21",
    programsAvailable: true,
    channels,
  };
}

/** Cinque risultati nell'ordine di `STREAMING_FAMILIES`, come `useQueries`. */
function results(overrides: Partial<Record<string, TvFamilyPayload>>): TvQueryResult[] {
  return FAMILY_ORDER.map((f) => ({ data: overrides[f], isPending: false }));
}

const program = (start: string, end: string | undefined, title: string) => ({
  start,
  end,
  title,
  genre: "Film",
});

describe("combineTvHighlights", () => {
  it("legge gli orari come UTC e li riporta in ora di Roma", () => {
    // ISO "naive", senza `Z`: la policy di tutta l'app dice che vale UTC.
    // Se il client lo leggesse come ora locale, il palinsesto slitterebbe per
    // chiunque non sia in Italia.
    const { highlights } = combineTvHighlights(
      results({
        rai: payload("rai", [
          {
            id: "rai-1",
            name: "RAI 1",
            logo: null,
            number: 1,
            programs: [program("2026-04-21T19:30:00", "2026-04-21T21:25:00", "Montalbano")],
          },
        ]),
      }),
    );

    expect(highlights).toHaveLength(1);
    expect(highlights[0].time).toBe("21:30");
    expect(highlights[0].endTime).toBe("23:25");
    expect(highlights[0].durationMin).toBe(115);
  });

  it("in Home tiene solo i canali principali di RAI e Mediaset", () => {
    // La scheda Home si satura: RAI 3 e Rete 4 restano nella pagina
    // Streaming, che li mostra tutti.
    const { highlights } = combineTvHighlights(
      results({
        rai: payload("rai", [
          {
            id: "rai-1",
            name: "RAI 1",
            logo: null,
            number: 1,
            programs: [program("2026-04-21T19:30:00", "2026-04-21T21:30:00", "Tenuto")],
          },
          {
            id: "rai-3",
            name: "RAI 3",
            logo: null,
            number: 3,
            programs: [program("2026-04-21T19:30:00", "2026-04-21T21:30:00", "Scartato")],
          },
        ]),
      }),
    );

    expect(highlights.map((h) => h.title)).toEqual(["Tenuto"]);
  });

  it("ignora le famiglie che dichiarano il palinsesto non disponibile", () => {
    const { highlights } = combineTvHighlights(
      results({
        rai: {
          ...payload("rai", [
            {
              id: "rai-1",
              name: "RAI 1",
              logo: null,
              number: 1,
              programs: [program("2026-04-21T19:30:00", "2026-04-21T21:30:00", "Mai mostrato")],
            },
          ]),
          programsAvailable: false,
        },
      }),
    );

    expect(highlights).toEqual([]);
  });

  it("non inventa una durata quando la fonte non da' l'orario di fine", () => {
    // La durata mostrata resta 0 e `hasExplicitEnd` e' falso: e' onesto
    // dire "non lo sappiamo" invece di stimare un orario che la fonte non
    // ha comunicato.
    const { highlights } = combineTvHighlights(
      results({
        rai: payload("rai", [
          {
            id: "rai-1",
            name: "RAI 1",
            logo: null,
            number: 1,
            programs: [program("2026-04-21T19:30:00", undefined, "Fine ignota")],
          },
        ]),
      }),
    );

    expect(highlights[0].hasExplicitEnd).toBe(false);
    expect(highlights[0].durationMin).toBe(0);
    expect(highlights[0].endTime).toBe("");
  });

  it("normalizza il programma che scavalca la mezzanotte", () => {
    // Start 23:30, fine 01:15: senza normalizzazione la fine risulterebbe
    // *prima* dell'inizio e il confronto con la fascia di prima serata
    // avrebbe bisogno di un caso speciale.
    const { highlights } = combineTvHighlights(
      results({
        rai: payload("rai", [
          {
            id: "rai-1",
            name: "RAI 1",
            logo: null,
            number: 1,
            programs: [program("2026-04-21T21:30:00", "2026-04-21T23:15:00", "Seconda serata")],
          },
        ]),
      }),
    );

    const h = highlights[0];
    expect(h.time).toBe("23:30");
    expect(h.endTime).toBe("01:15");
    expect(h.endMinutesFromMidnight).toBeGreaterThan(h.hourRome * 60 + h.minuteRome);
    expect(h.endMinutesFromMidnight).toBe(25 * 60 + 15);
  });

  it("riporta l'attesa se anche una sola famiglia sta ancora caricando", () => {
    const parziale = results({});
    parziale[2] = { data: undefined, isPending: true };
    expect(combineTvHighlights(parziale).isPending).toBe(true);
    expect(combineTvHighlights(results({})).isPending).toBe(false);
  });
});

const highlight = (over: Partial<TvHighlight> = {}): TvHighlight => ({
  family: "rai",
  channel: "RAI 1",
  time: "21:30",
  startMs: 0,
  durationMin: 115,
  hourRome: 21,
  minuteRome: 30,
  endTime: "23:25",
  endMinutesFromMidnight: 23 * 60 + 25,
  hasExplicitEnd: true,
  title: "Un film",
  ...over,
});

describe("la fascia di prima serata è 21:00–22:59", () => {
  it("tiene chi la tocca e scarta chi comincia alle 23:00", () => {
    expect(overlapsPrimeWindow(highlight())).toBe(true);
    // Comincia alle 23:00 esatte: e' seconda serata.
    expect(
      overlapsPrimeWindow(
        highlight({ hourRome: 23, minuteRome: 0, endMinutesFromMidnight: 24 * 60 + 30 }),
      ),
    ).toBe(false);
    // Finisce alle 21:00 esatte: non copre nemmeno un minuto della fascia.
    expect(
      overlapsPrimeWindow(
        highlight({ hourRome: 19, minuteRome: 0, endMinutesFromMidnight: 21 * 60 }),
      ),
    ).toBe(false);
  });

  it("è più indulgente quando la fine non è nota", () => {
    // Senza orario di fine basta che cominci prima delle 23:00: nasconderlo
    // punirebbe l'utente per una lacuna della fonte.
    expect(
      overlapsPrimeWindow(highlight({ hasExplicitEnd: false, hourRome: 22, minuteRome: 50 })),
    ).toBe(true);
    expect(
      overlapsPrimeWindow(highlight({ hasExplicitEnd: false, hourRome: 23, minuteRome: 10 })),
    ).toBe(false);
  });

  it("conta solo i minuti dentro la fascia, non la durata totale", () => {
    // Un film 21:30–23:25 copre 21:30–23:00, cioè 90 minuti, non 115.
    expect(primeWindowOverlapMinutes(highlight())).toBe(90);
    // Un programma tutto fuori fascia copre zero.
    expect(
      primeWindowOverlapMinutes(
        highlight({ hourRome: 18, minuteRome: 0, endMinutesFromMidnight: 19 * 60 }),
      ),
    ).toBe(0);
    // Uno che la contiene tutta copre i suoi 120 minuti pieni.
    expect(
      primeWindowOverlapMinutes(
        highlight({ hourRome: 20, minuteRome: 0, endMinutesFromMidnight: 24 * 60 }),
      ),
    ).toBe(120);
  });
});
