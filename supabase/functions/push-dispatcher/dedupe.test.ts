import { describe, expect, it, vi } from "vitest";
import {
  claimSendSlot,
  deliverOnce,
  releaseSendSlot,
  type SendSlot,
  type SentLogStore,
} from "./dedupe.ts";

const SLOT: SendSlot = {
  subscriptionId: "11111111-1111-1111-1111-111111111111",
  eventId: "f1-14-race",
  leadTime: 60,
};

/**
 * Store finto che simula il vincolo UNIQUE di `push_sent_log`: il primo a
 * scrivere una terna la ottiene, chi arriva dopo riceve zero righe. E'
 * esattamente cio' che fa `INSERT ... ON CONFLICT DO NOTHING RETURNING id`,
 * ed e' la ragione per cui il dedupe puo' essere atomico.
 */
function fakeStore(): SentLogStore & { taken: Set<string>; calls: string[] } {
  const taken = new Set<string>();
  const calls: string[] = [];
  const key = (s: SendSlot) => `${s.subscriptionId}|${s.eventId}|${s.leadTime}`;
  return {
    taken,
    calls,
    async insertIgnoringDuplicates(slot) {
      calls.push("insert");
      if (taken.has(key(slot))) return { rows: [], error: null };
      taken.add(key(slot));
      return { rows: [{ id: key(slot) }], error: null };
    },
    async remove(slot) {
      calls.push("remove");
      taken.delete(key(slot));
      return { error: null };
    },
  };
}

describe("claimSendSlot", () => {
  it("assegna il posto a chi scrive per primo e lo nega a chi arriva dopo", async () => {
    const store = fakeStore();

    expect(await claimSendSlot(store, SLOT)).toBe("claimed");
    expect(await claimSendSlot(store, SLOT)).toBe("already-taken");
  });

  it("tratta due terne diverse come posti diversi", async () => {
    const store = fakeStore();

    expect(await claimSendSlot(store, SLOT)).toBe("claimed");
    expect(await claimSendSlot(store, { ...SLOT, leadTime: 1440 })).toBe("claimed");
    expect(await claimSendSlot(store, { ...SLOT, eventId: "f1-14-qua" })).toBe("claimed");
  });

  it("distingue un errore di scrittura da un posto gia' occupato", async () => {
    const store: SentLogStore = {
      insertIgnoringDuplicates: async () => ({ rows: null, error: new Error("connessione persa") }),
      remove: async () => ({ error: null }),
    };

    expect(await claimSendSlot(store, SLOT)).toBe("error");
  });
});

describe("releaseSendSlot", () => {
  it("libera il posto, cosi' il giro successivo puo' riprovare", async () => {
    const store = fakeStore();

    await claimSendSlot(store, SLOT);
    await releaseSendSlot(store, SLOT);

    expect(await claimSendSlot(store, SLOT)).toBe("claimed");
  });
});

describe("deliverOnce", () => {
  it("scrive PRIMA di inviare: e' l'inversione che rende il dedupe atomico", async () => {
    const store = fakeStore();
    const order: string[] = [];
    const send = vi.fn(async () => {
      order.push("send");
    });
    const wrapped = async () => {
      order.push(store.calls.at(-1) === "insert" ? "insert-gia-fatto" : "insert-mancante");
      await send();
    };

    await deliverOnce(store, SLOT, wrapped);

    expect(order).toEqual(["insert-gia-fatto", "send"]);
  });

  it("invia una volta sola quando due giri concorrenti trovano lo stesso evento", async () => {
    const store = fakeStore();
    const send = vi.fn(async () => {});

    const [first, second] = await Promise.all([
      deliverOnce(store, SLOT, send),
      deliverOnce(store, SLOT, send),
    ]);

    expect(send).toHaveBeenCalledTimes(1);
    expect([first, second].sort()).toEqual(["sent", "skipped"]);
  });

  it("restituisce il posto quando l'invio fallisce, e rilancia l'errore", async () => {
    const store = fakeStore();
    const boom = Object.assign(new Error("push gateway 500"), { statusCode: 500 });

    await expect(
      deliverOnce(store, SLOT, async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);

    // Il posto e' tornato libero: la notifica non e' partita, quindi il giro
    // successivo deve poterla mandare invece di saltarla per sempre.
    expect(await claimSendSlot(store, SLOT)).toBe("claimed");
  });

  it("non invia e segnala il guasto quando non riesce nemmeno a prendere il posto", async () => {
    const store: SentLogStore = {
      insertIgnoringDuplicates: async () => ({ rows: null, error: new Error("giu'") }),
      remove: async () => ({ error: null }),
    };
    const send = vi.fn(async () => {});

    expect(await deliverOnce(store, SLOT, send)).toBe("claim-failed");
    expect(send).not.toHaveBeenCalled();
  });
});
