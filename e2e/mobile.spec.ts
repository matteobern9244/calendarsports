import { expect, test, type Page } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";

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

test("preferenze: lo swipe da sinistra apre il pannello, e l'indizio smette di servire", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  // L'indizio esiste finche' il gesto non e' stato imparato.
  const indizio = page.getByTestId("indizio-swipe");
  await expect(indizio).toBeVisible();

  await swipe(page, { x: 24, y: 400 }, { x: 240, y: 406 });

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
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  await expect(pannello(page)).toBeVisible();
});

test("preferenze: un gesto nella direzione sbagliata non apre niente", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  // Da destra verso sinistra: e' il gesto opposto.
  await swipe(page, { x: 300, y: 400 }, { x: 60, y: 400 });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Verticale: e' lo scorrimento della pagina, e rubarglielo sarebbe il modo
  // piu' rapido di rendere l'app inutilizzabile.
  await swipe(page, { x: 40, y: 200 }, { x: 46, y: 520 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
