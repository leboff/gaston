"use client";

import { create } from "zustand";
import type { ChatNode, ChatNodeRecord, ChatMessage } from "@/types/chat";
import type { OpenRouterModel } from "@/lib/openrouter";
import { KEY_HEADER } from "@/lib/openrouter";
import { streamChat, type ApiMessage } from "@/lib/chatClient";

const LS_KEY = "gaston.openrouter.key";
const LS_MODEL = "gaston.model";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

function uid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function toRecord(node: ChatNode): ChatNodeRecord {
  return {
    title: node.title,
    model: node.model,
    parent: node.parent,
    anchor: node.anchor,
    messages: node.messages,
    createdAt: node.createdAt,
  };
}

function truncate(s: string, n = 60) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

interface Me {
  did: string;
  handle?: string;
}

interface StoreState {
  me: Me | null | undefined; // undefined = still loading
  nodes: ChatNode[];
  currentRkey: string | null;
  models: OpenRouterModel[];
  apiKey: string;
  model: string;
  streaming: boolean;
  streamingText: string;
  error: string | null;

  bootstrap: () => Promise<void>;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  selectNode: (rkey: string | null) => void;
  newRootChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  digIn: (args: {
    parentRkey: string;
    messageId: string;
    text: string;
    startUtf16: number;
    endUtf16: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

function currentNode(state: StoreState): ChatNode | undefined {
  return state.nodes.find((n) => n.rkey === state.currentRkey);
}

/** Derive the system-context message that scopes a child chat to its anchor. */
function contextMessage(node: ChatNode, nodes: ChatNode[]): ApiMessage | null {
  if (!node.anchor || !node.parent) return null;
  const parent = nodes.find((n) => n.rkey === node.parent);
  const parentMsg = parent?.messages.find((m) => m.id === node.anchor!.messageId);
  if (!parentMsg) return null;
  return {
    role: "system",
    content:
      `You are continuing a larger conversation. The user was reading this passage:\n\n` +
      `"""${parentMsg.text}"""\n\n` +
      `They highlighted the phrase "${node.anchor.text}" and want to dig deeper ` +
      `into that specific phrase, in this context. Focus your answers on it.`,
  };
}

async function persistNode(node: ChatNode): Promise<ChatNode> {
  const res = await fetch(`/api/repo/nodes/${node.rkey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRecord(node)),
  });
  if (!res.ok) throw new Error("Failed to save chat to your repo");
  return (await res.json()).node as ChatNode;
}

export const useStore = create<StoreState>((set, get) => ({
  me: undefined,
  nodes: [],
  currentRkey: null,
  models: [],
  apiKey: "",
  model: DEFAULT_MODEL,
  streaming: false,
  streamingText: "",
  error: null,

  bootstrap: async () => {
    // Restore BYOK key + model from the browser.
    const apiKey =
      (typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY)) || "";
    const model =
      (typeof localStorage !== "undefined" && localStorage.getItem(LS_MODEL)) ||
      DEFAULT_MODEL;
    set({ apiKey, model });

    const meRes = await fetch("/api/me");
    const me = (await meRes.json()) as { did: string | null; handle?: string };
    if (!me.did) {
      set({ me: null });
      return;
    }
    set({ me: { did: me.did, handle: me.handle } });

    const [nodesRes] = await Promise.all([
      fetch("/api/repo/nodes"),
      get().apiKey ? fetchModels(set) : Promise.resolve(),
    ]);
    const { nodes } = (await nodesRes.json()) as { nodes: ChatNode[] };
    const roots = nodes.filter((n) => !n.parent);
    set({
      nodes,
      currentRkey:
        roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.rkey ??
        null,
    });
  },

  setApiKey: (key) => {
    localStorage.setItem(LS_KEY, key);
    set({ apiKey: key });
    if (key) fetchModels(set);
  },

  setModel: (model) => {
    localStorage.setItem(LS_MODEL, model);
    set({ model });
  },

  selectNode: (rkey) => set({ currentRkey: rkey, error: null }),

  newRootChat: async () => {
    const record: ChatNodeRecord = {
      title: "New chat",
      model: get().model,
      messages: [],
      createdAt: now(),
    };
    const res = await fetch("/api/repo/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      set({ error: "Failed to create chat" });
      return;
    }
    const { node } = (await res.json()) as { node: ChatNode };
    set((s) => ({ nodes: [...s.nodes, node], currentRkey: node.rkey, error: null }));
  },

  sendMessage: async (text) => {
    const state = get();
    const node = currentNode(state);
    if (!node || state.streaming) return;
    if (!state.apiKey) {
      set({ error: "Add your OpenRouter API key in Settings first." });
      return;
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      createdAt: now(),
    };
    const isFirst = node.messages.length === 0;
    const updated: ChatNode = {
      ...node,
      title: isFirst && !node.anchor ? truncate(text) : node.title,
      messages: [...node.messages, userMsg],
    };
    set((s) => ({
      nodes: s.nodes.map((n) => (n.rkey === node.rkey ? updated : n)),
      streaming: true,
      streamingText: "",
      error: null,
    }));

    const ctx = contextMessage(updated, get().nodes);
    const apiMessages: ApiMessage[] = [
      ...(ctx ? [ctx] : []),
      ...updated.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })),
    ];

    try {
      const full = await streamChat({
        apiKey: state.apiKey,
        model: state.model,
        messages: apiMessages,
        onToken: (chunk) =>
          set((s) => ({ streamingText: s.streamingText + chunk })),
      });

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: full,
        createdAt: now(),
      };
      const withReply: ChatNode = {
        ...updated,
        messages: [...updated.messages, assistantMsg],
      };
      set((s) => ({
        nodes: s.nodes.map((n) => (n.rkey === node.rkey ? withReply : n)),
        streaming: false,
        streamingText: "",
      }));
      const saved = await persistNode(withReply);
      set((s) => ({
        nodes: s.nodes.map((n) => (n.rkey === saved.rkey ? saved : n)),
      }));
    } catch (err) {
      set({
        streaming: false,
        streamingText: "",
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  },

  digIn: async ({ parentRkey, messageId, text, startUtf16, endUtf16 }) => {
    const record: ChatNodeRecord = {
      title: truncate(text),
      model: get().model,
      parent: parentRkey,
      anchor: { messageId, text, startUtf16, endUtf16 },
      messages: [],
      createdAt: now(),
    };
    const res = await fetch("/api/repo/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      set({ error: "Failed to start sub-chat" });
      return;
    }
    const { node } = (await res.json()) as { node: ChatNode };
    set((s) => ({ nodes: [...s.nodes, node], currentRkey: node.rkey, error: null }));
  },

  logout: async () => {
    await fetch("/oauth/logout", { method: "POST" });
    set({ me: null, nodes: [], currentRkey: null });
  },
}));

async function fetchModels(set: (partial: Partial<StoreState>) => void) {
  try {
    const key =
      (typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY)) || "";
    const res = await fetch("/api/models", {
      headers: key ? { [KEY_HEADER]: key } : {},
    });
    if (!res.ok) return;
    const { models } = (await res.json()) as { models: OpenRouterModel[] };
    set({ models });
  } catch {
    /* model list is best-effort */
  }
}
