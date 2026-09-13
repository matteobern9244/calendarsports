import { expect, test, type Page } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";
import { ORA_CON_PARTITA_IN_CORSO } from "./support/footballFixtures";
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

const linguetta = (page: Page) => page.getByTestId("linguetta-preferenze");

test("preferenze: lo swipe da destra apre il pannello, e la linguetta resta", async ({ page }) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  // Il documento dichiara al browser che scorre solo in verticale: e' la
  // condizione perche' un movimento orizzontale arrivi fino al gesto invece
  // di finire in un `touchcancel` di sistema.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).touchAction))
    .toContain("pan-y");

  // La linguetta e' un comando, ed e' visibile prima di qualunque gesto.
  await expect(linguetta(page)).toBeVisible();
  await expect(linguetta(page)).toHaveClass(/animate-swipe-hint/);

  await swipe(page, { x: 340, y: 400 }, { x: 120, y: 406 });

  await expect(pannello(page)).toBeVisible();

  // Chi ha imparato non ha piu' bisogno del richiamo, ma il comando resta:
  // dopo la ricarica la linguetta c'e' ancora, solo ferma.
  await page.reload();
  await expect(linguetta(page)).toBeVisible();
  await expect(linguetta(page)).not.toHaveClass(/animate-swipe-hint/);
});

/**
 * Il ripiego per quando il gesto non arriva: sul telefono vero il sistema
 * puo' prendersi lo swipe, e allora si tocca. E' anche il modo in cui la
 * linguetta si spiega da sola.
 */
test("preferenze: il tocco sulla linguetta apre il pannello", async ({ page }) => {
  await installSportsApiMocks(page);
  await accediComeUtente(page);
  await page.goto("/");

  // `force`: finche' non e' stata usata la linguetta pulsa, e Playwright
  // aspetterebbe per sempre che stia ferma. Un dito non aspetta.
  await linguetta(page).tap({ force: true });
  await expect(pannello(page)).toBeVisible();
});

/**
 * La linguetta vive nei pixel del bordo che il gesto libero lascia al
 * telefono: un trascinamento che parte da lei deve aprire lo stesso.
 */
test("preferenze: un trascinamento che parte dalla linguetta apre il pannello", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  await accediComeUtente(page);
  await page.goto("/");

  const box = await linguetta(page).boundingBox();
  if (!box) throw new Error("la linguetta non ha un riquadro");
  const partenza = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await swipe(page, partenza, { x: partenza.x - 160, y: partenza.y + 4 });

  await expect(pannello(page)).toBeVisible();
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

  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
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
/**
 * La partita da misurare, e **deve avere un dettaglio da mostrare**.
 *
 * Prima queste righe puntavano a Inter-Juventus, che nella fixture ha
 * `skyMatchId: null`: le schede rendevano il messaggio «la fonte non pubblica
 * un identificativo» e il guardiano misurava la disposizione di una schermata
 * vuota. Verde per il motivo sbagliato, come la scheda delle nuove uscite
 * nella 3.3.0 — che rispondeva 404 e non aveva niente da disporre.
 */
const PARTITA = "/squadra/juventus/partite/serie-a-2099-05-17-juventus-vs-napoli";

/**
 * La partita in corso: e' lo stato piu' largo che esista, perche' alla riga si
 * aggiungono il badge di fase e il punteggio accanto a un avversario dal nome
 * lungo e a due emittenti.
 */
const PARTITA_IN_CORSO =
  "/squadra/juventus/partite/champions-league-2099-04-19-juventus-vs-shakhtar-donetsk";

const PAGINE = [
  "/",
  "/calendario",
  "/streaming",
  "/sinner",
  "/squadra/juventus",
  PARTITA,
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
 * Le stesse pagine, con l'orologio fermo mentre si gioca.
 *
 * Una partita datata 2099 e' sempre futura: senza congelare l'ora il badge «In
 * corso» e il punteggio accanto — cioe' proprio cio' che allarga la riga — non
 * verrebbero montati mai, e il guardiano continuerebbe a misurare la sola
 * versione stretta della pagina.
 */
const PAGINE_MENTRE_SI_GIOCA = ["/squadra/juventus", PARTITA_IN_CORSO, "/calendario", "/"] as const;

for (const pagina of PAGINE_MENTRE_SI_GIOCA) {
  test(`niente scorrimento orizzontale mentre si gioca: ${pagina}`, async ({ page }) => {
    // Prima della navigazione: il primo render leggerebbe l'orologio vero.
    await page.clock.setFixedTime(new Date(ORA_CON_PARTITA_IN_CORSO));
    await installSportsApiMocks(page);
    await page.goto(pagina);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("footer")).toBeVisible();

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
 * Gli stati che una pagina assume solo se qualcuno la tocca.
 *
 * Il guardiano sopra misura le pagine a riposo, e a riposo meta' del
 * contenuto non e' nemmeno montata: schede, viste alternative e pannelli
 * arrivano dopo un clic. Una tabella che sborda dentro una scheda chiusa non
 * si vede finche' non la si apre — ed e' esattamente li' che si nasconde.
 */
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
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
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
 * senza sessione non c'e' niente da aprire, e una linguetta che non apre
 * niente e' peggio di nessuna linguetta.
 */
test("preferenze: senza accesso il gesto e la linguetta non esistono", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  await expect(linguetta(page)).toHaveCount(0);

  await swipe(page, { x: 340, y: 400 }, { x: 120, y: 406 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
