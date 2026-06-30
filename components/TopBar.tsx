"use client";

import { useStore } from "@/lib/store";

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const me = useStore((s) => s.me);
  const apiKey = useStore((s) => s.apiKey);
  const prefsLocked = useStore((s) => s.prefsLocked);
  const logout = useStore((s) => s.logout);

  return (
    <header className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-2.5">
      <span className="font-bold tracking-tight">Gaston</span>
      <div className="flex items-center gap-3 text-sm">
        {me && (
          <span className="text-black/60 dark:text-white/60">
            @{me.handle ?? me.did}
          </span>
        )}
        <button
          onClick={onOpenSettings}
          className="rounded-lg px-2.5 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Settings
          {!apiKey && (
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
          )}
          {apiKey && prefsLocked && (
            <span
              className="ml-1 align-middle text-xs"
              title="Personalization is locked — unlock it in Settings"
            >
              🔒
            </span>
          )}
        </button>
        <button
          onClick={logout}
          className="rounded-lg px-2.5 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
