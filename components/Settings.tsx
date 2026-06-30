"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export function Settings({ onClose }: { onClose: () => void }) {
  const apiKey = useStore((s) => s.apiKey);
  const setApiKey = useStore((s) => s.setApiKey);
  const [draft, setDraft] = useState(apiKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background border border-black/10 dark:border-white/15 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Gaston is bring-your-own-key. Your OpenRouter key is stored only in
          this browser and sent directly with each request — never saved on the
          server.
        </p>

        <label className="mt-4 block text-sm font-medium">OpenRouter API key</label>
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-or-v1-…"
          className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
        >
          Get a key at openrouter.ai/keys ↗
        </a>

        <div className="mt-6 flex justify-between gap-2">
          <button
            onClick={() => {
              setApiKey("");
              setDraft("");
            }}
            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
          >
            Clear key
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setApiKey(draft.trim());
                onClose();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
