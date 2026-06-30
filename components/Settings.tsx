"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const inputClass =
  "mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500";

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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-black/10 dark:border-white/15 p-6 shadow-xl"
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
          className={inputClass}
        />
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
        >
          Get a key at openrouter.ai/keys ↗
        </a>

        <div className="mt-4 flex justify-between gap-2">
          <button
            onClick={() => {
              setApiKey("");
              setDraft("");
            }}
            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
          >
            Clear key
          </button>
          <button
            onClick={() => {
              setApiKey(draft.trim());
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save key
          </button>
        </div>

        <hr className="my-5 border-black/10 dark:border-white/15" />

        <PersonalizationSection />

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Personalization + memory: end-to-end encrypted, stored in the user's PDS.
 * Three states — no record yet (set a passphrase), locked (enter passphrase to
 * unlock), and unlocked (edit + save).
 */
function PersonalizationSection() {
  const personalization = useStore((s) => s.personalization);
  const memory = useStore((s) => s.memory);
  const prefsRecord = useStore((s) => s.prefsRecord);
  const prefsLocked = useStore((s) => s.prefsLocked);
  const unlockPrefs = useStore((s) => s.unlockPrefs);
  const savePrefs = useStore((s) => s.savePrefs);

  const hasRecord = prefsRecord !== null;
  const unlocked = hasRecord && !prefsLocked;
  const firstTime = !hasRecord;

  const [pDraft, setPDraft] = useState(personalization);
  const [mDraft, setMDraft] = useState(memory);
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <h3 className="text-base font-semibold">Personalization &amp; memory</h3>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Instructions and notes injected into every chat. Encrypted in this
        browser before it&apos;s stored in your repo — the server never sees it.
        Your passphrase can&apos;t be recovered if you forget it.
      </p>

      {prefsLocked ? (
        <div className="mt-4">
          <label className="block text-sm font-medium">Passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter your passphrase to unlock"
            className={inputClass}
          />
          {status && <p className="mt-1 text-xs text-red-600">{status}</p>}
          <button
            disabled={busy || !passphrase}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              const ok = await unlockPrefs(passphrase);
              setBusy(false);
              if (ok) {
                setPDraft(useStore.getState().personalization);
                setMDraft(useStore.getState().memory);
                setPassphrase("");
              } else {
                setStatus("Incorrect passphrase.");
              }
            }}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Unlock
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {firstTime && (
            <>
              <label className="block text-sm font-medium">
                Passphrase (used to encrypt your data)
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Choose a passphrase"
                className={inputClass}
              />
            </>
          )}

          <label className="mt-3 block text-sm font-medium">
            Custom instructions
          </label>
          <textarea
            value={pDraft}
            onChange={(e) => setPDraft(e.target.value)}
            placeholder="How should the assistant respond to you? (tone, format, expertise…)"
            rows={3}
            className={inputClass}
          />

          <label className="mt-3 block text-sm font-medium">Memory</label>
          <textarea
            value={mDraft}
            onChange={(e) => setMDraft(e.target.value)}
            placeholder="Facts you want the assistant to always know about you."
            rows={3}
            className={inputClass}
          />

          {status && (
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {status}
            </p>
          )}

          <button
            disabled={busy || (firstTime && !passphrase)}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              const ok = await savePrefs(
                { personalization: pDraft, memory: mDraft },
                firstTime ? passphrase : undefined,
              );
              setBusy(false);
              if (ok) {
                setPassphrase("");
                setStatus("Saved.");
              } else {
                setStatus(useStore.getState().error ?? "Failed to save.");
              }
            }}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {unlocked ? "Save" : "Save & encrypt"}
          </button>
        </div>
      )}
    </div>
  );
}
