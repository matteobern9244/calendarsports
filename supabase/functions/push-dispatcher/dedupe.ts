/**
 * Dedupe delle notifiche push.
 *
 * Il dispatcher gira ogni cinque minuti e la sua finestra di invio e' larga
 * sei: due giri consecutivi vedono lo stesso evento. Finche' il controllo era
 * «SELECT, poi invia, poi INSERT» quella sovrapposizione bastava a mandare la
 * stessa notifica due volte, perche' fra la lettura e la scrittura c'e' un
 * intervallo in cui un secondo giro legge «non ancora inviata».
 *
 * Il vincolo `UNIQUE (subscription_id, event_id, lead_time)` su
 * `push_sent_log` esiste dalla prima migration e avrebbe fatto fallire il
 * secondo INSERT — ma dopo l'invio, cioe' troppo tardi. Qui l'ordine e'
 * invertito: si scrive prima, e la scrittura *e'* il controllo.
 *
 * Questo modulo non importa niente e all'import non fa niente: e' importabile
 * da un test senza far partire `Deno.serve`.
 */

export type SendSlot = {
  subscriptionId: string;
  eventId: string;
  leadTime: number;
};

export type ClaimResult = "claimed" | "already-taken" | "error";

/**
 * Il minimo del client Supabase che serve al dedupe. Dichiararlo qui, invece
 * di accettare il client intero, e' cio' che rende testabile la logica: il
 * test passa una tabella finta che simula il vincolo UNIQUE.
 */
export interface SentLogStore {
  /**
   * Inserisce la riga ignorando i duplicati e restituisce **solo le righe
   * scritte davvero**. Zero righe significa che qualcun altro ha gia' il
   * posto; `error` valorizzato significa che non lo sappiamo.
   */
  insertIgnoringDuplicates(slot: SendSlot): Promise<{ rows: unknown[] | null; error: unknown }>;
  /** Cancella la riga, per restituire il posto quando l'invio fallisce. */
  remove(slot: SendSlot): Promise<{ error: unknown }>;
}

/**
 * Prende il posto per una notifica. Atomico: il vincolo UNIQUE decide, non noi.
 *
 * Un errore di scrittura non e' un posto occupato, ed e' importante non
 * confonderli: davanti a un guasto si rinuncia a inviare, invece di inviare
 * "per sicurezza" e rischiare il doppione che stiamo cercando di evitare.
 */
export async function claimSendSlot(store: SentLogStore, slot: SendSlot): Promise<ClaimResult> {
  const { rows, error } = await store.insertIgnoringDuplicates(slot);
  if (error) return "error";
  return (rows?.length ?? 0) > 0 ? "claimed" : "already-taken";
}

/**
 * Restituisce il posto. Serve quando l'invio fallisce: la riga in
 * `push_sent_log` dichiara «questa notifica e' stata mandata», e se non lo e'
 * stata quella riga la nasconderebbe per sempre.
 */
export async function releaseSendSlot(store: SentLogStore, slot: SendSlot): Promise<void> {
  await store.remove(slot);
}

export type DeliveryOutcome = "sent" | "skipped" | "claim-failed";

/**
 * Invia al piu' una volta: prenota, invia, e in caso di guasto restituisce la
 * prenotazione.
 *
 * L'errore di `send` viene rilanciato dopo il rilascio, perche' solo il
 * chiamante sa distinguere un 404/410 — endpoint push morto, la subscription
 * va disattivata — da un guasto passeggero.
 */
export async function deliverOnce(
  store: SentLogStore,
  slot: SendSlot,
  send: () => Promise<void>,
): Promise<DeliveryOutcome> {
  const claim = await claimSendSlot(store, slot);
  if (claim === "already-taken") return "skipped";
  if (claim === "error") return "claim-failed";

  try {
    await send();
    return "sent";
  } catch (e) {
    await releaseSendSlot(store, slot);
    throw e;
  }
}

/** Il sottoinsieme di supabase-js su cui poggia lo store. */
interface SupabaseLike {
  from(table: string): {
    upsert(
      values: Record<string, unknown>,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ): { select(columns: string): PromiseLike<{ data: unknown[] | null; error: unknown }> };
    delete(): {
      eq(
        column: string,
        value: unknown,
      ): {
        eq(
          column: string,
          value: unknown,
        ): {
          eq(column: string, value: unknown): PromiseLike<{ error: unknown }>;
        };
      };
    };
  };
}

const TABLE = "push_sent_log";
const CONFLICT_TARGET = "subscription_id,event_id,lead_time";

/**
 * Lo store vero, sopra `push_sent_log`.
 *
 * `ignoreDuplicates: true` fa emettere a supabase-js un
 * `INSERT ... ON CONFLICT DO NOTHING`, e il `.select()` successivo restituisce
 * le sole righe effettivamente inserite: e' li' che sta l'atomicita'.
 */
export function supabaseSentLogStore(sb: SupabaseLike): SentLogStore {
  const row = (slot: SendSlot) => ({
    subscription_id: slot.subscriptionId,
    event_id: slot.eventId,
    lead_time: slot.leadTime,
  });

  return {
    async insertIgnoringDuplicates(slot) {
      const { data, error } = await sb
        .from(TABLE)
        .upsert(row(slot), { onConflict: CONFLICT_TARGET, ignoreDuplicates: true })
        .select("id");
      return { rows: data, error };
    },
    async remove(slot) {
      return await sb
        .from(TABLE)
        .delete()
        .eq("subscription_id", slot.subscriptionId)
        .eq("event_id", slot.eventId)
        .eq("lead_time", slot.leadTime);
    },
  };
}
