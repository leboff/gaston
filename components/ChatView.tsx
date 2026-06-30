"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { MessageBubble } from "./MessageBubble";
import { Breadcrumbs } from "./Breadcrumbs";
import { ModelPicker } from "./ModelPicker";
import { indexByRkey, breadcrumbTrail, selectionOffsets, type HighlightSpan } from "@/lib/tree";
import { renderMessageHtml } from "@/lib/markdown";

interface PopoverState {
  x: number;
  y: number;
  messageId: string;
  text: string;
  start: number;
  end: number;
}

export function ChatView() {
  const nodes = useStore((s) => s.nodes);
  const currentRkey = useStore((s) => s.currentRkey);
  const selectNode = useStore((s) => s.selectNode);
  const sendMessage = useStore((s) => s.sendMessage);
  const digIn = useStore((s) => s.digIn);
  const streaming = useStore((s) => s.streaming);
  const streamingText = useStore((s) => s.streamingText);
  const error = useStore((s) => s.error);
  const apiKey = useStore((s) => s.apiKey);

  const [input, setInput] = useState("");
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const byRkey = useMemo(() => indexByRkey(nodes), [nodes]);
  const node = currentRkey ? byRkey.get(currentRkey) : undefined;
  const trail = useMemo(
    () => (currentRkey ? breadcrumbTrail(byRkey, currentRkey) : []),
    [byRkey, currentRkey],
  );

  // Highlight spans per message: children of this node, grouped by anchor.messageId.
  const spansByMessage = useMemo(() => {
    const map = new Map<string, HighlightSpan[]>();
    if (!node) return map;
    for (const child of nodes) {
      if (child.parent !== node.rkey || !child.anchor) continue;
      const a = child.anchor;
      const arr = map.get(a.messageId) ?? [];
      arr.push({ start: a.startUtf16, end: a.endUtf16, childRkey: child.rkey });
      map.set(a.messageId, arr);
    }
    return map;
  }, [nodes, node]);

  // When the selected node changes, reset the composer: seed the input for a
  // freshly dug-in (anchored, empty) chat, and clear any stale popover. This is
  // the documented "adjust state during render" pattern (no effect needed).
  const [prevRkey, setPrevRkey] = useState<string | null>(currentRkey);
  if (currentRkey !== prevRkey) {
    setPrevRkey(currentRkey);
    setInput(
      node && node.anchor && node.messages.length === 0
        ? `Tell me more about “${node.anchor.text}”`
        : "",
    );
    setPopover(null);
  }

  // Auto-follow new output only while the user is pinned to the bottom, so
  // scrolling up to read earlier text isn't yanked back down mid-stream.
  const atBottomRef = useRef(true);
  function handleScroll() {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // Jump to the bottom when switching chats.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
  }, [currentRkey]);

  // Follow streaming/new messages only if still pinned to the bottom.
  useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [node?.messages.length, streamingText]);

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const startEl =
      range.startContainer.nodeType === 3
        ? range.startContainer.parentElement
        : (range.startContainer as Element);
    const endEl =
      range.endContainer.nodeType === 3
        ? range.endContainer.parentElement
        : (range.endContainer as Element);
    const msgEl = startEl?.closest("[data-msg-id]") as HTMLElement | null;
    const endMsgEl = endEl?.closest("[data-msg-id]") as HTMLElement | null;
    if (!msgEl || msgEl !== endMsgEl) {
      setPopover(null);
      return;
    }
    const offsets = selectionOffsets(msgEl, range);
    if (!offsets) {
      setPopover(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setPopover({
      x: rect.left + rect.width / 2,
      y: rect.top,
      messageId: msgEl.dataset.msgId!,
      text: offsets.text,
      start: offsets.start,
      end: offsets.end,
    });
  }

  async function onDigIn() {
    if (!popover || !node) return;
    await digIn({
      parentRkey: node.rkey,
      messageId: popover.messageId,
      text: popover.text,
      startUtf16: popover.start,
      endUtf16: popover.end,
    });
    window.getSelection()?.removeAllRanges();
    setPopover(null);
  }

  function onSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    atBottomRef.current = true; // sending always snaps to the latest
    void sendMessage(text);
  }

  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center text-black/50 dark:text-white/50">
        Start a new chat to begin.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 px-5 py-3">
        <Breadcrumbs trail={trail} onNavigate={selectNode} />
        <ModelPicker />
      </header>

      <div
        ref={scrollRef}
        onMouseUp={handleMouseUp}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6"
      >
        {node.anchor && (
          <p className="mx-auto max-w-2xl rounded-lg bg-amber-100/60 dark:bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-900 dark:text-amber-200">
            Sub-chat about “{node.anchor.text}”
          </p>
        )}

        {node.messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            spans={spansByMessage.get(m.id) ?? []}
            onHighlightClick={selectNode}
          />
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-black/[.06] dark:bg-white/[.08] px-4 py-2.5 text-[15px] leading-relaxed break-words">
              {streamingText ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none prose-pre:my-2 prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5"
                  dangerouslySetInnerHTML={{
                    __html: renderMessageHtml(streamingText, false, []),
                  }}
                />
              ) : (
                <span className="opacity-50">Thinking…</span>
              )}
            </div>
          </div>
        )}

        {node.messages.length === 0 && !streaming && (
          <p className="pt-10 text-center text-sm text-black/40 dark:text-white/40">
            {node.anchor
              ? "Ask anything about the highlighted phrase."
              : "Tip: highlight any part of a reply to dig in and start a linked sub-chat."}
          </p>
        )}
      </div>

      {error && (
        <p className="border-t border-red-500/20 bg-red-500/10 px-5 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="border-t border-black/10 dark:border-white/10 p-4">
        {!apiKey && (
          <p className="mb-2 text-center text-sm text-black/50 dark:text-white/50">
            Add your OpenRouter API key in Settings to start chatting.
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder={apiKey ? "Message…" : "Set your API key first"}
            disabled={!apiKey || streaming}
            className="max-h-40 flex-1 resize-none rounded-xl border border-black/15 dark:border-white/20 bg-transparent px-4 py-2.5 text-[15px] outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={!apiKey || streaming || !input.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>

      {popover && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDigIn}
          style={{
            position: "fixed",
            left: popover.x,
            top: popover.y - 44,
            transform: "translateX(-50%)",
          }}
          className="z-40 flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-black/80 dark:bg-white dark:text-black"
        >
          Dig in ↳
        </button>
      )}
    </div>
  );
}
