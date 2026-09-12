import type { Page } from "@playwright/test";

/**
 * Il profilo che il finto backend restituisce. Rispecchia le colonne vere,
 * `PROFILE_COLUMNS` compreso: un campo mancante qui arriverebbe `undefined`
 * all'app, che e' esattamente il guasto che il guardiano in
 * `useProfile.test.tsx` esiste per impedire.
 */
export interface ProfiloFinto {
  id: string;
  display_name: string | null;
  theme: "light" | "dark";
  favorite_team: string;
  show_sinner: boolean;
  show_f1: boolean;
  show_motogp: boolean;
  show_home: boolean;
  show_calendario: boolean;
  show_streaming: boolean;
  show_squadra: boolean;
  start_page: string;
}

const UTENTE_ID = "00000000-0000-4000-8000-000000000001";

export const PROFILO_PREDEFINITO: ProfiloFinto = {
  id: UTENTE_ID,
  display_name: null,
  theme: "dark",
  favorite_team: "juventus",
  show_sinner: true,
  show_f1: true,
  show_motogp: true,
  show_home: true,
  show_calendario: true,
  show_streaming: true,
  show_squadra: true,
  start_page: "home",
};

/**
 * La chiave con cui supabase-js conserva la sessione.
 *
 * La compone da sola dall'indirizzo del progetto — `sb-<primo pezzo
 * dell'host>-auth-token` — e in queste prove l'indirizzo e'
 * `http://127.0.0.1:54321`, quindi «127». Sta scritta qui invece che
 * indovinata a runtime perche' se cambiasse, questo e' il punto in cui
 * vogliamo accorgercene: i test che dipendono dall'accesso fallirebbero
 * subito e a voce alta, invece di passare raccontando di un utente che non
 * c'e'.
 */
const CHIAVE_SESSIONE = "sb-127-auth-token";

/**
 * Fa credere all'applicazione che l'utente abbia effettuato l'accesso.
 *
 * Serve perche' il vero Supabase non gira durante le prove: senza questa
 * impalcatura tutto cio' che richiede una sessione — le preferenze, la pagina
 * iniziale, il pannello — resterebbe fuori dalla portata delle e2e, e
 * l'unica verifica possibile sarebbe quella dei test unitari, che non hanno
 * un browser.
 *
 * Va chiamata **prima** di `page.goto`: la sessione si scrive con
 * `addInitScript`, cioe' prima che l'applicazione parta e legga
 * `localStorage`.
 */
export async function accediComeUtente(page: Page, profilo: Partial<ProfiloFinto> = {}) {
  const riga = { ...PROFILO_PREDEFINITO, ...profilo };

  await page.addInitScript(
    ([chiave, id]) => {
      const fraUnOra = Math.floor(Date.now() / 1000) + 3600;
      /*
        Un JWT vero, non una stringa qualunque: supabase-js **decodifica** il
        token per leggerne la scadenza, e uno che non si decodifica fa buttare
        via la sessione appena scritta — in silenzio, lasciando il test a
        chiedersi perche' l'utente non risulti mai entrato. La firma invece non
        la verifica nessuno lato client, quindi puo' essere finta.
      */
      const base64url = (oggetto: unknown) =>
        btoa(JSON.stringify(oggetto)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const token = [
        base64url({ alg: "HS256", typ: "JWT" }),
        base64url({
          sub: id,
          aud: "authenticated",
          role: "authenticated",
          email: "prova@example.com",
          iat: Math.floor(Date.now() / 1000),
          exp: fraUnOra,
        }),
        "firma-non-verificata-dal-client",
      ].join(".");
      /*
        Il segno «migrazione gia' fatta». Al primo accesso `UserPrefsContext`
        copia le preferenze del dispositivo sul profilo: con un `localStorage`
        vuoto copierebbe i **default**, cancellando la squadra e le sezioni
        che questa impalcatura ha appena preparato. Un test scritto su un
        profilo su misura si ritroverebbe cosi' quello predefinito, senza
        capire perche'.
      */
      window.localStorage.setItem(`cse-profile-migrated:${id}`, "1");
      window.localStorage.setItem(
        chiave,
        JSON.stringify({
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: fraUnOra,
          refresh_token: "refresh-di-prova",
          user: {
            id,
            aud: "authenticated",
            role: "authenticated",
            email: "prova@example.com",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      );
    },
    [CHIAVE_SESSIONE, riga.id] as const,
  );

  // La lettura e la scrittura del profilo. Il PATCH restituisce la riga
  // aggiornata come farebbe PostgREST, cosi' l'anticipo ottimistico trova una
  // risposta autorevole e non torna indietro.
  let corrente = riga;
  await page.route("**/rest/v1/profiles*", async (route) => {
    const richiesta = route.request();
    if (richiesta.method() === "PATCH") {
      const modifiche = JSON.parse(richiesta.postData() ?? "{}") as Partial<ProfiloFinto>;
      corrente = { ...corrente, ...modifiche };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(corrente),
    });
  });

  /*
    Le chiamate di autenticazione. Senza, supabase-js prova a raggiungere un
    server che non esiste e **butta via la sessione appena scritta**, in
    silenzio: il test resterebbe a chiedersi perche' l'utente non risulti mai
    entrato.

    Le forme delle risposte non sono intercambiabili. `/user` deve restituire
    l'utente **nudo**, non incartato in un oggetto: se non lo riconosce, il
    client conclude che il token non vale piu'.
  */
  const utente = {
    id: riga.id,
    aud: "authenticated",
    role: "authenticated",
    email: "prova@example.com",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  await page.route("**/auth/v1/**", async (route) => {
    const percorso = new URL(route.request().url()).pathname;
    const corpo = percorso.endsWith("/user")
      ? utente
      : percorso.endsWith("/token")
        ? {
            access_token: "token-rinnovato",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "refresh-di-prova",
            user: utente,
          }
        : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(corpo),
    });
  });
}
