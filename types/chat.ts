// Shared chat / nested-chat types. These mirror the `app.gaston.chatNode`
// lexicon (see lexicons/app/gaston/chatNode.json).

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  createdAt: string;
}

/**
 * Where a child chat was spawned from: a span inside one message of the parent
 * node. Offsets are UTF-16 code-unit indices into that message's `text`, so
 * they line up with browser `Range`/string math used to render highlights.
 */
export interface Anchor {
  messageId: string;
  text: string;
  startUtf16: number;
  endUtf16: number;
}

/** The record body stored in the user's PDS. */
export interface ChatNodeRecord {
  title: string;
  model: string;
  /** rkey of the parent chatNode. Absent on root nodes. */
  parent?: string;
  /** The highlighted span in the parent this node sprang from. Absent on roots. */
  anchor?: Anchor;
  messages: ChatMessage[];
  createdAt: string;
}

/** A chatNode as returned to the client, with its repo identifiers attached. */
export interface ChatNode extends ChatNodeRecord {
  rkey: string;
  uri: string;
}
