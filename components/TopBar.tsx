"use client";

import { useStore } from "@/lib/store";

export function TopBar({
  onOpenSettings,
  onToggleSidebar,
}: {
  onOpenSettings: () => void;
  onToggleSidebar?: () => void;
}) {
  const me = useStore((s) => s.me);
  const apiKey = useStore((s) => s.apiKey);
  const prefsLocked = useStore((s) => s.prefsLocked);
  const logout = useStore((s) => s.logout);

  return (
    <header className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle chat list"
          className="-ml-1 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="font-bold tracking-tight">Gaston</span>
      </div>
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
