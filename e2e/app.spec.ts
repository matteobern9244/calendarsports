import { expect, test } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("loads home and navigates across all main sections with mocked sports data", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Prossimi Eventi" })).toBeVisible();
  await expect(page.getByText("Gran Premio di Imola")).toBeVisible();
  await expect(page.getByText("Internazionali d'Italia")).toBeVisible();
  await expect(page.getByText("GP di Francia")).toBeVisible();

  await page.getByRole("link", { name: "JANNIK SINNER" }).click();
  await expect(page).toHaveURL(/\/sinner$/);
  await expect(page.getByRole("heading", { level: 1, name: "Jannik Sinner" })).toBeVisible();
  await expect(page.getByText("Miami Open")).toBeVisible();
  await page.getByRole("tab", { name: "Tornei" }).click();
  await expect(page.getByText("Internazionali d'Italia")).toBeVisible();

  await page.getByRole("link", { name: "JUVENTUS" }).click();
  await expect(page).toHaveURL(/\/juventus$/);
  await expect(page.getByRole("heading", { name: "Juventus" })).toBeVisible();
  await expect(page.getByText("vs Milan")).toBeVisible();
  await expect(page.getByText("DAZN")).toBeVisible();
  await page.getByRole("tab", { name: "Classifica" }).click();
  await expect(page.getByRole("cell", { name: "Juventus" })).toBeVisible();

  await page.getByRole("link", { name: "FORMULA 1" }).click();
  await expect(page).toHaveURL(/\/formula1$/);
  await expect(page.getByRole("heading", { name: "Formula 1" })).toBeVisible();
  await expect(page.getByText("Gran Premio di Imola")).toBeVisible();
  await page.getByRole("tab", { name: "Classifica Piloti" }).click();
  await expect(page.getByText("Lando Norris")).toBeVisible();
  await page.getByRole("tab", { name: "Costruttori" }).click();
  await expect(page.getByRole("cell", { name: "McLaren" })).toBeVisible();

  await page.getByRole("link", { name: "MOTOGP" }).click();
  await expect(page).toHaveURL(/\/motogp$/);
  await expect(page.getByRole("heading", { name: "MotoGP" })).toBeVisible();
  await expect(page.getByText("GP di Francia")).toBeVisible();
  await page.getByRole("tab", { name: "Classifica Piloti" }).click();
  await expect(page.getByRole("cell", { name: "Bagnaia F." })).toBeVisible();
  await page.getByRole("tab", { name: "Classifica Costruttori" }).click();
  await expect(page.getByRole("cell", { name: "Ducati Lenovo Team" })).toBeVisible();
});

test("shows a loading state before Formula 1 data resolves", async ({ page }) => {
  await installSportsApiMocks(page, {
    delayMs: {
      "sports-f1:calendar": 1_500,
    },
  });

  await page.goto("/formula1");

  await expect(page.getByText("Caricamento calendario F1...")).toBeVisible();
  await expect(page.getByText("Gran Premio di Imola")).toBeVisible();
});

test("Stasera in TV: separatore oro tra famiglie e etichette mobile visibili", async ({ page }) => {
  await installSportsApiMocks(page);

  // Forza viewport mobile per attivare il rendering delle etichette famiglia
  // mobile (le etichette desktop vivono in una colonna laterale).
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  // La scheda esiste e mostra programmi di entrambe le famiglie mockate.
  await expect(page.getByRole("heading", { name: "Stasera in TV" })).toBeVisible();
  await expect(page.getByText("Test Programma RAI 1")).toBeVisible();
  await expect(page.getByText("Test Programma Canale 5")).toBeVisible();

  // Almeno un separatore oro tra famiglie (RAI -> Mediaset).
  const dividers = page.locator('[data-testid="family-divider"]');
  await expect(dividers).toHaveCount(1);
  await expect(dividers.first()).toHaveAttribute("data-family", "mediaset");

  // Etichette famiglia mobile visibili sopra ogni gruppo (RAI + Mediaset).
  const mobileLabels = page.locator('[data-testid="family-label-mobile"]');
  await expect(mobileLabels).toHaveCount(2);
  await expect(mobileLabels.nth(0)).toContainText("RAI");
  await expect(mobileLabels.nth(0)).toBeVisible();
  await expect(mobileLabels.nth(1)).toContainText("Mediaset");
  await expect(mobileLabels.nth(1)).toBeVisible();
});
