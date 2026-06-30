"use client";

import type { ChatNode } from "@/types/chat";

export function Breadcrumbs({
  trail,
  onNavigate,
}: {
  trail: ChatNode[];
  onNavigate: (rkey: string) => void;
}) {
  if (trail.length <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-black/60 dark:text-white/60">
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1;
        const label = i === 0 ? "Root" : `“${node.anchor?.text ?? node.title}”`;
        return (
          <span key={node.rkey} className="flex items-center gap-1">
            {i > 0 && <span className="text-black/30 dark:text-white/30">›</span>}
            <button
              onClick={() => onNavigate(node.rkey)}
              disabled={isLast}
              className={`max-w-[14rem] truncate rounded px-1.5 py-0.5 ${
                isLast
                  ? "font-medium text-black dark:text-white cursor-default"
                  : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              }`}
              title={label}
            >
              {label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
