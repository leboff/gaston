"use client";

import { useState } from "react";

export function LoginScreen() {
  const [handle, setHandle] = useState("");
  // LoginScreen only renders client-side (after the auth check), so reading the
  // URL in a lazy initializer is safe and avoids a state-in-effect.
  const [authError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("authError"),
  );

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight">Gaston</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Chat with an LLM and <em>dig in</em> — highlight any phrase to branch
          into a linked sub-chat. Your chats live in your own AT Protocol repo.
        </p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const h = handle.trim().replace(/^@/, "");
            if (h) window.location.href = `/oauth/login?handle=${encodeURIComponent(h)}`;
          }}
        >
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="your-handle.bsky.social"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2.5 text-center outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-3 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            Sign in with Bluesky / AT Protocol
          </button>
        </form>

        {authError && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{authError}</p>
        )}
      </div>
    </div>
  );
}
