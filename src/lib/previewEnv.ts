function isInIframe(): boolean {
  // L'accesso a window.top e' bloccato cross-origin: se solleva, siamo
  // certamente dentro un iframe di un'altra origine.
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Anteprima dell'editor o pagina dentro un iframe: niente service worker. */
export function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
  return isInIframe() || isPreview;
}
