/* Service Worker - Calendar Events
 *
 * Fa due cose distinte: le notifiche push e la cache che permette all'app
 * installata di aprirsi senza rete.
 *
 * ---------------------------------------------------------------------------
 * Le strategie, e perche' sono quelle
 * ---------------------------------------------------------------------------
 *
 * NAVIGAZIONE (l'HTML) -> rete prima, cache come rete di riserva.
 *   Mai il contrario. Con cache-first una versione vecchia di `index.html`
 *   resterebbe servita per sempre, e siccome l'HTML e' l'unico file senza
 *   hash nel nome, non c'e' niente che la sblocchi: l'app si inchioderebbe a
 *   una build morta senza modo di accorgersene.
 *
 * ASSET CON HASH (/assets/*) -> cache prima.
 *   Il nome contiene l'hash del contenuto, quindi il file a quel nome non
 *   cambia mai. Una risposta in cache e' per costruzione ancora valida.
 *
 * TUTTO IL RESTO -> non lo tocchiamo.
 *   Le chiamate alle edge function Supabase non passano di qui: la cache dei
 *   dati e' di React Query, che sa quando sono stantii. Un service worker che
 *   mettesse in cache i dati sportivi mostrerebbe classifiche vecchie senza
 *   dirlo, e questa app non presenta come vivo cio' che non lo e'.
 *
 * ---------------------------------------------------------------------------
 * CACHE_VERSION va incrementata quando cambia una strategia qui sotto: in
 * `activate` ogni cache con un nome diverso da quelli correnti viene
 * cancellata, ed e' l'unico momento in cui gli asset vecchi vengono buttati.
 * ---------------------------------------------------------------------------
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `calendar-events-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `calendar-events-assets-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

// La pagina che serve quando non c'e' rete e non c'e' niente in cache per
// l'indirizzo richiesto. E' l'unica risorsa che precarichiamo: l'app e' una
// SPA, quindi un solo documento copre tutte le rotte.
const SHELL_URL = "/index.html";

// Risorse di root senza hash nel nome, referenziate dal documento o dal
// manifest. Non stanno sotto `/assets/`, quindi vanno elencate: sono poche e
// cambiano di rado.
const ROOT_ASSETS = [
  "/logo-header.jpg",
  "/favicon.png",
  "/favicon.ico",
  "/placeholder.svg",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

// `ignoreVary` non e' un dettaglio: senza, questa cache e' inutile.
//
// `cache.match()` non confronta solo l'URL, rispetta anche l'header `Vary`
// della risposta. Vite marca gli script con `crossorigin`, quindi il browser
// li richiede in modalita' CORS e manda `Origin`; le richieste con cui li
// precarichiamo qui sono same-origin e non lo mandano. Stesso URL, due chiavi
// diverse: la voce e' in cache e `match` non la trova. Il guasto e'
// particolarmente insidioso perche' ispezionare la cache mostra esattamente
// le voci che ci si aspetta.
const MATCH_OPTIONS = { ignoreVary: true };

/**
 * Gli asset che il documento referenzia, ricavati dal documento stesso.
 *
 * Serve perche' i nomi contengono l'hash del contenuto e cambiano a ogni
 * build: un service worker, che e' un file statico, non puo' conoscerli.
 * Vite li scrive in `<script src>`, `<link rel="stylesheet" href>` e
 * `<link rel="modulepreload" href>`, tutti sotto `/assets/`.
 */
function assetUrlsIn(html) {
  return [...new Set(html.match(/\/assets\/[A-Za-z0-9._-]+/g) ?? [])];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        // `cache: "reload"` salta la cache HTTP del browser: al primo giro
        // vogliamo il documento appena distribuito, non quello che il browser
        // si e' tenuto da una visita precedente.
        const response = await fetch(new Request(SHELL_URL, { cache: "reload" }));
        if (!response.ok) throw new Error(`shell non disponibile: ${response.status}`);
        await cache.put(SHELL_URL, response.clone());

        // Perche' anche gli asset, e non solo il documento: al primo
        // caricamento questo service worker non era ancora installato, quindi
        // non ha visto passare *nessuna* richiesta. `clients.claim()` gli da'
        // il controllo della pagina, ma non retroattivamente: quelle risposte
        // sono gia' arrivate senza toccare la cache. Senza questo blocco, chi
        // visita il sito una volta sola e poi lo apre offline troverebbe il
        // guscio HTML senza l'applicazione dentro — pagina vuota.
        //
        // I chunk caricati pigramente (una route mai visitata) restano fuori:
        // entrano in cache la prima volta che vengono chiesti online.
        const assetCache = await caches.open(ASSET_CACHE);
        const assets = [...assetUrlsIn(await response.text()), ...ROOT_ASSETS];
        // `allSettled`: un singolo asset irraggiungibile non deve far fallire
        // l'installazione dell'intero service worker.
        await Promise.allSettled(
          assets.map((url) => assetCache.add(new Request(url, { cache: "reload" }))),
        );
      } catch (_) {
        // Rete assente durante l'installazione: il service worker si installa
        // lo stesso e riempira' la cache alla prima navigazione riuscita.
        // Fallire qui lascerebbe l'app senza service worker per sempre.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !CURRENT_CACHES.includes(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Vale la pena servirlo dalla cache: o ha l'hash nel nome, quindi il contenuto
 * a quel nome non cambia mai, oppure e' una risorsa di root che elenchiamo.
 */
function isCacheableStatic(url) {
  return url.pathname.startsWith("/assets/") || ROOT_ASSETS.includes(url.pathname);
}

async function networkFirstForDocument(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    // Solo le risposte buone entrano in cache: una 404 o una 500 memorizzate
    // diventerebbero permanenti fino al prossimo `activate`.
    if (response && response.ok) {
      cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch (_) {
    const cached =
      (await cache.match(request, MATCH_OPTIONS)) || (await cache.match(SHELL_URL, MATCH_OPTIONS));
    if (cached) return cached;
    throw new Error("offline e nessuna copia in cache");
  }
}

async function cacheFirstForAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET: una POST messa in cache o riprodotta sarebbe un'azione ripetuta,
  // non una lettura.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cross-origin (le edge function Supabase, le immagini dei provider, le
  // bandiere di flagcdn) resta fuori: non e' roba nostra e non sappiamo quando
  // scade.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstForDocument(request));
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(cacheFirstForAsset(request));
  }
});

/* -------------------------------------------------------------------------
 * Notifiche push
 * ---------------------------------------------------------------------- */

self.addEventListener("push", (event) => {
  let data = { title: "Calendar Events", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  const opts = {
    body: data.body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        try {
          const u = new URL(c.url);
          if (u.origin === self.location.origin) {
            await c.focus();
            if ("navigate" in c) await c.navigate(url);
            return;
          }
        } catch (_) {}
      }
      await self.clients.openWindow(url);
    })(),
  );
});
