import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserPrefsProvider } from "@/contexts/UserPrefsContext";
import { isPreviewOrIframe } from "@/lib/previewEnv";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import NotFound from "@/pages/NotFound";
import appCss from "../styles.css?url";

/**
 * Bootstrap del tema, portato dall'inline script di index.html.
 * Deve girare PRIMA del primo paint: spostarlo in un useEffect
 * reintrodurrebbe il lampo di tema che esiste per evitare.
 */
const themeBootstrap = `(function () {
  try {
    var t = localStorage.getItem("cse-theme") || "dark";
    document.documentElement.classList.add(t);
    document.documentElement.style.colorScheme = t;
    var color = t === "dark" ? "#0B1A33" : "#F5F7FA";
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  } catch (e) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();`;

const TITOLO = "Calendar Events — Sinner, Juventus, F1, MotoGP, Streaming";
const DESCRIZIONE =
  "Segui eventi sportivi (Sinner, Juventus, F1, MotoGP) e palinsesti TV / nuove uscite streaming in un'unica app";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: TITOLO },
      { name: "description", content: DESCRIZIONE },
      { name: "author", content: "Calendar Events" },
      { name: "theme-color", content: "#F5F7FA", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0B1A33", media: "(prefers-color-scheme: dark)" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITOLO },
      { property: "og:description", content: DESCRIZIONE },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:width", content: "1216" },
      { property: "og:image:height", content: "640" },
      { property: "og:image:alt", content: TITOLO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: TITOLO },
      { name: "twitter:description", content: DESCRIZIONE },
      { name: "twitter:image", content: "/og-image.jpg" },
      { name: "twitter:image:alt", content: TITOLO },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://flagcdn.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://i.ytimg.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://image.tmdb.org", crossOrigin: "anonymous" },
      {
        rel: "preconnect",
        href: "https://jxijruuclgskxlbqittk.supabase.co",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://upload.wikimedia.org" },
      { rel: "preload", as: "image", href: "/logo-header.jpg", fetchPriority: "high" },
    ],
    scripts: [{ children: themeBootstrap }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ported from main.tsx — cleanup one-shot + registrazione service worker
function initMainPortato() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("cse-seasons");
    }
  } catch {
    // localStorage può non essere disponibile (private mode, quota, ecc.).
  }

  if (!("serviceWorker" in navigator)) return;
  if (isPreviewOrIframe()) {
    // Pulizia difensiva: niente SW in preview/iframe
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch((err) => console.warn("[sw] rimozione registrazioni fallita", err));
    return;
  }

  let ricaricando = false;
  const controlloreIniziale = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!controlloreIniziale || ricaricando) return;
    ricaricando = true;
    window.location.reload();
  });

  const registra = () => {
    navigator.serviceWorker
      .register(`/sw.js?build=${encodeURIComponent(__BUILD_ID__)}`, { updateViaCache: "none" })
      .then((registrazione) => {
        // Notifiche push rimosse: chi le aveva attive viene disiscritto.
        registrazione.pushManager
          ?.getSubscription()
          .then((s) => s?.unsubscribe())
          .catch(() => {
            /* nessuna iscrizione da togliere */
          });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registrazione.update().catch(() => {
              /* offline: si riprova alla prossima volta in primo piano */
            });
          }
        });
      })
      .catch((err) => console.warn("[sw] registrazione fallita", err));
  };

  if (document.readyState === "complete") {
    registra();
  } else {
    window.addEventListener("load", registra, { once: true });
  }
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initMainPortato();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <AuthProvider>
            <UserPrefsProvider>
              <Outlet />
            </UserPrefsProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-bold">Questa pagina non si è caricata</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Si è verificato un errore imprevisto. Riprova, oppure torna alla Home.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Riprova
        </button>
        <Link
          to="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
