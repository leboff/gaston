"use client";

import { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";
import type { HighlightSpan } from "@/lib/tree";
import { renderMessageHtml, ANCHOR_ATTR } from "@/lib/markdown";

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
  const html = useMemo(
    () => renderMessageHtml(message.text, isUser, spans),
    [message.text, isUser, spans],
  );

  // Delegate clicks on injected <mark> highlights to open their sub-chat.
  function handleClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest(`mark[${ANCHOR_ATTR}]`);
    const rkey = mark?.getAttribute(ANCHOR_ATTR);
    if (rkey) onHighlightClick(rkey);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed break-words ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-black/[.06] dark:bg-white/[.08]"
        }`}
      >
        <div
          data-msg-id={message.id}
          onClick={handleClick}
          className={
            isUser
              ? "whitespace-pre-wrap"
              : "prose prose-sm dark:prose-invert max-w-none prose-pre:my-2 prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5"
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
