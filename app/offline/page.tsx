import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline — Gaston",
};

// Static fallback served by the service worker (public/sw.js) when a navigation
// fails offline. Keep it dependency-free so it caches cleanly.
export default function OfflinePage() {
  return (
    <main className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm opacity-70">
        Gaston needs a network connection to chat and reach your AT Protocol
        repo. Reconnect and try again.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-black hover:bg-amber-200"
      >
        Retry
      </Link>
    </main>
  );
}
