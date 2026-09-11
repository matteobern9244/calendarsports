/**
 * Dichiarazioni minime per far passare le edge function dal typecheck.
 *
 * Le edge function girano su Deno, che qui non c'e'. Senza queste
 * dichiarazioni `supabase/functions/` resterebbe fuori da `tsc -b` — ed e'
 * codice di produzione: il 15% dei file TypeScript del repository, comprese
 * tutte le funzioni che servono l'app.
 *
 * Vive fuori da `supabase/functions/` di proposito: quella cartella e'
 * esattamente cio' che Supabase impacchetta al deploy, e non ha motivo di
 * portarsi dietro un file che serve solo qui.
 *
 * **Si dichiara solo quello che si usa, e con la firma vera.** Un
 * `declare const Deno: any` farebbe passare il typecheck senza controllare
 * niente: sarebbe peggio di non averlo, perche' sembrerebbe copertura.
 */

declare namespace Deno {
  /**
   * Usata sempre nella forma con il solo handler. Il valore di ritorno non lo
   * legge nessuno, quindi non lo si descrive.
   */
  function serve(handler: (req: Request) => Response | Promise<Response>): void;

  const env: {
    /** `undefined` quando la variabile non e' impostata: e' il caso che i chiamanti devono gestire. */
    get(key: string): string | undefined;
  };
}

/**
 * `web-push` non ha tipi pubblicati e arriva da un URL che tsc non risolve.
 * Si descrivono i due metodi usati da `push-dispatcher`, con la forma della
 * subscription che quel file costruisce davvero.
 */
declare module "https://esm.sh/web-push@3.6.7" {
  interface SubscriptionLike {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    /**
     * La libreria vera risolve con un risultato di invio; qui e' dichiarata
     * `Promise<void>` perche' `deliverOnce` accetta `send: () => Promise<void>`
     * e `Promise<unknown>` non e' assegnabile a `Promise<void>`.
     *
     * E' una dichiarazione piu' stretta della realta', non una falsa: impedisce
     * di leggere un risultato che oggi nessuno legge, e non lascia passare
     * niente che sarebbe un errore. La correzione giusta sarebbe allargare
     * `send` a `() => Promise<unknown>` in `push-dispatcher/dedupe.ts` — una
     * parola — ma quel file non si tocca senza richiesta esplicita.
     */
    sendNotification(subscription: SubscriptionLike, payload?: string): Promise<void>;
  };
  export default webpush;
}
