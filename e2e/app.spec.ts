import { expect, test, type Locator, type Page } from "@playwright/test";
import { installSportsApiMocks } from "./support/mockSportsApi";
import { accediComeUtente } from "./support/auth";
import { ORA_CON_PARTITA_IN_CORSO } from "./support/footballFixtures";

/**
 * Una voce della barra di navigazione, comunque sia scritta a questa larghezza.
 *
 * L'etichetta cambia con il viewport — sotto i 1400px la barra usa la forma
 * corta, «F1» invece di «FORMULA 1» — e il **nome accessibile la segue**, come
 * deve: il criterio WCAG «Label in Name» chiede che il nome contenga il testo
 * visibile, quindi un `aria-label` sempre lungo, comodo per questi test,
 * sarebbe un difetto per chi naviga a voce e dice «clicca F1».
 *
 * Il viewport predefinito di Playwright e' 1280: le forme corte sono la norma
 * qui dentro, non l'eccezione.
 */
const voceMenu = (page: Page, ...forme: string[]) =>
  page.getByRole("link", { name: new RegExp(`^(${forme.join("|")})$`) });

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

  await voceMenu(page, "JANNIK SINNER", "SINNER").click();
  await expect(page).toHaveURL(/\/sinner$/);
  await expect(page.getByRole("heading", { level: 1, name: "Jannik Sinner" })).toBeVisible();
  await expect(page.getByText("Miami Open")).toBeVisible();
  await page.getByRole("tab", { name: "Tornei" }).click();
  await expect(page.getByText("Internazionali d'Italia")).toBeVisible();

  await voceMenu(page, "JUVENTUS").click();
  await expect(page).toHaveURL(/\/squadra\/juventus$/);
  await expect(page.getByRole("heading", { name: "Juventus" })).toBeVisible();
  await expect(page.getByText("vs Milan").first()).toBeVisible();
  // Il badge emittente compare sia nella card "Prossima Partita" sia nella
  // riga di calendario: basta verificarne la presenza, non l'unicita'.
  await expect(page.getByText("DAZN").first()).toBeVisible();
  await page.getByRole("tab", { name: "Classifica" }).click();
  await expect(page.getByRole("cell", { name: "Juventus" })).toBeVisible();

  await voceMenu(page, "FORMULA 1", "F1").click();
  await expect(page).toHaveURL(/\/formula1$/);
  await expect(page.getByRole("heading", { name: "Formula 1" })).toBeVisible();
  await expect(page.getByText("Gran Premio di Imola")).toBeVisible();
  await page.getByRole("tab", { name: "Classifica Piloti" }).click();
  await expect(page.getByText("Lando Norris")).toBeVisible();
  await page.getByRole("tab", { name: "Costruttori" }).click();
  await expect(page.getByRole("cell", { name: "McLaren" })).toBeVisible();

  await voceMenu(page, "MOTOGP").click();
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

test("dettaglio partita: raggiungibile dal calendario e con id diretto", async ({ page }) => {
  await installSportsApiMocks(page);

  // Percorso reale dell'utente: dal calendario si apre la scheda partita.
  await page.goto("/squadra/juventus");
  await page
    .getByRole("link", { name: /vs Milan/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/squadra\/juventus\/partite\//);
  await expect(page.getByRole("heading", { name: /Juventus – Milan/ })).toBeVisible();
  await expect(page.getByText("DAZN").first()).toBeVisible();

  // Deep-link diretto: la partita si trova anche senza passare dal calendario.
  await page.goto("/squadra/juventus/partite/champions-league-2099-05-03-inter-vs-juventus");
  await expect(page.getByRole("heading", { name: /Inter – Juventus/ })).toBeVisible();

  // Un id inesistente non deve dare pagina bianca ne' caricamento infinito.
  await page.goto("/squadra/juventus/partite/partita-che-non-esiste");
  await expect(page.getByText("Partita non trovata nel calendario")).toBeVisible();
});

/**
 * I vecchi indirizzi `/juventus*` sono stati condivisi, messi nei preferiti e
 * indicizzati: continuano a funzionare, e portano al loro equivalente nuovo
 * conservando l'id della partita.
 */
test("squadra: i vecchi indirizzi /juventus portano alla rotta parametrica", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/");
  await page.goto("/juventus");
  await expect(page).toHaveURL(/\/squadra\/juventus$/);
  await expect(page.getByRole("heading", { name: "Juventus" }).first()).toBeVisible();

  // Il redirect **sostituisce** la voce di cronologia. Senza, «indietro»
  // tornerebbe su /juventus, che rimanda subito avanti: una trappola da cui
  // non si esce piu' con il tasto indietro.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/juventus/partite/champions-league-2099-05-03-inter-vs-juventus");
  await expect(page).toHaveURL(
    /\/squadra\/juventus\/partite\/champions-league-2099-05-03-inter-vs-juventus$/,
  );
  await expect(page.getByRole("heading", { name: /Inter – Juventus/ })).toBeVisible();
});

/**
 * La domanda che solo il browser puo' rispondere: l'indirizzo, non la
 * preferenza, decide cosa si vede. Napoli-Lazio esiste solo nel calendario del
 * Napoli, quindi la sua presenza dimostra che la pagina ha davvero seguito lo
 * slug e non e' rimasta sulla squadra predefinita.
 */
test("squadra: l'indirizzo decide la squadra, e uno slug inventato e' un 404", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/squadra/napoli");
  await expect(page.getByRole("heading", { name: "Napoli" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri dettaglio Napoli vs Lazio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri dettaglio Juventus vs Milan" })).toHaveCount(0);

  // Il dettaglio aperto dal calendario del Napoli resta nel ramo del Napoli:
  // e' quello che permette al «Torna al calendario» di riportare indietro.
  await page.getByRole("link", { name: "Apri dettaglio Napoli vs Lazio" }).click();
  await expect(page).toHaveURL(/\/squadra\/napoli\/partite\//);
  await page.getByRole("link", { name: "Torna al calendario" }).click();
  await expect(page).toHaveURL(/\/squadra\/napoli$/);

  // Uno slug che non e' una squadra non deve diventare la Juventus: un
  // indirizzo che annuncia una squadra e ne mostra un'altra e' un dato falso,
  // per di piu' condivisibile.
  await page.goto("/squadra/squadra-inventata");
  await expect(page.getByText("Pagina non trovata")).toBeVisible();
});

test("PWA: l'app si apre senza rete grazie al service worker", async ({ page, context }) => {
  // Niente mock qui di proposito. La domanda non e' "i dati arrivano", ma
  // "il documento arriva quando la rete non c'e'": e' l'unica cosa che
  // separa una PWA installabile da una che mostra la pagina d'errore del
  // browser appena si apre senza connessione.
  const failedLocalAssets: string[] = [];
  page.on("requestfailed", (r) => {
    const { origin, pathname } = new URL(r.url());
    // Solo le nostre risorse: le API Supabase sono cross-origin e devono
    // fallire, offline. I font non sono piu' fra queste — dal 5 settembre
    // 2026 sono ospitati nel progetto e stanno sotto `/assets/`, quindi
    // rientrano in pieno in cio' che questa lista sorveglia.
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
  await expect(voceMenu(page, "JUVENTUS")).toBeVisible();

  // E non e' solo il guscio: le sezioni della home sono montate, cioe' i
  // chunk JavaScript sono arrivati davvero.
  await expect(page.getByRole("heading", { name: "Stasera in TV" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prossimi Eventi" })).toBeVisible();

  // Nessuna risorsa locale e' rimasta per strada: se un solo chunk fosse
  // sfuggito alla cache, React non avrebbe montato e le due attese sopra
  // sarebbero gia' fallite — questa lo dice esplicitamente invece di
  // lasciarlo dedurre.
  expect(failedLocalAssets).toEqual([]);

  // E i font sono usabili, non solo arrivati. La distinzione conta: finche'
  // venivano da `fonts.googleapis.com`, offline falliva il foglio di stile
  // e con esso spariva la regola `@font-face`, quindi il testo restava
  // leggibile ma nel font di sistema. `document.fonts.load` forza il
  // caricamento e `check` dice se una faccia che combacia e' disponibile
  // davvero: senza service worker che serva il woff2, e' `false`.
  const fontiUsabili = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load("700 24px Oswald"),
      document.fonts.load("400 16px Inter"),
    ]);
    return {
      oswald: document.fonts.check("700 24px Oswald"),
      inter: document.fonts.check("400 16px Inter"),
    };
  });
  expect(fontiUsabili).toEqual({ oswald: true, inter: true });

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

test("preferenze: la tendina si apre e si chiude senza travolgere il pannello", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  const pannello = page.getByRole("dialog");
  await expect(pannello.getByRole("heading", { name: "Preferenze" })).toBeVisible();

  const tendina = page.getByRole("combobox", { name: "Squadra di calcio preferita" });

  // Il controllo mostra la squadra scelta **da sola**: e' la differenza fra
  // una tendina e un elenco sempre aperto, ed e' cio' che l'utente legge
  // senza doverlo aprire.
  await expect(tendina).toHaveText("Juventus");

  await tendina.click();
  const voci = page.getByRole("option");
  await expect(voci).toHaveCount(20);
  // Ordine alfabetico italiano, non di classifica: la classifica cambia ogni
  // domenica e sposterebbe le voci sotto il dito.
  await expect(voci.first()).toHaveText("Atalanta");
  await expect(voci.last()).toHaveText("Venezia");

  // La ragione per cui questo test vive in Playwright e non in jsdom: il
  // contenuto della tendina sta in un portale **fuori** dallo Sheet, e la sua
  // chiusura non deve arrivare al dialog sotto. Chiudere la tendina senza
  // scegliere niente lascia il pannello dov'e': l'utente stava guardando, non
  // ha deciso.
  await page.keyboard.press("Escape");
  await expect(voci).toHaveCount(0);
  await expect(pannello).toBeVisible();
  await expect(tendina).toHaveText("Juventus");

  // Scegliere invece e' un atto concluso: si salva e il pannello si chiude.
  await tendina.click();
  await page.getByRole("option", { name: "Napoli", exact: true }).click();
  await expect(pannello).toBeHidden();

  // Sul dispositivo finisce lo **slug**, non il nome: e' il valore che la
  // migrazione copia nel profilo al primo accesso.
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("cse-favorite-team")))
    .toBe("napoli");

  // E la scelta sopravvive a un cambio pagina.
  await voceMenu(page, "FORMULA 1", "F1").click();
  await expect(page).toHaveURL(/\/formula1$/);
  await page.getByRole("button", { name: "Preferenze" }).click();
  await expect(page.getByRole("combobox", { name: "Squadra di calcio preferita" })).toHaveText(
    "Napoli",
  );
});

/**
 * La preferenza esce dal pannello e arriva dove si naviga.
 *
 * Fino al passo 10 la squadra scelta cambiava soltanto cio' che si vedeva
 * digitando `/squadra/<slug>` a mano: il menu, la Home e il calendario
 * aggregato restavano juventini. Questa e' la catena che lo chiude, ed e' una
 * catena che solo il browser puo' percorrere per intero — tendina in un
 * portale, `localStorage`, navigazione, tre pagine diverse.
 */
test("squadra: la preferenza arriva al menu e alla Home", async ({ page }) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  const tendina = page.getByRole("combobox", { name: "Squadra di calcio preferita" });
  await tendina.click();
  await page.getByRole("option", { name: "Napoli", exact: true }).click();

  // **Scegliere chiude il pannello**, e da li' in poi la tendina non esiste
  // piu'. Questo test aspettava invece che mostrasse «Napoli», ed era una
  // corsa: vinta quasi sempre, persa quando la chiusura arrivava prima
  // dell'asserzione. Il fatto da verificare e' la chiusura, non un'etichetta
  // che sta sparendo — e niente `Escape`, che senza pannello finirebbe alla
  // pagina sotto.
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(tendina).toHaveCount(0);

  // Il menu porta alla squadra scelta, senza passare da un redirect.
  const voce = page.getByRole("link", { name: "NAPOLI", exact: true });
  await expect(voce).toBeVisible();
  await expect(voce).toHaveAttribute("href", "/squadra/napoli");

  // La Home dice di chi e' la prossima partita, e da che parte gioca.
  // Juventus-Napoli e' la prima in calendario per il Napoli: vista da Napoli
  // e' una trasferta, e con il vecchio `includes("juventus")` sarebbe stata
  // «vs Napoli», cioe' il Napoli dato come avversario di se stesso.
  await expect(page.getByText("Calcio · Napoli")).toBeVisible();
  await expect(page.getByText("@ Juventus")).toBeVisible();

  // Da qui in avanti si naviga per link e non con `goto`: la preferenza vive
  // in `localStorage`, e ogni caricamento di documento in questa suite parte
  // da un `localStorage.clear()`.
  await voce.click();
  await expect(page).toHaveURL(/\/squadra\/napoli$/);
  await expect(page.getByRole("heading", { name: "Napoli" }).first()).toBeVisible();
});

/**
 * La stessa preferenza, vista dalle altre due pagine che la usano. Qui la
 * squadra e' scritta sul dispositivo invece che scelta dalla tendina: e' il
 * modo di sopravvivere ai `goto`, e descrive comunque un utente vero — chi
 * torna sull'app il giorno dopo.
 */
test("squadra: la preferenza guida il calendario aggregato, l'indirizzo la scavalca", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("cse-favorite-team", "napoli");
  });
  await page.clock.setFixedTime(new Date("2099-05-05T10:00:00Z"));
  await installSportsApiMocks(page);

  await page.goto("/calendario");

  // Napoli-Lazio esiste solo nel calendario del Napoli: la sua presenza
  // dimostra che la pagina ha chiesto davvero l'altra squadra.
  await expect(page.getByRole("button", { name: /Napoli: vs Lazio/ })).toBeVisible();
  // E Juventus-Milan, che nel calendario del Napoli non c'e', non compare.
  await expect(page.getByRole("button", { name: /vs Milan/ })).toHaveCount(0);

  // L'incrocio si vede dalla parte giusta: per il Napoli e' una trasferta.
  await expect(page.getByRole("button", { name: /Napoli: @ Juventus/ })).toBeVisible();

  // Il filtro dice di chi sono quelle partite, e spegne le sue.
  await page.getByRole("button", { name: "Napoli", exact: true }).click();
  await expect(page.getByRole("button", { name: /Napoli: @ Juventus/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /F1: Gara \(Imola\)/ })).toBeVisible();

  // Dentro una pagina squadra comanda l'indirizzo: un link condiviso sulla
  // Juventus non deve mostrare un menu che dice «Napoli», ne' portare via da
  // li' al primo clic.
  await page.goto("/squadra/juventus");
  await expect(page.getByRole("link", { name: "JUVENTUS", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "NAPOLI", exact: true })).toHaveCount(0);

  // Fuori di li' il menu torna a proporre la preferenza.
  await page.goto("/calendario");
  await expect(page.getByRole("link", { name: "NAPOLI", exact: true })).toBeVisible();
});

test("squadra: la scheda Rosa mostra reparti, allenatore e stadio", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/squadra/juventus");

  // La rosa non si scarica finche' non si apre la scheda: `TabsContent` non
  // rende il contenuto delle schede chiuse, ed e' il motivo per cui la
  // richiesta vive dentro `SquadPanel` e non nella pagina.
  const richieste: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("action=team-squad")) richieste.push(r.url());
  });
  await expect(page.getByRole("tab", { name: "Rosa" })).toBeVisible();
  expect(richieste, "la rosa si e' scaricata senza che nessuno aprisse la scheda").toHaveLength(0);

  await page.getByRole("tab", { name: "Rosa" }).click();

  await expect(page.getByText("Portiere Juve")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portieri" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Difensori" })).toBeVisible();

  // L'allenatore ha una sezione sua: se finisse fra i giocatori, il conteggio
  // di un reparto sarebbe sbagliato.
  await expect(page.getByRole("heading", { name: "Allenatore" })).toBeVisible();
  await expect(page.getByText("Allenatore Juve")).toBeVisible();

  await expect(page.getByText("Stadio della Juventus")).toBeVisible();
  await expect(page.getByText(/45\.666 posti/)).toBeVisible();

  // L'eta', mai una data di nascita: la fonte non la espone.
  await expect(page.getByText("29 anni")).toBeVisible();

  expect(richieste.length, "la scheda aperta deve aver chiesto la rosa").toBeGreaterThan(0);
});

test("squadra: le probabili formazioni si dichiarano tali e distinguono i dati", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  await page.goto("/squadra/juventus");
  await page.getByRole("tab", { name: "Formazioni" }).click();

  await expect(page.getByText("Probabili formazioni")).toBeVisible();
  await expect(page.getByText(/non formazioni ufficiali/)).toBeVisible();

  // Il modulo si legge separato, e i due lati possono averne due diversi.
  await expect(page.getByText("4-2-3-1")).toBeVisible();
  await expect(page.getByText("4-3-3")).toBeVisible();

  // 18:45 UTC sono le 20:45 italiane: la data passa dal fuso di Roma.
  await expect(page.getByText(/Milan - Juventus · 05\/05\/2099 20:45/)).toBeVisible();

  // La distinzione che regge la schermata: gli undici sono link, la panchina
  // e' testo, perche' la fonte per lei da' soltanto i cognomi.
  await expect(page.getByRole("link", { name: /Undici1/ }).first()).toBeVisible();
  await expect(page.getByText(/PanchinaUno, PanchinaDue/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /PanchinaUno/ })).toHaveCount(0);

  // Una categoria vuota non lascia un'etichetta orfana.
  await expect(page.getByText(/Squalificati/)).toHaveCount(0);
  await expect(page.getByText(/IndisponibileUno/).first()).toBeVisible();
});

test("squadra: gli highlights esistono solo per Juventus e Milan", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/squadra/juventus");
  await expect(page.getByRole("tab", { name: "Highlights" })).toBeVisible();

  await page.goto("/squadra/milan");
  await expect(page.getByRole("tab", { name: "Highlights" })).toBeVisible();

  await page.goto("/squadra/napoli");
  await expect(page.getByRole("tab", { name: "Calendario" })).toBeVisible();
  // Sparisce la scheda, non il suo contenuto: una linguetta che si apre sul
  // vuoto prometterebbe dei video che per le altre diciotto non esistono.
  await expect(page.getByRole("tab", { name: "Highlights" })).toHaveCount(0);
});

test("squadra: ogni playlist e' quella della sua squadra, non dell'altra", async ({ page }) => {
  await installSportsApiMocks(page);

  // Il difetto che conta non e' la scheda mancante, e' la scheda presente che
  // porta ai video di un'altra squadra: il nome giusto sopra il dato di
  // qualcun altro. Si guarda dove punta il collegamento, non cosa c'e' scritto.
  const link = page.getByRole("link", { name: /Vedi playlist completa/i });

  await page.goto("/squadra/juventus");
  await page.getByRole("tab", { name: "Highlights" }).click();
  await expect(link).toHaveAttribute("href", /list=PLVuEWoNX08GA$/);

  await page.goto("/squadra/milan");
  await page.getByRole("tab", { name: "Highlights" }).click();
  await expect(link).toHaveAttribute("href", /list=PLW7Xs51ob1LI$/);
});

test("squadra: la livrea segue la squadra, il carattere resta juventino", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/squadra/juventus");
  const juve = page.locator(".team-theme");
  await expect(juve).toHaveAttribute("style", /--team-accent:\s*43 96% 56%/);
  await expect(juve).not.toHaveClass(/team-neutral/);

  await page.goto("/squadra/napoli");
  const napoli = page.locator(".team-theme");
  await expect(napoli).toHaveAttribute("style", /--team-accent:\s*205 95% 42%/);
  await expect(napoli).toHaveClass(/team-neutral/);

  // La verifica che conta davvero: il carattere **calcolato** cambia solo
  // dentro la sezione squadra. In jsdom questo non si potrebbe misurare —
  // non risolve le variabili CSS — ed e' il motivo per cui sta qui.
  //
  // Il titolo va **atteso** prima di misurarlo: `evaluate` non ha i tentativi
  // automatici di `expect`, e sotto carico arrivava prima che React rendesse
  // qualcosa. Il test falliva a intermittenza per una corsa, non per il font.
  //
  // Non basta pero' attenderlo: `toBeVisible` risolve l'elemento, non impedisce
  // che React lo sostituisca un istante dopo, e `getComputedStyle` su un nodo
  // ormai staccato non da' un errore — da' stringhe vuote. Il test cadeva solo
  // quando la suite girava intera, cioe' sotto carico, e mai da solo. La
  // misura va quindi **ritentata**, non fatta una volta sola.
  const attendiFont = async (dentro: Locator, atteso: string) => {
    await expect
      .poll(() =>
        dentro
          .locator("h1, h2, h3")
          .first()
          .evaluate((el) => getComputedStyle(el).fontFamily),
      )
      .toContain(atteso);
  };

  await attendiFont(napoli, "Inter");

  await page.goto("/squadra/juventus");
  await attendiFont(page.locator(".team-theme"), "Oswald");
});

test("preferenze: la scelta chiude il pannello e si vede subito, senza ricaricare", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  const pannello = page.getByRole("dialog");
  await page.getByRole("combobox", { name: "Squadra di calcio preferita" }).click();
  await page.getByRole("option", { name: "Napoli", exact: true }).click();

  // 1. Il pannello si chiude da solo: la scelta e' fatta, non c'e' altro da
  //    fare li' dentro.
  await expect(pannello).toBeHidden();

  // 2. Senza ricaricare niente, il menu e la Home sono gia' del Napoli.
  await expect(page.getByRole("link", { name: "NAPOLI", exact: true })).toBeVisible();
  await expect(page.getByText(/Calcio · Napoli/)).toBeVisible();
});

test("preferenze: scegliere da dentro una pagina squadra porta sulla squadra scelta", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  // Le preferenze esistono solo con l'accesso: senza sessione il pannello
  // non c'e' nemmeno da aprire.
  await accediComeUtente(page);
  await page.goto("/squadra/juventus");

  await page.getByRole("button", { name: "Preferenze" }).click();
  await page.getByRole("combobox", { name: "Squadra di calcio preferita" }).click();
  await page.getByRole("option", { name: "Napoli", exact: true }).click();

  // Qui la preferenza da sola non basta e non deve bastare: dentro una pagina
  // squadra comanda l'indirizzo, quindi restare fermi vorrebbe dire scegliere
  // il Napoli e continuare a vedere la Juventus. L'indirizzo segue la scelta.
  await expect(page).toHaveURL(/\/squadra\/napoli$/);
  await expect(page.getByRole("heading", { name: "Napoli", exact: true })).toBeVisible();
});

test("squadra: le statistiche sono quelle della squadra dell'indirizzo", async ({ page }) => {
  await installSportsApiMocks(page);

  // Una richiesta di calendario **senza `page`** e' la stagione intera: la
  // edge function restituisce l'array piatto invece di una pagina da dodici.
  //
  // Il conto sta qui e non dentro la sola scheda perche' sorveglia due cose
  // insieme. La prima e' che `StatsPanel` non scarichi niente finche' nessuno
  // apre la scheda. La seconda e' che **la pagina squadra non ne faccia una
  // per conto suo**: la query della «prossima partita» passava `undefined`
  // come numero di pagina per dire «non mi serve», e `undefined` non disabilita
  // una query — la trasforma nella stagione intera, scaricata e buttata via a
  // ogni visita.
  const stagioneIntera: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.searchParams.get("action") === "calendar" && !url.searchParams.has("page")) {
      stagioneIntera.push(r.url());
    }
  });

  await page.goto("/squadra/juventus");
  await expect(page.getByRole("tab", { name: "Statistiche" })).toBeVisible();
  expect(
    stagioneIntera,
    "la stagione intera si e' scaricata senza che nessuno aprisse la scheda",
  ).toHaveLength(0);

  await page.getByRole("tab", { name: "Statistiche" }).click();

  // I totali sono quelli della classifica, non una somma nostra: la Juventus
  // e' prima con 73 punti e +33 di differenza reti.
  await expect(page.getByText("1º")).toBeVisible();
  await expect(page.getByText("73", { exact: true })).toBeVisible();
  await expect(page.getByText("+33", { exact: true })).toBeVisible();
  await expect(page.getByText(/Media del campionato/).first()).toBeVisible();
  expect(stagioneIntera.length, "la scheda aperta deve aver chiesto la stagione").toBeGreaterThan(
    0,
  );

  // Stessa scheda, altra squadra: se i numeri non cambiassero la sezione
  // starebbe mostrando la Juventus sotto il titolo del Napoli.
  await page.goto("/squadra/napoli");
  await page.getByRole("tab", { name: "Statistiche" }).click();
  await expect(page.getByText("3º")).toBeVisible();
  await expect(page.getByText("67", { exact: true })).toBeVisible();
  await expect(page.getByText("+24", { exact: true })).toBeVisible();
  await expect(page.getByText("73", { exact: true })).toHaveCount(0);
});

test("intestazione: nessuna etichetta va a capo e la riga non sborda mai", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  // Le larghezze che contano: il telefono, il tablet, le due soglie misurate
  // (`--breakpoint-menu` a 1220 e `--breakpoint-menulungo` a 1400) e i due
  // lati di ciascuna. Prima di questa correzione a 1024 la riga sbordava di
  // 140px, e le etichette lunghe andavano a capo dentro la pastiglia:
  // «FORMULA» sopra e «1» sotto.
  for (const larghezza of [390, 768, 1024, 1219, 1230, 1399, 1400, 1512]) {
    await page.setViewportSize({ width: larghezza, height: 900 });

    const misura = await page.evaluate(() => {
      const doc = document.documentElement;
      const barra = document.querySelector("header nav");
      const visibile = !!barra && barra.getBoundingClientRect().width > 0;
      const voci = visibile ? [...barra.querySelectorAll("a")] : [];
      return {
        sbordo: doc.scrollWidth - doc.clientWidth,
        altezzaMassima: voci.length
          ? Math.max(...voci.map((a) => a.getBoundingClientRect().height))
          : 0,
      };
    });

    expect(misura.sbordo, `la pagina scorre in orizzontale a ${larghezza}px`).toBeLessThanOrEqual(
      0,
    );
    // Una voce su una riga sola sta in 40px: oltre i 48 e' andata a capo.
    expect(
      misura.altezzaMassima,
      `un'etichetta della barra e' andata a capo a ${larghezza}px`,
    ).toBeLessThan(48);
  }
});

test("calendario: il colore del calcio segue la squadra, dialoghi compresi", async ({ page }) => {
  // Le fixture vivono nel maggio 2099: senza fissare l'orologio la griglia si
  // apre sul mese corrente, che e' vuoto, e non ci sarebbe nessun evento da
  // aprire.
  await page.clock.setFixedTime(new Date("2099-05-05T10:00:00Z"));
  await installSportsApiMocks(page);
  // La preferenza va scritta prima del caricamento: il `beforeEach` di questo
  // file pulisce `localStorage`, quindi un `setItem` dopo `goto` arriverebbe
  // tardi e la pagina nascerebbe juventina.
  await page.addInitScript(() => {
    window.localStorage.setItem("cse-favorite-team", "napoli");
  });
  await page.goto("/calendario");

  const legenda = page.getByRole("button", { name: /Napoli/ }).first();
  await expect(legenda).toBeVisible();

  const colori = await page.evaluate(() => {
    const pallino = (bottone: Element | null) =>
      bottone
        ? getComputedStyle(bottone.querySelector('span[class*="rounded-full"]')!).backgroundColor
        : null;
    const bottoni = [...document.querySelectorAll("button")];
    const trova = (testo: RegExp) => bottoni.find((b) => testo.test(b.textContent ?? "")) ?? null;
    return {
      accento: document.documentElement.style.getPropertyValue("--team-accent").trim(),
      calcio: pallino(trova(/^\s*Napoli\s*$/)),
      f1: pallino(trova(/^\s*F1\s*$/)),
      motogp: pallino(trova(/^\s*MotoGP\s*$/)),
    };
  });

  // La squadra arriva davvero fino alla radice del documento.
  expect(colori.accento, "TeamPalette non ha scritto il colore su <html>").toBe("205 95% 42%");
  // Il pallino del calcio e' quello della squadra, e resta distinto dagli
  // altri due sport: e' il timore su cui si era deciso di procedere lo stesso.
  expect(colori.calcio).toBe("rgb(5, 124, 209)");
  expect(colori.calcio).not.toBe(colori.f1);
  expect(colori.calcio).not.toBe(colori.motogp);

  // La trappola vera: i dialoghi di Radix si montano sotto `document.body`,
  // fuori da qualunque contenitore React. Se il colore vivesse su un div della
  // pagina, il calendario sarebbe verde e i suoi dialoghi oro.
  await page.locator('[aria-label*="Apri i dettagli"]').first().click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();

  const dentro = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')!;
    return {
      fuoriDaRoot: d.closest("#root") === null,
      accento: getComputedStyle(d).getPropertyValue("--team-accent").trim(),
    };
  });
  expect(
    dentro.fuoriDaRoot,
    "il dialogo non e' piu' in un portale: il test non prova piu' niente",
  ).toBe(true);
  expect(dentro.accento, "il colore della squadra non raggiunge il portale").toBe("205 95% 42%");
});

test("squadra: la rosa si apre sulle statistiche del giocatore, una richiesta per volta", async ({
  page,
}) => {
  await installSportsApiMocks(page);

  const richieste: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("action=player-stats")) richieste.push(r.url());
  });

  await page.goto("/squadra/juventus");
  await page.getByRole("tab", { name: "Rosa" }).click();
  await expect(page.getByText("Portiere Juve")).toBeVisible();

  // Il conto e' il punto di tutto il disegno: la scheda atleta di Sky pesa
  // 460 KB, e una rosa da venticinque righe che le chiedesse tutte costerebbe
  // undici megabyte a ogni apertura.
  expect(
    richieste,
    "la rosa ha chiesto statistiche senza che nessuno aprisse una riga",
  ).toHaveLength(0);

  const portiere = page.getByRole("button", { name: /Portiere Juve/ });
  await expect(portiere).toHaveAttribute("aria-expanded", "false");
  await portiere.click();
  await expect(portiere).toHaveAttribute("aria-expanded", "true");

  // Le voci del portiere, che un giocatore di movimento non ha.
  await expect(page.getByText("Parate")).toBeVisible();
  await expect(page.getByText("Porte inviolate")).toBeVisible();
  await expect(page.getByText("Presenze")).toBeVisible();
  // E quelle che il portiere non ha: se comparissero, sarebbero zeri inventati.
  await expect(page.getByText("Da titolare")).toHaveCount(0);
  await expect(page.getByText("Assist")).toHaveCount(0);
  // Le coppie restano coppie: «64 riusciti su 91», non un totale solo.
  await expect(page.getByText(/64/).first()).toBeVisible();
  await expect(page.getByText(/riusciti su 91/)).toBeVisible();

  expect(richieste, "la riga aperta doveva chiedere le sue statistiche").toHaveLength(1);
  expect(richieste[0]).toContain("playerSlug=portiere-juve");

  // Chi non ha una scheda atleta non ha una riga apribile, e non finge di
  // averne una.
  await expect(page.getByRole("button", { name: /Difensore Juve/ })).toHaveCount(0);
  await expect(page.getByText("Difensore Juve")).toBeVisible();

  // Richiuderla non ne chiede altre.
  await portiere.click();
  await expect(portiere).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Parate")).toHaveCount(0);
  expect(richieste).toHaveLength(1);
});

/**
 * Era «le quattro schede», e cercava il risultato dentro la scheda
 * «Risultato». **Il requisito e' cambiato, il test non e' stato indebolito**:
 * il risultato sta in cima, sopra le schede, e quella scheda non esiste piu' —
 * era la quarta di cinque, e per leggere un punteggio bisognava sapere dove
 * cercarlo. Le asserzioni sul contenuto restano tutte, spostate dove il
 * contenuto e' andato, e se ne aggiungono sul costo della richiesta.
 */
test("dettaglio partita: le schede mostrano i dati dentro l'app", async ({ page }) => {
  await installSportsApiMocks(page);

  const richieste: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("action=match-detail")) richieste.push(r.url());
  });

  await page.goto("/squadra/juventus/partite/serie-a-2099-05-17-juventus-vs-napoli");
  await expect(page.getByRole("heading", { name: /Juventus – Napoli/ })).toBeVisible();

  // Una partita da giocare non ha niente da chiedere al dettaglio: niente
  // marcatori, niente arbitro, nessun punteggio. Il caso che l'ordine delle
  // schede proteggeva — i tre widget pesano un centinaio di kilobyte — resta
  // gratuito.
  expect(
    richieste,
    "il dettaglio si e' scaricato per una partita che non si e' giocata",
  ).toHaveLength(0);
  await expect(page.getByText("vs", { exact: true })).toBeVisible();

  // La scheda «Risultato» non esiste piu'.
  await expect(page.getByRole("tab", { name: "Risultato" })).toHaveCount(0);

  // --- Formazione: gli undici, la panchina, l'allenatore. Dentro l'app.
  await page.getByRole("tab", { name: "Formazione" }).click();
  await expect(page.getByText("PortiereCasa")).toBeVisible();
  await expect(page.getByText("AllenatoreOspite")).toBeVisible();
  // E nessun rimando che sostituisca il dato: il link a Sky resta un'uscita,
  // non il contenuto della scheda.
  await expect(page.getByText("Vedi formazioni su Sky Sport")).toHaveCount(0);

  // --- Modulo
  await page.getByRole("tab", { name: "Modulo" }).click();
  await expect(page.getByText("4-3-3")).toBeVisible();
  await expect(page.getByText("3-5-2")).toBeVisible();
  await expect(page.getByText("Vedi modulo su Sky Sport")).toHaveCount(0);

  // --- Cronologia: i tre tipi di fatto, in ordine di minuto.
  await page.getByRole("tab", { name: "Cronologia eventi" }).click();
  await expect(page.getByText("Ammonizione")).toBeVisible();
  await expect(page.getByText(/esce EsceCasa/)).toBeVisible();
  const minuti = await page.locator("li", { hasText: /^\d+'/ }).allInnerTexts();
  const numeri = minuti.map((t) => Number(/(\d+)'/.exec(t)?.[1] ?? 0)).filter((n) => n > 0);
  expect(numeri, "la cronologia non e' ordinata per minuto").toEqual(
    [...numeri].sort((a, b) => a - b),
  );

  // Tre schede aperte, **una sola** richiesta: la chiave di cache e' la stessa,
  // e React Query deduplica per chiave e non per componente.
  expect(richieste, "ogni scheda si e' scaricata il dettaglio per conto suo").toHaveLength(1);
});

/**
 * Il difetto numero due, dalla parte del browser: il risultato si leggeva solo
 * aprendo il dettaglio e poi la sua quarta scheda.
 */
test("dettaglio partita: di una partita giocata il risultato si vede subito", async ({ page }) => {
  await installSportsApiMocks(page);

  const richieste: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("action=match-detail")) richieste.push(r.url());
  });

  await page.goto("/squadra/juventus/partite/serie-a-2099-04-12-juventus-vs-inter");
  await expect(page.getByRole("heading", { name: /Juventus – Inter/ })).toBeVisible();

  // Punteggio, esito, marcatori con il minuto e arbitro: **senza aprire
  // niente**.
  await expect(page.getByText("3 a 1")).toBeVisible();
  await expect(page.getByText("Vittoria Juventus")).toBeVisible();
  await expect(page.getByText("MarcatoreOspite")).toBeVisible();
  await expect(page.getByText(/Arbitro M\./)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Risultato" })).toHaveCount(0);

  // Il costo: una richiesta, ed e' quella che porta cio' per cui si e' aperta
  // la pagina. Aprire una scheda dopo non ne fa una seconda.
  expect(richieste).toHaveLength(1);
  await page.getByRole("tab", { name: "Cronologia eventi" }).click();
  await expect(page.getByText("Ammonizione")).toBeVisible();
  expect(richieste, "la scheda si e' riscaricata il dettaglio").toHaveLength(1);
});

test("dettaglio partita: senza id della fonte lo dice, invece di caricare all'infinito", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  // La seconda partita della fixture non ha `skyMatchId`, come una partita che
  // la fonte pubblica senza identificativo.
  await page.goto("/squadra/juventus/partite/champions-league-2099-05-03-inter-vs-juventus");
  await page.getByRole("tab", { name: "Formazione" }).click();
  await expect(page.getByText(/non pubblica un identificativo/)).toBeVisible();
});

/**
 * Le preferenze sono di tutti: tema, squadra, voci del menu' e notifiche si
 * salvano sul dispositivo anche senza account, quindi il pulsante che apre il
 * pannello compare sempre. Accanto, solo per chi non ha effettuato l'accesso,
 * resta la porta d'ingresso.
 */
test("preferenze: senza accesso il pannello si apre, e c'e' la porta d'ingresso", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  const pannello = page.getByRole("dialog");
  await expect(pannello.getByRole("heading", { name: "Preferenze" })).toBeVisible();
  await expect(
    pannello.getByRole("combobox", { name: "Squadra di calcio preferita" }),
  ).toBeVisible();
  await pannello.getByRole("button", { name: "Close" }).click();

  const accedi = page.getByRole("link", { name: "Accedi" });
  await expect(accedi).toBeVisible();
  await accedi.click();
  await expect(page).toHaveURL(/\/accedi$/);
});

/** Anche l'indirizzo diretto: apre il pannello e torna alla home, per tutti. */
test("preferenze: /preferenze senza accesso apre il pannello e torna alla home", async ({
  page,
}) => {
  await installSportsApiMocks(page);
  await page.goto("/preferenze");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Preferenze" })).toBeVisible();
});

/**
 * La pagina iniziale, provata dove conta: nel browser, con una sessione vera.
 * Fino a che l'impalcatura dell'accesso non e' esistita, questo percorso era
 * coperto solo dai test unitari — che non hanno un indirizzo da guardare.
 */
test("avvio: la pagina scelta vince sulla radice", async ({ page }) => {
  await installSportsApiMocks(page);
  await accediComeUtente(page, { start_page: "calendario" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/calendario$/);
});

/**
 * «Squadra di calcio» e' una sezione, non un indirizzo memorizzato: si compone
 * al momento sulla squadra preferita, altrimenti chi cambia squadra resterebbe
 * con la pagina iniziale puntata su quella vecchia.
 */
test("avvio: la squadra come pagina iniziale segue la preferenza", async ({ page }) => {
  await installSportsApiMocks(page);
  await accediComeUtente(page, { start_page: "squadra", favorite_team: "napoli" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/squadra\/napoli$/);
});

/** La Home non sparisce: ha un indirizzo suo, e la voce del menu' ci porta. */
test("avvio: la Home resta raggiungibile anche se non e' la pagina iniziale", async ({ page }) => {
  await installSportsApiMocks(page);
  await accediComeUtente(page, { start_page: "calendario" });
  await page.goto("/");
  await expect(page).toHaveURL(/\/calendario$/);

  await voceMenu(page, "HOME").click();
  await expect(page).toHaveURL(/\/home$/);
});

/**
 * Il caso piu' frequente non paga niente: senza accesso la radice mostra la
 * Home dov'e' sempre stata, senza rimbalzi, e i link verso `/` gia' in
 * circolazione continuano a valere.
 */
test("avvio: senza accesso la radice resta la Home", async ({ page }) => {
  await installSportsApiMocks(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Preferenze" })).toHaveCount(0);
});

/**
 * Il difetto fotografato dal proprietario, dalla parte del browser.
 *
 * L'orologio si congela **prima** della navigazione: il primo render leggerebbe
 * altrimenti l'ora vera, e una partita datata 2099 sarebbe futura.
 */
test("durante la partita la card in cima non la chiama piu' «prossima»", async ({ page }) => {
  await page.clock.setFixedTime(new Date(ORA_CON_PARTITA_IN_CORSO));
  await installSportsApiMocks(page);
  await page.goto("/squadra/juventus");
  await expect(page.getByRole("heading", { name: "Juventus" })).toBeVisible();

  // «In corso» al posto di «Prossima Partita», e il punteggio senza aprire
  // niente: era l'unico modo per leggerlo, in fondo a una scheda del dettaglio.
  await expect(page.getByText("In corso").first()).toBeVisible();
  await expect(page.getByText("Prossima Partita")).toHaveCount(0);
  await expect(page.getByText("1 a 2").first()).toBeVisible();
});

test("prima del fischio d'inizio la card resta un annuncio", async ({ page }) => {
  // Senza orologio congelato le partite della fixture sono tutte future.
  await installSportsApiMocks(page);
  await page.goto("/squadra/juventus");
  await expect(page.getByText("Prossima Partita")).toBeVisible();
});
