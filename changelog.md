<!-- markdownlint-disable MD024 -->

# Changelog

Questo file adotta la struttura di **Keep a Changelog**, adattata alle regole
operative del repository.

Le voci sotto riportate distinguono tra modifiche **verificate** e storico Git
**non normalizzato**. Quando una modifica tocca fonti dati fragili, scraping,
dataset statici o policy sensibili su `main`, questo viene esplicitato.

## [Unreleased]

> **Nota**: tutte le voci sotto sono UI/UX only sopra la baseline `2.1.0`.
> Nessun cambio di stack, fonti dati, schema payload, edge function, branch
> policy o policy Lovable. La versione applicativa esposta dal footer e da
> `src/lib/version.ts` resta `2.1.0`.

### Added

- **Estensione guard CI titoli pagina/modali**. `scripts/check-italian-ui.mjs` ora cattura anche `document.title` assegnato via template literal (parte statica prima di `${...}`), il contenuto testuale di `<DialogTitle>`/`<AlertDialogTitle>`/`<SheetTitle>`/`<DrawerTitle>`/`<SidebarTitle>` (kind `dialog-title:<Tag>`) e la prop `title="..."` su qualunque componente il cui nome contiene `Dialog`/`Modal`/`Sheet`/`Drawer` (kind `dialog-title-prop:<Tag>`). I report di errore usano prefissi espliciti `TITOLO PAGINA (document.title)` e `TITOLO MODALE (<Tag>)` / `TITOLO MODALE (prop title su <Tag>)` per facilitare il triage. Validato con 4 test negativi (`document.title = "Settings"`, `document.title = \`Settings · ${app}\``, `<DialogTitle>Close window</DialogTitle>`, `<ConfirmDialog title="Delete item">`): tutti falliscono come previsto, baseline corrente resta a 0 violazioni. Documentazione aggiornata in `README.md`. Nessuna modifica UI, nessuna nuova dipendenza, allowlist e `FORBIDDEN_WORDS` invariati. Versione applicativa invariata `2.1.0`.

- **Audit lingua UI completo + rafforzamento `check-italian-ui`**. Eseguito sweep manuale e automatico su tutte le superfici testuali utente (`index.html`, `public/manifest.webmanifest`, JSX, attributi ARIA, `placeholder`, `title`, `alt`, `sr-only`, toast Sonner, `document.title`): **0 stringhe inglesi residue**, baseline confermata pulita. Esteso `scripts/check-italian-ui.mjs` con nuove superfici di analisi: attributi `aria-describedby`, `aria-roledescription`, `aria-valuetext`, prop di componenti `subtitle` e `description`, primo argomento dei `toast(...)`/`toast.success(...)`/`toast.error(...)`/`toast.info(...)`/`toast.warning(...)`/`toast.loading(...)` (kind `toast-message`) e assegnazioni `document.title = "..."` (kind `document-title`). Aggiunto commento esplicativo su `Home`, `Sport`, `Open` nell'allowlist (uso italiano corrente o nomi propri di tornei). Documentati in `README.md` i marker `// @lingua-ignore` (riga) e `@lingua-ignore-file` (file) come escape valves. Nessuna modifica UI, nessuna nuova dipendenza, allowlist invariata. Versione applicativa invariata `2.1.0`.

- **Guard CI lingua italiana**. Nuovo script `scripts/check-italian-ui.mjs` (Node ESM, zero dipendenze) che scansiona `src/**/*.{ts,tsx}` (escluse `src/components/ui/*`, file `*.test.*`/`*.spec.*` e `*.d.ts`), estrae testo JSX e attributi UI (`aria-label`, `aria-description`, `placeholder`, `title`, `alt`) e fallisce con exit 1 se compaiono parole inglesi proibite (`Best`, `Live`, `Loading`, `Close`, `Next`, `Previous`, `Page`, `Found`, `Toggle`, `Sidebar`, `Cancel`, ecc.) fuori allowlist (brand, sigle tecniche, nomi propri, eccezioni `STREAMING`/`CALENDAR EVENTS`). Nuovo script npm `check:italian` e nuovo step `Italian UI guard` aggiunto ai workflow `.github/workflows/ci-pr-main.yml` e `.github/workflows/ci-develop.yml` (job `quality`, dopo `Lint`, prima di `Unit tests`). Marker per skip mirato: `// @lingua-ignore` (riga) e `@lingua-ignore-file` (intero file). Documentato in `README.md`, `AGENTS.md` e `.github/instructions/frontend.instructions.md`. Versione applicativa invariata `2.1.0`.

- **Sinner – restyling premium del player header**. Riprogettato `src/components/sinner/PlayerHeader.tsx`: foto profilo portrait 4:5 (`w-28 h-36` mobile / `w-32 h-40` desktop) con `object-cover object-top` per non tagliare la testa nel ritaglio US Open 2025, alone gold (`gold-gradient` blur) decorativo e ring oro doppio con offset su `--card`. Statistiche chiave riorganizzate in 3 KPI card (Ranking ATP, Stagione 2026, Miglior ranking) con label gold uppercase e ranking in `text-gold-gradient`. Bio (Altezza/Peso/Mano/Nato a/Coach) ora in chip arrotondati con icone Lucide (`Ruler`, `Weight`, `Hand`, `MapPin`, `UserRound`), wrap responsive. Sezione Grande Slam: chip vincitori con sfondo `gold-gradient` premium, non vincitori su `bg-secondary/30`, separati da divider. Footer fonte spostato sotto divider con icona `Info` e size leggibile. Token semantici (`--card`, `--muted`, `--primary`, `--border`, `--secondary`) verificati in light + dark. API prop invariate, nessuna regressione su `SinnerPage.tsx`. Versione applicativa invariata `2.1.0`.

- **Italianizzazione totale UI + policy memorizzata**. Tradotti i residui inglesi nei componenti shadcn (`pagination.tsx`: `Previous`/`Next`/aria → `Precedente`/`Successiva`; `dialog.tsx` e `sheet.tsx`: sr-only `Close` → `Chiudi`; `sidebar.tsx`: `Toggle Sidebar` → `Apri/chiudi barra laterale`; `carousel.tsx`: `Previous slide`/`Next slide` → `Slide precedente`/`Slide successiva`; `breadcrumb.tsx`: aria `breadcrumb` → `percorso`, sr-only `More` → `Altro`), `src/pages/NotFound.tsx` (`Page not found` → `Pagina non trovata`, `Return to Home` → `Torna alla Home`), `src/components/sinner/PlayerHeader.tsx` (`Best ranking` → `Miglior ranking`) e `src/components/common/EventCard.tsx` (badge `LIVE` → `IN DIRETTA`). Memorizzata la policy "Italian-only UI" in `AGENTS.md` (sezione "Regole di modifica") e in `.github/instructions/frontend.instructions.md`: tutta l'UI deve essere in italiano, uniche eccezioni `STREAMING` e `CALENDAR EVENTS`; nomi propri e sigle tecniche restano invariati. Versione applicativa invariata `2.1.0`.

- **Sinner – profilo da Wikipedia Italia (foto US Open 2025, peso, palmarès Slam)**. La action `player-info` di `supabase/functions/sports-tennis/index.ts` ora legge `https://it.wikipedia.org/wiki/Jannik_Sinner` invece della voce inglese: nuovo parser per il template `infobox sinottico` (etichette IT: `Altezza`, `Peso`, `Vittorie/sconfitte`, `Titoli vinti`, `Miglior ranking`, `Ranking attuale`), nuovo parser palmarès Grande Slam (Australian Open, Roland Garros, Wimbledon, US Open + Tour Finals) ed estrazione della data "Statistiche aggiornate al ...". Aggiunti i campi `weight`, `slamResults`, `statsUpdatedAt` al payload e al componente `src/components/sinner/PlayerHeader.tsx` (nuova riga `Peso` nel `<dl>`, sezione "Grande Slam" con chip per torneo, footer "Fonte: Wikipedia Italia · Statistiche aggiornate al ..."). Foto profilo aggiornata alla versione `Jannik_Sinner_US_Open_2025_(cropped).jpg` (immagine principale dell'infobox IT). Stagione 2026 (calendario, match, risultati round-per-round) **resta su Wikipedia EN** perché la voce stagione IT non esiste in modo stabile: doppia fonte dichiarata in `README.md`. Cache server-side 30 minuti invariata. Versione applicativa invariata `2.1.0`.

- **Sinner – dati live da Wikipedia + ranking #1 + foto profilo**. Riscritta `supabase/functions/sports-tennis/index.ts` per leggere ranking corrente, infobox carriera, calendario 2026 e match round-per-round (opponent + ranking opponent + score + esito V/S) scrapando tre pagine pubbliche di Wikipedia (`Jannik_Sinner`, `2026_Jannik_Sinner_tennis_season`) con cache server-side 30 minuti per fair use. Sostituisce i dataset statici 2026 che falsamente dichiaravano fonte "ATP Tour". Nuovo componente `src/components/sinner/PlayerHeader.tsx` con foto Wikimedia Commons in alto a sinistra (96×96, ring gold, fallback iniziali "JS"), ranking ATP Singolare in grande con data aggiornamento ("aggiornato al 13 aprile 2026"), record stagione 2026 (24-2 92.31%, 3 titoli), best ranking, altezza, mano, città di nascita, coach. Card match in `SinnerPage.tsx` ora mostra round (1R/QF/SF/F), ranking avversario e chip esito V/S con token `--success` / `--destructive`. Card tornei mostra tier, location, surface, date range e risultato. Hook `useSinnerInfo` allineato a stale time 30 minuti. Home page invariata, ma `useSinnerNextEvent` riceve automaticamente il prossimo torneo reale (Madrid Open 22 aprile). **Verifica esplicita fatta**: ATPTour.com è SPA, non scrapabile da Edge Function senza browser headless. Wikipedia è scelta consapevole con limiti dichiarati (latenza 24-48h, fragilità parser regex, solo stagione 2026). Versione invariata `2.1.0`.

- **Indicatore stato offline/online + schermata di fallback**. Nuovo hook `src/hooks/useOnlineStatus.ts` basato su `navigator.onLine` + listener `online`/`offline`, espone anche `justReconnected` (true per ~3s al ritorno online). Nuovo componente `OfflineIndicator` (`src/components/common/OfflineIndicator.tsx`): banner sticky in cima al `<main>` con token `--destructive`, animato con Framer Motion (180ms slide-down), `role="status"` + `aria-live="polite"`. Nuovo componente `OfflineFallback` (`src/components/common/OfflineFallback.tsx`): schermata grande con icona `WifiOff`, mostrata nelle pagine eventi (Home, Formula 1, MotoGP, Juventus, Sinner) quando tutte le query falliscono **e** non c'e cache **e** il browser e offline; pulsante "Riprova" disabilitato finche non torna la connessione. Toast Sonner "Connessione ripristinata" gestito in `Layout.tsx` su `justReconnected`. **Niente service worker, niente `vite-plugin-pwa`, nessun manifest aggiornato**: l'app resta una SPA standard, la cache React Query e in memoria (un hard reload offline mostra il fallback). Versione invariata `2.1.0`.

- Pagina **Preferenze** (`/preferenze`) per visualizzare e modificare in un unico posto le stagioni salvate di Sinner, Juventus, Formula 1 e MotoGP. Ogni card mostra la stagione corrente in grande con `text-gold-gradient`, un `SeasonSelector` riutilizzato, conferma visiva immediata tramite chip "Salvato" (token semantico `--success` aggiunto a `index.css` + `tailwind.config.ts`, leggibile in light e dark) e toast Sonner. Pulsante "Ripristina valori predefiniti" che resetta tutte le stagioni a `max(currentYear, 2026)`. Sync cross-componente live tramite `CustomEvent("cse-seasons-changed")` ascoltato da `useSeasonPreferences`, così le pagine sportive già montate riflettono il cambio senza reload. Voce di navigazione **Preferenze** aggiunta in `Header.tsx` con icona `Settings` di `lucide-react`. Chiave `localStorage` invariata (`cse-seasons`), versione invariata `2.1.0`.

- Badge "Orari in ora italiana · CET/CEST" nelle pagine eventi (Home, Formula 1, MotoGP, Juventus, Sinner, Streaming). La sigla DST è calcolata runtime via `Intl.DateTimeFormat` con `timeZone: "Europe/Rome"`, quindi resta sempre coerente al passaggio CET ↔ CEST. Tooltip esplicativo accessibile via mouse e tastiera.
- **Performance – transizioni globali tema scoped al toggle**: rimossa la
  regola permanente `*, *::before, *::after { transition: ... }` da
  `src/index.css`. La transizione 280ms ease su `background-color`,
  `border-color`, `color`, `fill`, `stroke`, `box-shadow` ora si attiva
  solo quando `<html>` ha la classe `theme-transitioning`, applicata da
  `useTheme.ts` per 320ms al cambio sole/luna (skip al primo mount).
  Effetto visivo del toggle invariato; eliminato il costo di style
  recalc/paint su hover, focus e mount in pagine con molti nodi
  (`/streaming`, `/formula1`, `/motogp`, `/juventus`). Rispetto di
  `prefers-reduced-motion` mantenuto. Rimossa la classe orfana
  `.theme-no-transition`. Nessun cambio funzionale, versione invariata
  `2.1.0`.

- **Badge broadcaster: copertura estesa** oltre DAZN/Sky con helper unico
  `src/lib/broadcasterStyle.ts`. Aggiunti token `--brand-now`, `--brand-amazon`,
  `--brand-mediaset`, `--brand-rai`, `--brand-tv8`, `--brand-discovery`,
  `--brand-eurosport` in `:root` e `.dark` (tinte schiarite per dark).
  `Index.tsx` e `JuventusPage.tsx` ora usano `getBroadcasterStyle()` invece
  del condizionale inline `if DAZN else Sky`. Broadcaster sconosciuti hanno
  fallback neutro (`bg-muted text-foreground border-border`) sempre leggibile
  in entrambi i temi. DAZN e Sky restano visivamente identici. Nessun cambio
  funzionale, versione invariata `2.1.0`.

- **Theme-color dinamico per browser chrome / PWA**: il `<meta name="theme-color">`
  neutro (senza `media`) viene ora scritto inline in `index.html` in base al tema
  salvato in `localStorage` (`cse-theme`) prima del primo paint, e aggiornato
  runtime da `useTheme.ts` ad ogni toggle sole/luna. La barra di stato del
  browser e la chrome PWA seguono il tema scelto dall'utente
  (`#0B1A33` dark, `#F5F7FA` light) indipendentemente da `prefers-color-scheme`.
  I due `<meta theme-color media="...">` esistenti restano come fallback.
  `manifest.webmanifest` invariato (splash PWA resta navy). Nessun cambio
  funzionale, versione invariata `2.1.0`.

- **Refactor – colori hardcoded estratti in CSS variables semantici**:
  introdotti nuovi token `--brand-dazn`, `--brand-dazn-contrast`,
  `--brand-sky`, `--brand-ducati`, `--brand-aprilia`, `--brand-ktm`,
  `--brand-yamaha`, `--brand-honda` in `:root` e `.dark` con tweak di
  leggibilità per il tema scuro. `MOTOGP_CONSTRUCTOR_COLORS`,
  badge DAZN/Sky in `Index.tsx` e `JuventusPage.tsx` ora referenziano
  i nuovi token (`hsl(var(--brand-*))`) invece di literal HEX/rgba.
  `COMPETITION_COLORS` Juve rimappato sulla palette oro/blu (Serie A
  oro, Champions accent, Coppa Italia secondary navy) per seguire
  automaticamente il cambio tema. Identità visiva invariata, brand
  colors centralizzati in un unico punto. Nessun cambio funzionale,
  versione invariata `2.1.0`.

- **Tema chiaro/scuro – transizioni fluide e palette oro/blu rifinita**:
  aggiunto script inline anti-FOUC in `index.html` che applica la classe
  tema da `localStorage` prima del render React (no flash al boot).
  Aggiornata palette light in `src/index.css` con tinta blu più
  percepibile (background `220 30% 96%`, card `220 25% 99%`, secondary
  navy `220 60% 25%`, border `220 25% 84%`) per rafforzare l'identità
  oro/blu anche in light. Aggiunte transizioni globali fluide ~280ms su
  proprietà di colore (`background-color`, `border-color`, `color`,
  `fill`, `stroke`, `box-shadow`) con rispetto di
  `prefers-reduced-motion`. Sincronizzato `color-scheme` su
  `documentElement` per chrome nativo (scrollbar, input). Badge
  broadcaster DAZN/Sky in Home ora con varianti light/dark dedicate.
  Nessun cambio funzionale, versione invariata `2.1.0`.

- **MotoGP – colori brand costruttori nella classifica costruttori**: il
  logo di ogni team nella tab "Classifica Costruttori" su `/motogp` è ora
  racchiuso in una cornice con bordo colorato e sfondo soft basato
  sull'identità visiva del costruttore (Ducati rosso, Aprilia nero, KTM
  arancione, Yamaha blu, Honda rosso). Backend `sports-motogp` espone un
  nuovo campo `constructor: string | null` nel payload
  `constructor-standings` (riusa `getTeamConstructor`); colori statici
  vivono solo nel frontend (`MOTOGP_CONSTRUCTOR_COLORS` in
  `src/pages/MotoGPPage.tsx`). Team senza constructor mappato mostrano
  cornice neutra. Backward-compatible.
- **MotoGP/F1 – bandiera nazionalità nella classifica piloti**: aggiunta
  mini bandiera SVG (~20x14px) accanto al nome pilota nella tab
  "Classifica Piloti" sia su `/motogp` sia su `/formula1`. Caricata da
  `https://flagcdn.com/{cc}.svg` (CDN pubblico). Per F1 usa il campo
  `nationality` già esposto da Jolpica, mappato a ISO-2 lato frontend
  (`src/lib/f1Utils.ts`). Per MotoGP aggiunto campo
  `nationality: string | null` (ISO-2 lowercase) nel payload `standings`
  con mappa statica `MOTOGP_RIDER_NATIONALITY_BY_SURNAME` allineata 1:1
  alla mappa numeri di gara. Backward-compatible. Piloti/driver senza
  nazionalità mappata (wildcard MotoGP, eventuale nazionalità F1 non in
  mappa) non mostrano la bandiera — nessun fallback inventato, nessun
  broken image grazie a `onError`. Richiede deploy edge function
  `sports-motogp`. Versione applicativa invariata `2.1.0`.
- **MotoGP – numero di gara nella classifica piloti**: aggiunto badge tondo
  con il numero di gara accanto alla foto del pilota nella tab "Classifica
  Piloti" di `/motogp`. Mappa statica per la griglia 2026 in
  `supabase/functions/sports-motogp` (campo `number: number | null` nel
  payload `standings`, backward-compatible). I piloti senza numero mappato
  (es. wildcard) non mostrano il badge — nessun fallback inventato.
  Richiede deploy edge function `sports-motogp`. Versione applicativa
  invariata `2.1.0`.
- **Sinner – allineamento header e messaggi**: rimosso sottotitolo
  "Dati da ATP Tour" dall'header della pagina `/sinner` e normalizzati i
  messaggi di loading/empty rimuovendo i riferimenti a "ATP Tour" e allo
  scraping. Allineamento UX con le altre pagine sportive (Formula 1,
  MotoGP, Juventus) che non espongono la fonte dati nel sottotitolo.
  Nessun cambio a edge function `sports-tennis`, hook o shape payload.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – calendario 2026 allineato a motogp.com**: corretto nome del
  round 4 (Jerez, 24–26 aprile) da `GP d'Andalusia` a `GP di Spagna`,
  allineandolo al calendario ufficiale 2026 pubblicato su `motogp.com`.
  Nessun altro cambio: 21 round su 22 erano già corretti per date,
  località, circuiti e country code. Dataset resta hardcoded in
  `supabase/functions/sports-motogp` come previsto da `AGENTS.md`.
  Richiede deploy edge function `sports-motogp`. Nessun impatto su
  frontend, hook o shape payload. Versione applicativa invariata `2.1.0`.
- **Streaming – deep link al titolo sulla piattaforma**: il bottone
  "Vai a {provider}" nel dialog dettaglio uscita ora porta direttamente
  alla pagina del singolo titolo (deep link JustWatch/TMDB via campo
  `results.IT.link` di `/watch/providers`), con fallback automatico alla
  homepage del provider se il link non è disponibile. Edge function
  `streaming-releases`: `tmdbItemAvailableIT` rinominata in
  `tmdbItemProviderInfoIT` e ora ritorna `{ available, deepLink }`;
  `normalizeItem` propaga `deepLink` nel payload di ogni item.
- **Juventus – paginazione calendario (backend + frontend)**: l'action
  `calendar` di `supabase/functions/sports-football` ora accetta `page` e
  `pageSize` opzionali e, quando presenti, restituisce
  `{ items, total, page, pageSize, totalPages, nextUpcomingIndex }` invece
  dell'array piatto (retrocompatibilità preservata: senza parametri il
  payload resta un array). Frontend in `JuventusPage.tsx` mostra 12 partite
  per pagina con componente `Pagination` (shadcn) e atterra automaticamente
  sulla pagina che contiene la "Prossima" partita al primo caricamento;
  reset a pagina 1 al cambio stagione. `useJuventusCalendar` aggiornato per
  includere `page`/`pageSize` nella `queryKey` con `placeholderData` per UX
  fluida tra cambi pagina. Richiede deploy edge function `sports-football`.
  Versione applicativa invariata `2.1.0`.
- **Streaming – filtro "Solo in arrivo"**: aggiunto toggle nel tab Nuove
  uscite per nascondere le release con `releaseDate` già passata (utile
  quando il fallback "widened" allarga la finestra). Stato persistito in URL
  via `upcoming=1`. Versione applicativa invariata `2.1.0`.
- **Formula 1 – foto piloti completa**: risolto il caso "sagoma grigia
  vuota" per i rookie/piloti 2026 senza foto ufficiale sul CDN F1
  (`media.formula1.com` con direttiva Cloudinary `d_driver_fallback_image.png`
  che restituisce HTTP 200 + immagine placeholder, impedendo l'attivazione
  dell'`onError`). Modifiche in `supabase/functions/sports-f1/index.ts`:
  aggiunto helper `normalizeKey` (lowercase + rimozione accenti) per matchare
  correttamente nomi tipo "Pérez" / "Hülkenberg"; estesa mappa
  `F1_DRIVER_PHOTOS` con URL Wikimedia Commons verificati per `lindblad`,
  `perez`, `bottas`; invertita priorità: mappa statica vince su OpenF1
  quando definita. Aggiunto fallback `onError` sull'`<img>` foto pilota in
  `Formula1Page.tsx` come safety net. Richiede deploy edge function
  `sports-f1`. Versione applicativa invariata `2.1.0`.
- **Formula 1 – fix loghi costruttori**: sostituiti i 10 URL nella mappa
  `F1_CONSTRUCTOR_LOGOS` (`supabase/functions/sports-f1/index.ts`) con
  asset stabili da Wikimedia Commons / Wikipedia EN — gli URL precedenti
  su `media.formula1.com/.../teams/2025/<team>-logo.png.transform/2col/...`
  restituivano 404 per diverse scuderie (RB, Kick Sauber, Alpine, ecc.),
  causando spazi vuoti nella tab "Costruttori". Aggiunto fallback `onError`
  sull'`<img>` del logo in `Formula1Page.tsx` per nascondere immagini rotte
  (stessa strategia già adottata per MotoGP). Tutti i 10 URL verificati
  200 OK prima del commit. Richiede deploy edge function `sports-f1`.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – fix loghi costruttori**: corretti gli URL nella mappa
  `MOTOGP_CONSTRUCTOR_LOGOS` (Ducati, Aprilia, KTM, Yamaha, Honda) — gli URL
  precedenti su `resources.motogp.pulselive.com` erano placeholder non
  esistenti (404). Ora puntano a Wikipedia Commons. Aggiunto fallback
  `onError` su `<img>` in `MotoGPPage.tsx` per nascondere immagini rotte.
  Versione applicativa invariata `2.1.0`.
- **MotoGP – nomi piloti completi e foto wildcard/sostituti**: la classifica
  piloti `/motogp` ora espande i nomi brevi di Sky Sport (es. "Pirro M.")
  in formato "Nome Cognome" (es. "Michele Pirro") tramite mappa
  `MOTOGP_RIDER_FULL_NAMES` con fallback al nome originale. Aggiunte foto
  per wildcard/sostituti (Pirro, Savadori, Pedrosa, Crutchlow, Bradl).
  F1: formato nome già corretto (`givenName + familyName` da Jolpica),
  nessuna modifica. Versione applicativa invariata `2.1.0`.
- **Formula 1 – rimossa nota "Dati reali da Jolpica/Ergast API"** dal
  sottotitolo della pagina `/formula1`: il `subtitle` del `SectionHeader`
  non viene più mostrato. Fonte dati invariata lato edge function
  `sports-f1` (Jolpica + OpenF1 + fallback statici). Versione applicativa
  invariata `2.1.0`.
- **MotoGP – rimossa nota "Dati da Sky Sport"** dal sottotitolo della pagina
  `/motogp`: il `subtitle` del `SectionHeader` non viene più mostrato. Fonte
  dati invariata lato edge function `sports-motogp` (Sky Sport + calendario
  statico 2026 + mapping). Versione applicativa invariata `2.1.0`.
- **Juventus – rimossa nota "Dati reali da Sky Sport Italia"** dal sottotitolo
  della pagina `/juventus`: il `subtitle` del `SectionHeader` non viene più
  mostrato. Fonte dati invariata lato edge function `sports-football`
  (Sky Sport Italia + Lega Serie A). Versione applicativa invariata `2.1.0`.
- **Streaming – rimossa nota informativa fonte palinsesto TV** nel tab
  `/streaming?tab=tv`: il paragrafo che indicava
  `staseraintv.com` come fonte di scraping non viene più mostrato in UI.
  Logica di scraping invariata lato edge function `streaming-tv`
  (resta `staseraintv.com` con fallback `superguidatv.it`).
  Versione applicativa invariata `2.1.0`.
- **Streaming – rimosso messaggio informativo "finestra estesa"** nel tab
  `/streaming?tab=releases`: l'avviso che compariva quando l'edge function
  `streaming-releases` attivava il fallback `widenedWindow` non viene più
  mostrato in UI. La logica backend resta invariata (il fallback widened
  rimane attivo per evitare griglie vuote, ma silenziosamente). Versione
  applicativa invariata `2.1.0`.
- **Streaming – badge "giorni mancanti" su ciascuna nuova uscita**
  (`src/components/streaming/ReleaseCountdownBadge.tsx`): accanto al titolo
  di ogni card del tab `/streaming?tab=releases` viene mostrato un badge
  compatto che indica la distanza in giorni di calendario tra `releaseDate`
  e oggi (fuso `Europe/Rome`). Stati: "Oggi" / "Domani" (accento gold),
  "Tra N giorni" (outline neutro), "Già uscito" (muted, utile quando scatta
  il fallback `widenedWindow`). Calcolo affidato alla nuova utility
  `daysUntilRome` in `src/lib/dateUtils.ts` che confronta le date come
  `YYYY-MM-DD` in timezone italiano via `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })`,
  evitando drift DST. Layout card invariato (badge in `flex-wrap` accanto al
  titolo). Versione applicativa invariata `2.1.0`.
- **Countdown live** al prossimo evento sportivo dentro ogni `EventCard`:
  nuovo componente `src/components/common/EventCountdown.tsx` (tick `1s` via
  `setInterval`) che mostra giorni / ore / minuti / secondi residui rispetto
  a `startDate` (ISO). Per eventi entro una finestra di ±3 ore dall'inizio
  mostra un badge "Inizio imminente" con pallino rosso pulsante. Integrato in
  `EventCard` tramite la nuova prop `startDate?: string` e applicato a tutte
  le pagine: Home (`Index.tsx`), Sinner, Juventus (card custom partite, con
  `EventCountdown` impostato direttamente nella colonna risultato), F1 e
  MotoGP. Quando lo `status` e' `completato` il countdown non viene
  renderizzato.
- **Highlight "Prossimo" assoluto in Home**: la prima card di "Prossimi
  Eventi" (lista gia' ordinata cronologicamente in `Index.tsx`) riceve
  `highlight={true}`, che attiva bordo gold pieno + ring + badge gradient
  "Prossimo" sopra la card. Le altre card mantengono il bordo gold tenue.
- **Restyling premium delle card eventi** (`EventCard.tsx`): bordo
  `border-[hsl(var(--gold))]/20` con hover `/55`, top accent line gold a
  gradiente, glow radiale gold soft on-hover, hover lift `y: -4` con shadow
  `-18px hsl(var(--gold)/0.45)`, badge "Prossimo" con gradiente
  `gold-dark -> gold -> gold-light`. Stesso trattamento applicato alle card
  custom partite di `JuventusPage.tsx` per coerenza visiva (hover lift `y:
  -3`, shadow gold, top line, glow radiale, badge gradient).
- **Glow pulsante gold** sull'icona della voce di navigazione attiva
  (`Header.tsx`), sincronizzato con il loop di scintille (`SparkleLoop`).
- **Icona PWA dedicata** (`public/favicon.png`, 1024x1024 PNG): nuova
  icona quadrata coerente con il brand "Calendar Events" (calendario
  gold su sfondo navy `#0B1A33`, monogramma "CE"), usata sia come
  favicon (`<link rel="icon">` e `apple-touch-icon` in `index.html`) sia
  come icona PWA installabile (`public/manifest.webmanifest`, entries
  `purpose: any` e `purpose: maskable`). Sostituisce il riferimento
  precedente a un `favicon.png` non presente nel repository, eliminando
  l'icona generica del browser su Add-to-Home-Screen iOS/Android.

### Fixed

- **Streaming – Nuove uscite validate per l'Italia**: la edge function
  `streaming-releases` ora applica due livelli di filtro per garantire che
  ogni titolo mostrato sia effettivamente disponibile in abbonamento sul
  provider richiesto in regione IT. (1) TMDB Discover viene chiamato con
  `with_watch_monetization_types=flatrate`, escludendo titoli disponibili
  solo a noleggio/acquisto/ads sullo stesso provider (es. titoli del Prime
  Video Store che apparivano come "novita' Prime"). (2) Per ogni candidato
  viene chiamato `/{type}/{id}/watch/providers` (regione IT) e tenuto solo
  se `results.IT.flatrate` contiene il `provider_id` richiesto, garantendo
  disponibilita' corrente e non solo storica. Stesso filtro applicato anche
  al fallback con finestra estesa. UI: nuova nota informativa sotto il
  selettore range nel tab "Nuove uscite". Versione applicativa invariata
  `2.1.0` (bugfix di correttezza dati). Nessun nuovo segreto, nessuna
  nuova dipendenza.
- **Streaming – default famiglia TV su RAI**: atterrando su `/streaming`
  senza query string, il tab "TV stasera" ora seleziona di default la
  famiglia **RAI** invece di Sky Sport (fonte palinsesto piu' coperta in
  prima serata). Il fallback `initialFamily` in `src/pages/StreamingPage.tsx`
  passa da `"sky-sport"` a `"rai"`. La logica di sync URL state e l'ordine
  delle famiglie restano invariati: `?family=sky-sport` (o altra famiglia
  valida) continua a prevalere.
- **"Nuove uscite" sempre vuote**: la sezione `/streaming?tab=releases`
  mostrava `EmptyState` anche per provider attivi (Netflix, Prime, HBO Max)
  perche' i range UI di default ("Oggi", "Prossimi 3 giorni", "Prossimi 7
  giorni") erano troppo stretti rispetto al modo in cui TMDB indicizza i
  cataloghi streaming. TMDB Discover filtra per `primary_release_date` (film)
  / `first_air_date` (serie), non per data di ingresso sulla piattaforma in
  Italia, quindi finestre da 1-7 giorni restituiscono spesso 0 risultati anche
  con `TMDB_API_KEY` configurata e provider corretto. Tre interventi
  conservativi:
  1. **`src/pages/StreamingPage.tsx`**: sostituiti i tre range con finestre
     piu' realistiche — `7d` (Prossimi 7 giorni), `30d` (Prossimi 30 giorni,
     **nuovo default**), `90d` (Finestra estesa: -30 / +60 giorni).
  2. **`supabase/functions/streaming-releases/index.ts`**: aggiunto fallback
     trasparente lato backend. Quando la finestra richiesta restituisce 0
     items, l'edge function ritenta automaticamente con
     `dateFrom -= 14 giorni` e `dateTo += 30 giorni`, mantenendo provider e
     `watch_region=IT` invariati. Il payload espone `widenedWindow: boolean`
     e i campi `effectiveFrom` / `effectiveTo` per tracciabilita'. Cache
     invariata (1h, chiave per `provider:dateFrom:dateTo`).
  3. **EmptyState informativo**: messaggio aggiornato che spiega la natura
     del filtro TMDB + bottone "Allarga finestra" che imposta `range = "90d"`
     quando la finestra corrente e' vuota; quando il fallback widened scatta,
     un hint italic informa che si sta mostrando una finestra estesa.
  Verifica: curl edge function con Netflix range 7d → ritorna ≥10 items
  (widenedWindow=true), HBO Max range 30d → ritorna 3 items
  (widenedWindow=true). Versione applicativa invariata `2.1.0` (bugfix).
  Nessun cambio di provider TMDB, secret, scraping o dipendenze.

- **Leggibilita' "Stasera in TV" su mobile**
  (`src/components/home/TonightTvList.tsx`): le righe della tabella
  collassavano ora, badge canale, titolo lungo, badge genere e durata
  sulla stessa riga, rendendo i titoli (es. "Roberta Valente Notaio in
  Sorrento - Stagione 1 Episodio 3 - Cuba Libre") difficili da leggere
  su viewport stretti (≤640px). Introdotto layout responsive a 2 righe
  esclusivo del breakpoint mobile (`sm:hidden`): riga 1 con ora + badge
  canale + durata (allineata a destra via `ml-auto`), riga 2 con titolo
  full-width + badge genere. Layout desktop (`hidden sm:flex`)
  invariato. Nessuna modifica alla logica di filtraggio, ordinamento
  prima serata, paginazione o ai dati sottostanti.
- **Regressione di leggibilita' nelle card** (`EventCard.tsx`): rimosso
  `overflow-hidden` dal container (clippava badge "Prossimo" sporgente,
  countdown e contenuto wrappato) e aggiunto `relative z-[1]` ai contenitori
  figli (header, titolo, sottotitolo, riga date/time, children) in modo che
  il testo resti sempre sopra il glow radiale di hover. La riga date/time ha
  `flex-wrap` + `whitespace-nowrap` sui singoli token per evitare break
  innaturali. Verificato su Home, Sinner, F1, MotoGP, desktop 1366x768 e
  mobile 375x812.
- **Regressione di leggibilita' nelle card partite Juventus**
  (`JuventusPage.tsx`): rimosso `overflow-hidden` dalla card custom, aggiunto
  `relative z-[1]` ai blocchi competizione/data/broadcaster e al blocco
  risultato/countdown, glow radiale spostato a `inset-0`. Layout broadcaster
  passato a `flex-wrap` per evitare clipping di "DAZN | SKY".

### Verified

- Verifica anti-regressione manuale via browser tool su tutte le pagine
  sport (Home, Sinner, Juventus, F1, MotoGP) sia in viewport desktop
  (`1366x768`) sia mobile (`375x812`): countdown vivi, badge "Prossimo"
  visibile sulla prima card della Home e sulla prima card eligible delle
  pagine sport, nessun overflow o testo coperto da effetti di sfondo, card
  finite (Juventus `FullTime`, Sinner `completato`) non mostrano countdown
  come da logica.


## [2.1.0] - 2026-04-19 (rebrand "Calendar Events")

> **Nota**: release minor che marca il cambio identita' di prodotto da
> **"Calendar Sports"** a **"Calendar Events"** sopra la baseline
> `2.0.2`. Le voci storiche `2.0.0`, `2.0.1`, `2.0.2` restano archiviate
> piu' sotto come riferimento storico e non vengono riscritte.
> piu' sotto come riferimento storico e non vengono riscritte.

### Added

- **Rebrand applicazione**: nome prodotto cambiato da "Calendar Sports"
  a **"Calendar Events"**. Header con icona `CalendarDays` (Lucide) al
  posto di `Trophy`, logo testuale "Calendar Events" con accento gold
  sulla prima parola, footer semplificato a `CALENDAR EVENTS · v2.1.0`.
- Nuovo file `src/lib/version.ts` come unica fonte di verita' per
  `APP_VERSION` e `APP_NAME`, importato dal footer in
  `src/components/layout/Layout.tsx`.
- Sezione **Streaming** completa (`/streaming`) come prima voce di
  navigazione dopo Home, con due tab:
  - **TV stasera**: selettore famiglia canali (Sky Sport, Sky Cinema,
    RAI, Mediaset, Discovery), accordion per canale, paginazione (6
    canali per pagina), filtro server-side prime time 19:00-24:00
    Europe/Rome, stato sincronizzato in URL
    (`?tab=tv&family=rai&page=2`).
  - **Nuove uscite**: selettore provider (Netflix, Prime Video, Disney+,
    HBO Max), griglia poster TMDB con paginazione (8 per pagina), filtro
    pill **Tutti / Film / Serie**, selettore data **Oggi / 3 giorni / 7
    giorni**, dialog di dettaglio con overview, voto, cast top 6, link
    al provider e a TMDB.
- Edge function `streaming-tv` con scraping reale di
  `www.staseraintv.com` esteso a tutte le famiglie supportate dalla
  fonte: **RAI** (12 canali), **Mediaset** (13 canali), **Sky Cinema**
  (5 canali), **Discovery** (Real Time, DMax, Nove, Discovery
  Channel/Turbo, Food Network, HGTV, Giallo, K2, Frisbee). Cache
  in-memory 1h per `(slug, date)`, concorrenza limitata a 5 fetch
  paralleli.
- Edge function `streaming-releases` su TMDB `/discover` con range
  `dateFrom`/`dateTo` (default oggi..oggi+7), action `credits`
  (`type`+`id`) per cast top 10, cache in-memory 1h (24h per credits).
- Componente dedicato `src/components/home/TonightTvList.tsx` estratto
  da `Index.tsx` per ridurre complessita' e isolare la scheda
  "Stasera in TV".
- Quadro reale **Stasera in TV** in Home con aggregazione
  multi-famiglia (5 query parallele) e filtri rapidi user-friendly
  (chip selezionabili `Tutti / RAI / Mediaset / Sky Sport / Sky Cinema
  / Discovery`), un programma per canale nella fascia di prima serata
  (21:00 - 22:30), paginazione interna (8 canali per pagina), label
  famiglia e separatori oro tra gruppi su mobile, con icone Lucide
  (`Radio`, `Tv`, `Trophy`, `Film`, `Compass`).
- Badge **genere** + **durata** programma (`45 min` / `1h 25 min`) in
  ogni riga di "Stasera in TV", con utility `formatDuration` in
  `src/lib/dateUtils.ts` e test unitari Vitest sui casi limite (0,
  NaN, 1h esatta).
- **Sportitalia** aggiunto alla famiglia "Sport" in modo che il filtro
  mostri sempre almeno un palinsesto reale; whitelist generi estesa
  (`Telefilm`, `Serie`, `Soap Opera`, `Soap`, `Magazine`,
  `Approfondimento`, `Inchiesta`, `Meteo`, `Game Show`, `Religione`,
  `Educativo`, `Cultura`, `Viaggi`, `Ciclismo`).
- Test E2E Playwright per la presenza dei separatori oro e delle
  etichette famiglia mobile nella scheda "Stasera in TV", con mock
  `streaming-tv` in `e2e/support/mockSportsApi.ts`.
- Suite GitHub **Copilot repo-local** (instructions + prompts +
  `.vscode/extensions.json`) e configurazione **Dependabot** per `npm`
  e `github-actions` con PR verso `develop`, assegnazione a
  `@matteobern9244`, grouping conservativo e cooldown 30 giorni sui
  major.
- Workflow guardrail per disabilitare `auto-merge` sulle PR Dependabot
  quando GitHub Copilot lascia una review non `APPROVED`.

### Changed

- Footer applicazione: ora mostra solo `CALENDAR EVENTS · v{APP_VERSION}`
  centrato, in `font-heading tracking-wider uppercase`.
- `package.json`: `"version"` aggiornato a `"2.1.0"` come release di
  rebrand sopra la baseline `2.0.2`.
- `index.html`: aggiornati `<title>`, `<meta name="description">`,
  `<meta name="author">`, `og:title`, `twitter:title`, `og:description`,
  `twitter:description` con la nuova identita' "Calendar Events".
- README e AGENTS.md aggiornati con nuovo nome prodotto e nuova baseline.
- Configurazione GitHub di `main` riallineata al modello finale: una sola
  Ruleset moderna repository-level, bypass riservato a `lovable-dev`,
  nessuna Branch protection classica in parallelo. Workflow GitHub
  Actions riallineati al flusso `feature -> develop -> main` con CI su
  push solo per `develop` e CI su PR per `develop` e `main`.
- Aggiornate le action GitHub a major stabili
  (`actions/checkout@v6`, `actions/setup-node@v6`,
  `actions/upload-artifact@v7`).

### Fixed

- **Copertura palinsesti famiglia "Sport"**: prima la famiglia Sky Sport
  ritornava esclusivamente canali con `programs=[]`. Audit completo
  2026-04-19 di TUTTI i 41 slug attivi: ognuno ritorna >=12 righe
  `HH:MM` reali da `staseraintv.com`. Sportitalia aggiunto come canale
  Sport coperto (~21 righe/giorno). I canali Sky Sport branded restano
  dichiaratamente non coperti (verificato: tutti gli slug
  `sky_sport_*` su `staseraintv.com` ritornano 404; fonti alternative
  `guidatv.sky.it` e `programmi.sky.it` sono client-side rendered;
  `tvzap.kataweb.it` e' protetto da Cloudflare). Nessun dato inventato:
  la UI continua a dichiarare onestamente "Palinsesto non disponibile".
- Edge function `streaming-tv`: estrazione genere resa piu' robusta con
  fallback diretto sulla riga grezza `HH:MM - TITOLO (GENERE)` quando
  il rich block descrittivo non contiene parentesi finale.
- (Riportato dalla 2.0.2) Bundle di produzione: env injection
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` non sempre
  iniettata. Mitigato dal wrapper `src/lib/supabaseClient.ts` con
  fallback hardcoded sui valori pubblici.

### Note operative

- Il rebrand e' puramente cosmetico lato UI/metadati/docs: nessun
  impatto su routing, fonti dati, edge functions, secrets, branch
  policy o sync Lovable <-> GitHub.
- Bump versione `2.0.2 -> 2.1.0` come release minor di rebrand. Le
  release storiche restano archiviate sotto.
- `npm run lint`, `npm run test` e `npm run build` da eseguire come
  verifica finale. Il drift preesistente tra `package.json` e
  `package-lock.json` puo' ancora far fallire `npm ci` finche' il
  lockfile non viene rigenerato (fuori scope di questa change set).


## [2.0.2] - 2026-04-19

### Fixed

- **Bundle di produzione: dati non caricati su dominio pubblicato.** In alcune
  build di produzione `import.meta.env.VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_KEY` non venivano iniettate nel bundle. Le
  richieste partivano verso `https://<host>/undefined/functions/v1/...`,
  Lovable rispondeva con il fallback HTML SPA (200 OK ma non JSON), React
  Query restava in loading infinito. Diagnosi tramite ispezione network del
  sito live (`https://calendarsports.lovable.app`).

### Added

- `src/lib/supabaseClient.ts`: wrapper sicuro del client Supabase JS SDK con
  fallback hardcoded sui valori pubblici (project URL + anon key) usati
  quando le env var Vite non sono iniettate nel bundle. Esporta anche
  `SUPABASE_PROJECT_URL` e `SUPABASE_ANON_KEY` per chiamate `fetch` manuali
  alle edge functions.
- `src/components/common/ErrorBoundary.tsx`: ErrorBoundary globale wrappato
  attorno all'app in `src/App.tsx`. Mostra titolo, messaggio leggibile,
  dettagli tecnici collassabili e pulsante "Ricarica pagina" invece di una
  pagina bianca o di uno spinner infinito su errori di render.
- Regola ESLint `no-restricted-imports` in `eslint.config.js` che blocca
  import diretti da `@/integrations/supabase/client` e suggerisce
  `@/lib/supabaseClient`. Eccezioni configurate per il wrapper stesso e per
  il file auto-generato.
- Hook **pre-commit** locale via `husky` + `lint-staged` (`.husky/pre-commit`,
  blocco `lint-staged` in `package.json`): esegue `eslint --max-warnings=0`
  sui file `.ts`/`.tsx` in stage. Si attiva automaticamente al primo
  `npm install` grazie allo script `prepare`.

### Changed

- `src/lib/api/sportsApi.ts`: ora importa `SUPABASE_PROJECT_URL` e
  `SUPABASE_ANON_KEY` dal wrapper sicuro invece di leggere direttamente
  `import.meta.env`. Comportamento invariato in preview, fix in produzione.
- `AGENTS.md`: aggiunta sezione "Import del client Supabase" con regola,
  motivazione e esempio OK/da evitare. Aggiunta voce per
  `src/lib/supabaseClient.ts` nella mappa funzionale.
- `README.md`: aggiunta sottosezione "Import del client Supabase nel
  frontend" dentro "Supabase e funzioni edge".

### Note operative

- I valori hardcoded nel wrapper sono **pubblici** (project URL + anon key,
  gli stessi gia' esposti nel client auto-generato e nel bundle): non
  introducono rischi di sicurezza.
- La regola ESLint e' `error`, quindi una violazione fa fallire `npm run
  lint` sia in locale sia in CI (`.github/workflows/ci-pr-main.yml` esegue
  gia' `npm run lint` su ogni PR verso `main`).
- Il file auto-generato `src/integrations/supabase/client.ts` resta
  intatto e read-only.
- Nessuna modifica a workflow Git, branch policy, secrets, edge functions
  o `supabase/config.toml`.

## [2.0.1] - 2026-04-19

### Added

- Aggiunta una suite GitHub Copilot repository-local composta da:
  - `.github/copilot-instructions.md`
  - file path-specific in `.github/instructions/`
  - prompt riusabili in `.github/prompts/`
  - configurazione minima workspace in `.vscode/`

### Changed

- Aggiornato `README.md` con una sezione dedicata all'uso di GitHub Copilot nel
  repository e alla gerarchia tra `AGENTS.md`, istruzioni Copilot e prompt
  riusabili.
- Aggiornata la versione applicativa del repository a `2.0.1`.

### Note operative

- La suite Copilot deriva da `AGENTS.md` e non sostituisce le policy operative
  del repository.
- I prompt files restano un supporto operativo per IDE compatibili e non una
  garanzia di enforcement.

## [2.0.0] - 2026-04-19

### Added

- Aggiunti workflow GitHub Actions per:
  - validazione su `develop`
  - validazione delle pull request verso `main`
  - blocco delle PR verso `main` se il branch sorgente non e' `develop`
- Aggiunto `.github/CODEOWNERS` per formalizzare la ownership del repository.
- Aggiunti test end-to-end Playwright con fixture e mocking delle Edge Functions
  Supabase, in modo da verificare router, rendering e stati UI senza dipendere
  dai provider esterni live.
- Aggiunto un test Vitest per la pagina Sinner sui casi di loading ed errore.
- Aggiunto supporto npm esplicito per `test:e2e` e `test:e2e:headed`.

### Changed

- Rafforzata la documentazione del repository in `README.md`, con descrizione
  reale di stack, fonti dati, workflow GitHub <-> Lovable, branch sensibile
  `main` e limiti del progetto.
- Formalizzata la baseline documentale della release repository `2.0.0`.
- Aggiornata la configurazione Playwright per eseguire i test E2E contro una
  preview locale con variabili ambiente controllate e retry disabilitati nelle
  query solo per il contesto E2E.
- Allineati `package-lock.json` e script di progetto per permettere esecuzioni
  ripetibili di `npm ci`, `lint`, `test`, `build` ed E2E.
- Aggiornata la configurazione ESLint per ridurre falsi blocchi sul codice
  esistente e portare la baseline locale a uno stato compatibile con CI.
- Aggiornata la versione applicativa del repository a `2.0.0`.

### Fixed

- Corretti piccoli problemi tecnici necessari a stabilizzare i controlli locali
  e CI:
  - costanza `prefer-const` nella funzione edge F1
  - tipi vuoti in componenti UI
  - gestione piu' esplicita del fallback su `localStorage`
  - import Tailwind compatibile con le regole TypeScript/ESLint
- Configurato `QueryClient` con retry disattivabile via env nel contesto di
  test, per rendere i check UI deterministici senza alterare il comportamento
  ordinario di produzione.

### Security

- Hardening del repository GitHub sul branch `main`, coerente con il fatto che
  `main` va trattato come branch sensibile rispetto al workflow GitHub <->
  Lovable:
  - merge previsto solo via pull request
  - flusso previsto `develop` -> `main`
  - required checks per quality, E2E e guard del source branch
  - linear history e blocco di force-push/deletion
- Abilitati strumenti GitHub di sicurezza a livello repository:
  - secret scanning
  - push protection
  - Dependabot security updates

### Note operative

- Le modifiche E2E non qualificano le fonti dati runtime come stabili: il
  mocking e' stato introdotto proprio per evitare falsi positivi dovuti a
  scraping, fallback statici e provider terzi.
- Le modifiche di hardening GitHub sono pensate per ridurre il rischio operativo
  su `main`, ma non implicano deploy automatici o sincronizzazioni Lovable
  verificate.

## 2026-04-17 - Fixed CORS and rate limiting

### Fixed 2026-04-17

- Introdotto un helper condiviso di sicurezza per le Edge Functions Supabase.
- Corrette le intestazioni CORS e la gestione del rate limiting nelle funzioni
  sportive.

### Security 2026-04-17

- Centralizzata la logica di protezione in
  `supabase/functions/_shared/security.ts`.
- La modifica impatta piu' funzioni edge e riguarda il perimetro backend leggero
  distribuito, non il deploy o il workflow GitHub/Lovable.

## 2026-04-16 - Aggiunta UCL, Coppa Italia, foto

### Added 2026-04-16 UCL Coppa Italia foto

- Estesa la sezione Juventus con dati aggiuntivi per Champions League e Coppa
  Italia.
- Aggiunti asset/mapping per foto e contenuti visivi nelle sezioni sportive
  coinvolte.

### Changed 2026-04-16 UCL Coppa Italia foto

- Aggiornate pagine frontend e funzioni edge di Formula 1, Juventus e MotoGP per
  supportare dati e presentazione piu' ricchi.

### Note operative 2026-04-16 UCL Coppa Italia foto

- Questa voce tocca fonti dati fragili: nella sezione calcio il repository usa
  scraping Sky Sport e integrazione Lega Serie A; in altre sezioni esistono
  mapping statici e fallback visivi.
- La voce descrive solo il perimetro verificabile dal commit e dal `git show`,
  senza inferire comportamento live oltre il codice modificato.

## 2026-04-16 - Added broadcaster to Home

### Added 2026-04-16 broadcaster Home

- Esposizione del broadcaster nella Home aggregata per gli eventi Juventus.

### Changed 2026-04-16 broadcaster Home

- Aggiornato il flusso dati tra funzione edge calcio e Home per visualizzare
  l'informazione del broadcaster.

### Note operative 2026-04-16 broadcaster Home

- L'informazione broadcaster dipende dalla sezione calcio, che nel repository
  usa dati ibridi tra scraping e API Lega Serie A.

## Storico precedente non normalizzato

Parte della cronologia Git precedente contiene commit con messaggi come
`Changes` o `Work in progress`, non sufficientemente descrittivi per una
conversione affidabile in changelog.

Per coerenza con `AGENTS.md`, queste revisioni non vengono trasformate qui in
voci specifiche senza supporto diretto da diff o contesto verificabile.
