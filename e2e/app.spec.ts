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
  await expect(page).toHaveURL(/\/squadra\/juventus$/);
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

test("preferenze: la squadra si sceglie da una tendina che non chiude il pannello", async ({
  page,
}) => {
  await installSportsApiMocks(page);
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

  await page.getByRole("option", { name: "Napoli", exact: true }).click();

  // La ragione per cui questo test vive in Playwright e non in jsdom: il
  // contenuto della tendina e' in un portale fuori dallo Sheet, e la sua
  // chiusura non deve arrivare al dialog sotto. Se ci arrivasse, il pannello
  // sparirebbe subito dopo la scelta.
  await expect(pannello).toBeVisible();
  await expect(tendina).toHaveText("Napoli");

  // Sul dispositivo finisce lo **slug**, non il nome: e' il valore che la
  // migrazione copia nel profilo al primo accesso.
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("cse-favorite-team")))
    .toBe("napoli");

  // E la scelta sopravvive alla chiusura del pannello e a un cambio pagina.
  await page.keyboard.press("Escape");
  await expect(pannello).toBeHidden();
  await page.getByRole("link", { name: "FORMULA 1" }).click();
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
  await page.goto("/");

  await page.getByRole("button", { name: "Preferenze" }).click();
  const tendina = page.getByRole("combobox", { name: "Squadra di calcio preferita" });
  await tendina.click();
  await page.getByRole("option", { name: "Napoli", exact: true }).click();
  // La scelta e' registrata prima di chiudere: l'Escape che arrivasse mentre
  // la tendina si sta ancora chiudendo verrebbe consumato da lei, e il
  // pannello — che e' modale — resterebbe aperto sopra il menu.
  await expect(tendina).toHaveText("Napoli");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

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

test("squadra: gli highlights esistono solo per la Juventus", async ({ page }) => {
  await installSportsApiMocks(page);

  await page.goto("/squadra/juventus");
  await expect(page.getByRole("tab", { name: "Highlights" })).toBeVisible();

  await page.goto("/squadra/napoli");
  await expect(page.getByRole("tab", { name: "Calendario" })).toBeVisible();
  // Sparisce la scheda, non il suo contenuto: una linguetta che si apre sul
  // vuoto prometterebbe dei video che per le altre diciannove non esistono.
  await expect(page.getByRole("tab", { name: "Highlights" })).toHaveCount(0);
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
  const fontNapoli = await napoli
    .locator("h1, h2, h3")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontNapoli).toContain("Inter");

  await page.goto("/squadra/juventus");
  const fontJuve = await page
    .locator(".team-theme")
    .locator("h1, h2, h3")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontJuve).toContain("Oswald");
});
