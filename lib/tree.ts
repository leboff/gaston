import type { ChatNode } from "@/types/chat";

/** Index nodes by rkey for O(1) lookup. */
export function indexByRkey(nodes: ChatNode[]): Map<string, ChatNode> {
  return new Map(nodes.map((n) => [n.rkey, n]));
}

/** Map of parent rkey -> child nodes, sorted by creation time. */
export function childIndex(nodes: ChatNode[]): Map<string, ChatNode[]> {
  const map = new Map<string, ChatNode[]>();
  for (const n of nodes) {
    if (!n.parent) continue;
    const arr = map.get(n.parent) ?? [];
    arr.push(n);
    map.set(n.parent, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}

/** Root nodes (no parent), sorted newest first. */
export function rootNodes(nodes: ChatNode[]): ChatNode[] {
  return nodes
    .filter((n) => !n.parent)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Walk from a node up to its root, returned root-first. */
export function breadcrumbTrail(
  byRkey: Map<string, ChatNode>,
  rkey: string,
): ChatNode[] {
  const trail: ChatNode[] = [];
  let cur: ChatNode | undefined = byRkey.get(rkey);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.rkey)) {
    seen.add(cur.rkey);
    trail.unshift(cur);
    cur = cur.parent ? byRkey.get(cur.parent) : undefined;
  }
  return trail;
}

/**
 * Compute the UTF-16 start/end offsets of a Range relative to the full text of
 * `container`. Returns null if the range is empty or outside the container.
 */
export function selectionOffsets(
  container: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  if (range.collapsed) return null;
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }
  const pre = document.createRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const end = start + range.toString().length;
  if (end <= start) return null;
  return { start, end };
}

export interface HighlightSpan {
  start: number;
  end: number;
  childRkey: string;
}

export type Segment =
  | { text: string }
  | { text: string; childRkey: string };

/**
 * Split a message's text into ordered segments, marking the spans that have
 * spawned child chats. Overlapping or drifted anchors are dropped.
 */
export function segmentText(text: string, spans: HighlightSpan[]): Segment[] {
  const valid = spans
    .filter(
      (s) =>
        s.start >= 0 &&
        s.end <= text.length &&
        s.end > s.start,
    )
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const span of valid) {
    if (span.start < cursor) continue; // overlaps a previous highlight — skip
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start) });
    segments.push({ text: text.slice(span.start, span.end), childRkey: span.childRkey });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
