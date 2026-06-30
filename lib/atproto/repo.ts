import type { Agent } from "@atproto/api";
import type { ChatNode, ChatNodeRecord } from "@/types/chat";

export const COLLECTION = "app.gaston.chatNode";

function rkeyFromUri(uri: string): string {
  return uri.split("/").pop() as string;
}

function toChatNode(uri: string, value: unknown): ChatNode {
  const v = value as ChatNodeRecord & { $type?: string };
  return {
    rkey: rkeyFromUri(uri),
    uri,
    title: v.title,
    model: v.model,
    parent: v.parent,
    anchor: v.anchor,
    messages: v.messages ?? [],
    createdAt: v.createdAt,
  };
}

/** Fetch every chatNode in the user's repo (the whole tree). */
export async function listNodes(agent: Agent): Promise<ChatNode[]> {
  const repo = agent.did!;
  const nodes: ChatNode[] = [];
  let cursor: string | undefined;
  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo,
      collection: COLLECTION,
      limit: 100,
      cursor,
    });
    for (const rec of res.data.records) {
      nodes.push(toChatNode(rec.uri, rec.value));
    }
    cursor = res.data.cursor;
  } while (cursor);
  return nodes;
}

export async function getNode(agent: Agent, rkey: string): Promise<ChatNode> {
  const res = await agent.com.atproto.repo.getRecord({
    repo: agent.did!,
    collection: COLLECTION,
    rkey,
  });
  return toChatNode(res.data.uri, res.data.value);
}

export async function createNode(
  agent: Agent,
  record: ChatNodeRecord,
): Promise<ChatNode> {
  const rkey = crypto.randomUUID();
  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.did!,
    collection: COLLECTION,
    rkey,
    record: { $type: COLLECTION, ...record },
  });
  return toChatNode(res.data.uri, { ...record });
}

export async function putNode(
  agent: Agent,
  rkey: string,
  record: ChatNodeRecord,
): Promise<ChatNode> {
  const res = await agent.com.atproto.repo.putRecord({
    repo: agent.did!,
    collection: COLLECTION,
    rkey,
    record: { $type: COLLECTION, ...record },
  });
  return toChatNode(res.data.uri, { ...record });
}

export async function deleteNode(agent: Agent, rkey: string): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.did!,
    collection: COLLECTION,
    rkey,
  });
}
