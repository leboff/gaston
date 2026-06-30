"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { childIndex, rootNodes } from "@/lib/tree";
import type { ChatNode } from "@/types/chat";

function NodeRow({
  node,
  depth,
  childrenOf,
  currentRkey,
  onSelect,
}: {
  node: ChatNode;
  depth: number;
  childrenOf: Map<string, ChatNode[]>;
  currentRkey: string | null;
  onSelect: (rkey: string) => void;
}) {
  const kids = childrenOf.get(node.rkey) ?? [];
  const label = node.anchor ? `“${node.anchor.text}”` : node.title || "New chat";
  return (
    <div>
      <button
        onClick={() => onSelect(node.rkey)}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
        className={`block w-full truncate rounded-md py-1.5 pr-2 text-left text-sm ${
          node.rkey === currentRkey
            ? "bg-blue-600/15 text-blue-700 dark:text-blue-300 font-medium"
            : "hover:bg-black/5 dark:hover:bg-white/10"
        }`}
        title={label}
      >
        {depth > 0 && <span className="text-black/30 dark:text-white/30">↳ </span>}
        {label}
      </button>
      {kids.map((k) => (
        <NodeRow
          key={k.rkey}
          node={k}
          depth={depth + 1}
          childrenOf={childrenOf}
          currentRkey={currentRkey}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const nodes = useStore((s) => s.nodes);
  const currentRkey = useStore((s) => s.currentRkey);
  const selectNode = useStore((s) => s.selectNode);
  const newRootChat = useStore((s) => s.newRootChat);

  const { roots, childrenOf } = useMemo(
    () => ({ roots: rootNodes(nodes), childrenOf: childIndex(nodes) }),
    [nodes],
  );

  // On mobile the sidebar is an overlay drawer; selecting/creating a chat
  // should dismiss it so the chat is visible.
  const handleSelect = (rkey: string) => {
    selectNode(rkey);
    onClose?.();
  };
  const handleNewChat = () => {
    newRootChat();
    onClose?.();
  };

  return (
    <>
      {/* Backdrop (mobile only, when drawer is open) */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 z-30 bg-black/40 md:hidden ${
          open ? "" : "pointer-events-none opacity-0"
        } transition-opacity`}
      />
      <aside
        className={`absolute inset-y-0 left-0 z-40 flex min-h-0 w-64 shrink-0 flex-col border-r border-black/10 bg-white transition-transform dark:border-white/10 dark:bg-neutral-950 md:static md:translate-x-0 md:bg-transparent md:transition-none md:dark:bg-transparent ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {roots.length === 0 ? (
            <p className="px-3 py-2 text-sm text-black/50 dark:text-white/50">
              No chats yet.
            </p>
          ) : (
            roots.map((r) => (
              <NodeRow
                key={r.rkey}
                node={r}
                depth={0}
                childrenOf={childrenOf}
                currentRkey={currentRkey}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
