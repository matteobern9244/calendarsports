import { expect, test } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("loads home and navigates across all main sections with mocked sports data", async ({
  page,
}) => {
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
  await expect(page.getByText("vs Milan").first()).toBeVisible();
  // Il badge emittente compare sia nella card "Prossima Partita" sia nella
  // riga di calendario: basta verificarne la presenza, non l'unicita'.
  await expect(page.getByText("DAZN").first()).toBeVisible();
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
  // Il titolo del programma esiste due volte nel DOM (albero desktop nascosto
  // via `hidden sm:flex` + albero mobile `sm:hidden`): a questo viewport ne e'
  // visibile uno solo, ed e' quello che conta per il test.
  await expect(page.getByRole("heading", { name: "Stasera in TV" })).toBeVisible();
  await expect(page.getByText("Test Programma RAI 1").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Test Programma Canale 5").filter({ visible: true })).toBeVisible();

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

test("dettaglio partita Juventus: raggiungibile dal calendario e con id diretto", async ({
  page,
}) => {
  await installSportsApiMocks(page);

  // Percorso reale dell'utente: dal calendario si apre la scheda partita.
  await page.goto("/juventus");
  await page
    .getByRole("link", { name: /vs Milan/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/juventus\/partite\//);
  await expect(page.getByRole("heading", { name: /Juventus – Milan/ })).toBeVisible();
  await expect(page.getByText("DAZN").first()).toBeVisible();

  // Deep-link diretto: la partita si trova anche senza passare dal calendario.
  await page.goto("/juventus/partite/champions-league-2099-05-03-inter-vs-juventus");
  await expect(page.getByRole("heading", { name: /Inter – Juventus/ })).toBeVisible();

  // Un id inesistente non deve dare pagina bianca ne' caricamento infinito.
  await page.goto("/juventus/partite/partita-che-non-esiste");
  await expect(page.getByText("Partita non trovata nel calendario")).toBeVisible();
});

test("PWA: l'app si apre senza rete grazie al service worker", async ({ page, context }) => {
  // Niente mock qui di proposito. La domanda non e' "i dati arrivano", ma
  // "il documento arriva quando la rete non c'e'": e' l'unica cosa che
  // separa una PWA installabile da una che mostra la pagina d'errore del
  // browser appena si apre senza connessione.
  const failedLocalAssets: string[] = [];
  page.on("requestfailed", (r) => {
    const { origin, pathname } = new URL(r.url());
    // Solo le nostre risorse: i font di Google e le API Supabase sono
    // cross-origin e devono fallire, offline.
    if (origin.includes("127.0.0.1") && (pathname.startsWith("/assets/") || pathname === "/")) {
      failedLocalAssets.push(pathname);
    }
  });

  await page.goto("/");

  // Il service worker deve aver preso il controllo di *questa* pagina prima
  // di staccare la rete: `ready` dice che e' attivo, `controller` che sta
  // gia' intercettando le richieste di questo client.
  await page.waitForFunction(
    async () => {
      await navigator.serviceWorker.ready;
      return navigator.serviceWorker.controller !== null;
    },
    undefined,
    { timeout: 15_000 },
  );

  await context.setOffline(true);
  await page.reload();

  // L'app shell c'e': la navigazione principale e' renderizzata, quindi il
  // documento e i suoi asset sono usciti dalla cache e React ha montato.
  await expect(page.getByRole("link", { name: "JUVENTUS" })).toBeVisible();

  // E non e' solo il guscio: le sezioni della home sono montate, cioe' i
  // chunk JavaScript sono arrivati davvero.
  await expect(page.getByRole("heading", { name: "Stasera in TV" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prossimi Eventi" })).toBeVisible();

  // Nessuna risorsa locale e' rimasta per strada: se un solo chunk fosse
  // sfuggito alla cache, React non avrebbe montato e le due attese sopra
  // sarebbero gia' fallite — questa lo dice esplicitamente invece di
  // lasciarlo dedurre.
  expect(failedLocalAssets).toEqual([]);

  // Non verifichiamo qui `OfflineIndicator`. Sotto l'emulazione di rete di
  // Playwright `navigator.onLine` resta `true`, quindi il banner non compare:
  // e' un limite dello strumento, non dell'app, e asserirlo renderebbe il
  // test una misura di Playwright invece che del service worker.

  await context.setOffline(false);
});

test("streaming: i filtri sopravvivono all'URL, in lettura e in scrittura", async ({ page }) => {
  await installSportsApiMocks(page);

  // Deep-link in lettura: la pagina deve *partire* dallo stato scritto
  // nell'indirizzo, non dai suoi default. E' la parte fragile di
  // StreamingPage, e la sola che un refactor puo' rompere in silenzio: la UI
  // continuerebbe a funzionare, solo ignorando l'indirizzo.
  await page.goto("/streaming?tab=tv&family=mediaset");
  await expect(page.getByRole("tab", { name: /TV stasera/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "Mediaset", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // E in scrittura: cambiare famiglia deve finire nell'indirizzo, altrimenti
  // il link condiviso riporta a uno stato diverso da quello che si vedeva.
  await page.getByRole("button", { name: "RAI", exact: true }).click();
  await expect(page).toHaveURL(/family=rai/);
});

test("calendario: la vista mese e la vista agenda mostrano gli eventi delle tre fonti", async ({
  page,
}) => {
  // Le fixture vivono nel maggio 2099 e la pagina si apre sul mese
  // corrente: senza fissare l'orologio il calendario sarebbe vuoto e il
  // test verificherebbe soltanto che la pagina non esplode.
  await page.clock.setFixedTime(new Date("2099-05-05T10:00:00Z"));
  await installSportsApiMocks(page);

  await page.goto("/calendario");

  await expect(page.getByRole("heading", { level: 1, name: /Maggio 2099/i })).toBeVisible();

  // Le tre fonti finiscono nella stessa griglia: e' il solo posto
  // dell'app dove Juventus, F1 e MotoGP compaiono insieme.
  await expect(page.getByRole("button", { name: /Juventus: @ Inter/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /MotoGP: Gara \(Francia\)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /F1: Gara \(Imola\)/ })).toBeVisible();

  // Il filtro per sport toglie una fonte sola.
  await page.getByRole("button", { name: "F1", exact: true }).click();
  await expect(page.getByRole("button", { name: /F1: Gara \(Imola\)/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Juventus: @ Inter/ })).toBeVisible();
  await page.getByRole("button", { name: "F1", exact: true }).click();
  await expect(page.getByRole("button", { name: /F1: Gara \(Imola\)/ })).toBeVisible();

  // La vista agenda mostra gli stessi eventi in forma di elenco. Il nome
  // accessibile la' e' composto diversamente — «Juventus @ Inter» invece
  // di «Juventus: @ Inter» — e questo test lo fissa com'e' oggi.
  await page.getByRole("tab", { name: "Agenda" }).click();
  await expect(page.getByRole("button", { name: /Juventus @ Inter/ })).toBeVisible();

  // La navigazione cambia davvero i dati mostrati, non solo
  // l'intestazione. Il controllo usa il Gran Premio di Monaco, di fine
  // maggio: la griglia di aprile arriva a coprire i primi giorni di
  // maggio per completare l'ultima settimana, e un evento del 3 maggio
  // resterebbe visibile anche da li'.
  await page.getByRole("tab", { name: "Mese" }).click();
  await expect(page.getByRole("button", { name: /F1: Gara \(Monaco\)/ })).toBeVisible();
  await page.getByLabel("Mese precedente").click();
  await expect(page.getByRole("heading", { level: 1, name: /Aprile 2099/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /F1: Gara \(Monaco\)/ })).toHaveCount(0);
});
