/* Gaston service worker — app-shell caching only.
 *
 * Strategy:
 *   - Bypass entirely (always go to network, never cache): non-GET requests,
 *     cross-origin requests (OpenRouter, the user's PDS), and anything under
 *     /api/ or /oauth/. This keeps auth, BYOK streaming, and PDS reads correct.
 *   - Navigations: network-first, falling back to the precached /offline page
 *     when the network is unavailable.
 *   - Static assets (/_next/static, /icons, manifest, favicon): cache-first
 *     with a background refresh ("stale-while-revalidate").
 *
 * Bump CACHE_VERSION whenever this file or the precached shell changes so old
 * caches are cleaned up on activate.
 */
const CACHE_VERSION = "gaston-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // addAll is atomic; tolerate a missing asset so install never wedges.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass: non-GET, cross-origin, and auth/API routes.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/oauth/")
  ) {
    return; // let the browser handle it normally
  }

  // Navigations: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const cached = await cache.match(OFFLINE_URL);
          return (
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.ok) cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => undefined);
        return cached || (await network) || fetch(request);
      })(),
    );
  }
});
