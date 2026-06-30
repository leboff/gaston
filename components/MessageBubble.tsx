"use client";

import type { ChatMessage } from "@/types/chat";
import { segmentText, type HighlightSpan } from "@/lib/tree";

export function MessageBubble({
  message,
  spans,
  onHighlightClick,
}: {
  message: ChatMessage;
  spans: HighlightSpan[];
  onHighlightClick: (childRkey: string) => void;
}) {
  const isUser = message.role === "user";
  const segments = segmentText(message.text, spans);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-black/[.06] dark:bg-white/[.08]"
        }`}
      >
        <span data-msg-id={message.id}>
          {segments.map((seg, i) =>
            "childRkey" in seg ? (
              <mark
                key={i}
                onClick={() => onHighlightClick(seg.childRkey)}
                title="Open sub-chat"
                className="cursor-pointer rounded bg-amber-300/80 text-black px-0.5 underline decoration-amber-600/70 underline-offset-2 hover:bg-amber-300"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </span>
      </div>
    </div>
  );
}
