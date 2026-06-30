import { marked } from "marked";
import DOMPurify from "dompurify";
import type { HighlightSpan } from "./tree";

// Renders a message to sanitized HTML and injects clickable highlight <mark>s
// for the spans that have spawned child chats.
//
// Highlight offsets are in *rendered text* coordinates (concatenated text-node
// characters), the same system lib/tree.ts#selectionOffsets captures — so a
// phrase highlighted in rendered markdown re-wraps exactly on reload.

marked.setOptions({ gfm: true, breaks: true });

let hookInstalled = false;
function ensureLinkHook() {
  if (hookInstalled || typeof window === "undefined") return;
  // Open links in a new tab and strip referrer.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noreferrer noopener");
    }
  });
  hookInstalled = true;
}

export const ANCHOR_ATTR = "data-child-rkey";
const ANCHOR_CLASS = "gaston-anchor";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMessageHtml(
  text: string,
  isUser: boolean,
  spans: HighlightSpan[],
): string {
  // User input stays plain (whitespace preserved via CSS); assistant replies
  // render as markdown.
  let base: string;
  if (isUser) {
    base = escapeHtml(text);
  } else if (typeof window === "undefined") {
    // SSR/build fallback (message bubbles only ever render client-side).
    base = escapeHtml(text);
  } else {
    ensureLinkHook();
    base = DOMPurify.sanitize(marked.parse(text) as string);
  }

  if (!spans.length || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return base;
  }
  return wrapSpans(base, spans);
}

function wrapSpans(html: string, spans: HighlightSpan[]): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return html;

  // Sort and drop overlapping spans (wrapping doesn't change text offsets, so
  // each remaining span can be wrapped independently).
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let cursor = -1;
  for (const s of sorted) {
    if (s.end <= s.start || s.start < cursor) continue;
    wrapRange(root, s.start, s.end, s.childRkey);
    cursor = s.end;
  }
  return root.innerHTML;
}

function wrapRange(
  root: HTMLElement,
  start: number,
  end: number,
  childRkey: string,
): void {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  const hits: { node: Text; localStart: number; localEnd: number }[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const node = n as Text;
    const len = node.nodeValue?.length ?? 0;
    const ns = offset;
    const ne = offset + len;
    offset = ne;
    if (ne <= start || ns >= end) continue;
    hits.push({
      node,
      localStart: Math.max(0, start - ns),
      localEnd: Math.min(len, end - ns),
    });
  }

  // Wrap in reverse document order so splitText on later nodes can't invalidate
  // earlier hits.
  for (let i = hits.length - 1; i >= 0; i--) {
    let node = hits[i].node;
    const { localStart, localEnd } = hits[i];
    if (localEnd < (node.nodeValue?.length ?? 0)) node.splitText(localEnd);
    if (localStart > 0) node = node.splitText(localStart);
    const mark = doc.createElement("mark");
    mark.setAttribute(ANCHOR_ATTR, childRkey);
    mark.setAttribute("class", ANCHOR_CLASS);
    node.parentNode?.replaceChild(mark, node);
    mark.appendChild(node);
  }
}
