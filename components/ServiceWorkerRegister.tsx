"use client";

import { useEffect } from "react";

// Registers the app-shell service worker (public/sw.js) once on mount. The SW
// caches static assets + an offline fallback and explicitly bypasses /api,
// /oauth, and cross-origin requests so auth, BYOK streaming, and PDS reads are
// never served from cache. Renders nothing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Don't register during local dev — the SW caches built assets and only
    // muddies HMR. (next start / prod sets NODE_ENV=production.)
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app works without the SW.
      });
    };
    // `load` may have already fired before this effect ran (fast hydration), in
    // which case the listener would never fire — register immediately instead.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
