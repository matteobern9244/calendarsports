import { expect, test, type Page } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";
import { accediComeUtente } from "./support/auth";

/**
 * Un vero gesto tattile, non eventi sintetici.
 *
 * `page.touchscreen` sa solo toccare, e un `dispatchEvent` costruito a mano
 * verificherebbe che il nostro codice reagisce a un evento che ci siamo
 * inventati noi. `Input.dispatchTouchEvent` del protocollo DevTools inietta
 * il tocco a monte, dove lo inietterebbe un dito: e' l'unico modo in cui
 * questo test puo' fallire se il gesto smette di funzionare davvero.
 *
 * I passi intermedi ci sono perche' un dito non si teletrasporta, e il
 * browser potrebbe interpretare un salto secco in modo diverso.
 */
async function swipe(page: Page, da: { x: number; y: number }, a: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: da.x, y: da.y }],
  });
  for (const frazione of [0.3, 0.6, 1]) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: da.x + (a.x - da.x) * frazione, y: da.y + (a.y - da.y) * frazione }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

const pannello = (page: Page) =>
  page.getByRole("dialog").getByRole("heading", { name: "Preferenze" });

test("preferenze: lo swipe da destra apre il pannello, e l'indizio smette di servire", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  // L'indizio esiste finche' il gesto non e' stato imparato.
  const indizio = page.getByTestId("indizio-swipe");
  await expect(indizio).toBeVisible();

  await swipe(page, { x: 340, y: 400 }, { x: 120, y: 406 });

  await expect(pannello(page)).toBeVisible();

  // Chi ha imparato non ha piu' niente da imparare: l'indizio non torna,
  // nemmeno ricaricando.
  await page.reload();
  await expect(indizio).toHaveCount(0);
});

/**
 * Il pulsante non e' stato sostituito dal gesto: e' una scorciatoia in piu'.
 * Un gesto che rimpiazzasse un comando visibile renderebbe la funzione
 * invisibile a chi non lo scopre.
 */
test("preferenze: il pulsante in cima continua a funzionare accanto al gesto", async ({ page }) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  await expect(pannello(page)).toBeVisible();
});

test("preferenze: un gesto nella direzione sbagliata non apre niente", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  // Da sinistra verso destra: e' il gesto opposto.
  await swipe(page, { x: 60, y: 400 }, { x: 300, y: 400 });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Verticale: e' lo scorrimento della pagina, e rubarglielo sarebbe il modo
  // piu' rapido di rendere l'app inutilizzabile.
  await swipe(page, { x: 360, y: 200 }, { x: 354, y: 520 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

/**
 * Le pagine da visitare. Sono tutte quelle raggiungibili dal menu' piu' il
 * dettaglio di una partita, che ha una struttura sua fatta di schede.
 */
const PAGINE = [
  "/",
  "/calendario",
  "/streaming",
  "/sinner",
  "/squadra/juventus",
  "/squadra/juventus/partite/champions-league-2099-05-03-inter-vs-juventus",
  "/formula1",
  "/motogp",
] as const;

/**
 * Le larghezze su cui si misura. Non basta quella del dispositivo emulato: un
 * contenuto deborda quando lo schermo si stringe, e fra un telefono grande e
 * uno piccolo ci sono piu' di cento pixel di differenza. Si va dai 430 dei
 * modelli maggiori ai 320, il piu' angusto ancora in circolazione.
 */
const LARGHEZZE = [430, 412, 393, 360, 320] as const;

/**
 * Chi scorre in orizzontale, e di quanto.
 *
 * Il controllo lo fa il browser e non un `grep` sulle classi: `overflow-x`
 * dichiarato non significa niente finche' il contenuto non deborda davvero, e
 * un elemento puo' debordare senza che nessuno abbia scritto `overflow-x`
 * perche' l'ha ereditato o perche' e' semplicemente troppo largo.
 */
async function chiScorreInOrizzontale(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const descrivi = (el: Element) => {
      const classi = (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 6).join(" ");
      return `${el.tagName.toLowerCase()}${classi ? `.${classi.replace(/\s+/g, ".")}` : ""}`;
    };
    const colpevoli: string[] = [];
    const radice = document.documentElement;
    // Una tolleranza di 1px: gli arrotondamenti sub-pixel non sono un difetto.
    if (radice.scrollWidth > radice.clientWidth + 1) {
      colpevoli.push(`pagina intera (${radice.scrollWidth} > ${radice.clientWidth})`);
    }
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const stile = window.getComputedStyle(el);
      const scorre = stile.overflowX === "auto" || stile.overflowX === "scroll";
      if (scorre && el.scrollWidth > el.clientWidth + 1) {
        colpevoli.push(`${descrivi(el)} (${el.scrollWidth} > ${el.clientWidth})`);
      }
    }
    return colpevoli;
  });
}

/**
 * Su uno schermo stretto **niente** deve scorrere lateralmente: ne' la pagina,
 * ne' una riga di filtri, ne' una tabella. Un contenuto che si raggiunge solo
 * trascinando di lato e' un contenuto che meta' delle persone non trova, e la
 * barra che compare sotto lo annuncia senza renderlo piu' trovabile. Le voci
 * devono andare a capo, non mettersi in fila indiana.
 *
 * Il guardiano vale anche come rete per lo swipe: un'area che scorre in
 * orizzontale gli ruberebbe il gesto, quindi non averne e' due cose giuste
 * in una.
 */
for (const pagina of PAGINE) {
  test(`niente scorrimento orizzontale: ${pagina}`, async ({ page }) => {
    await installSportsApiMocks(page);
    await page.goto(pagina);
    // Il contenuto arriva dai mock: si aspetta che la pagina abbia finito di
    // comporsi, altrimenti si misura uno scheletro.
    await page.waitForLoadState("networkidle");
    await expect(page.locator("footer")).toBeVisible();

    for (const larghezza of LARGHEZZE) {
      await page.setViewportSize({ width: larghezza, height: 780 });
      // Il riflusso del layout non e' istantaneo: senza questa attesa si
      // misurerebbe la disposizione precedente.
      await page.waitForFunction(
        (attesa) => document.documentElement.clientWidth === attesa,
        larghezza,
      );
      expect(await chiScorreInOrizzontale(page), `a ${larghezza}px`).toEqual([]);
    }
  });
}

/**
 * Gli stati che una pagina assume solo se qualcuno la tocca.
 *
 * Il guardiano sopra misura le pagine a riposo, e a riposo meta' del
 * contenuto non e' nemmeno montata: schede, viste alternative e pannelli
 * arrivano dopo un clic. Una tabella che sborda dentro una scheda chiusa non
 * si vede finche' non la si apre — ed e' esattamente li' che si nasconde.
 */
const PARTITA = "/squadra/juventus/partite/champions-league-2099-05-03-inter-vs-juventus";

const STATI: Array<{ nome: string; pagina: string; scheda: string | RegExp }> = [
  { nome: "streaming · nuove uscite", pagina: "/streaming", scheda: /Nuove uscite/i },
  { nome: "calendario · agenda", pagina: "/calendario", scheda: "Agenda" },
  { nome: "squadra · rosa", pagina: "/squadra/juventus", scheda: "Rosa" },
  { nome: "squadra · statistiche", pagina: "/squadra/juventus", scheda: "Statistiche" },
  { nome: "squadra · highlights", pagina: "/squadra/juventus", scheda: "Highlights" },
  { nome: "squadra · formazioni", pagina: "/squadra/juventus", scheda: "Formazioni" },
  { nome: "squadra · formazioni (milan)", pagina: "/squadra/milan", scheda: "Formazioni" },
  { nome: "partita · formazione", pagina: PARTITA, scheda: "Formazione" },
  { nome: "partita · cronologia", pagina: PARTITA, scheda: "Cronologia eventi" },
  { nome: "sinner · tornei", pagina: "/sinner", scheda: "Tornei" },
  { nome: "squadra · classifica", pagina: "/squadra/juventus", scheda: "Classifica" },
  { nome: "formula 1 · piloti", pagina: "/formula1", scheda: "Classifica Piloti" },
  { nome: "formula 1 · costruttori", pagina: "/formula1", scheda: "Costruttori" },
  { nome: "motogp · piloti", pagina: "/motogp", scheda: "Classifica Piloti" },
];

for (const { nome, pagina, scheda } of STATI) {
  test(`niente scorrimento orizzontale: ${nome}`, async ({ page }) => {
    await installSportsApiMocks(page);
    await page.goto(pagina);
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: scheda }).click();

    for (const larghezza of LARGHEZZE) {
      await page.setViewportSize({ width: larghezza, height: 780 });
      await page.waitForFunction(
        (attesa) => document.documentElement.clientWidth === attesa,
        larghezza,
      );
      expect(await chiScorreInOrizzontale(page), `a ${larghezza}px`).toEqual([]);
    }
  });
}

/**
 * Il pannello delle preferenze e' un foglio che su mobile arriva dal basso e
 * contiene tendine, interruttori e pillole: e' il posto piu' facile in cui
 * qualcosa sbordi, e sarebbe anche il piu' fastidioso.
 */
test("niente scorrimento orizzontale: pannello preferenze", async ({ page }) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Preferenze" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  for (const larghezza of LARGHEZZE) {
    await page.setViewportSize({ width: larghezza, height: 780 });
    await page.waitForFunction(
      (attesa) => document.documentElement.clientWidth === attesa,
      larghezza,
    );
    expect(await chiScorreInOrizzontale(page), `a ${larghezza}px`).toEqual([]);
  }
});

/**
 * Il gesto apre le preferenze, e le preferenze esistono solo con l'accesso:
 * senza sessione non c'e' niente da aprire, e un indizio che suggerisce un
 * gesto inefficace e' peggio di nessun indizio.
 */
test("preferenze: senza accesso il gesto e il suo indizio non esistono", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  await expect(page.getByTestId("indizio-swipe")).toHaveCount(0);

  await swipe(page, { x: 340, y: 400 }, { x: 120, y: 406 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
