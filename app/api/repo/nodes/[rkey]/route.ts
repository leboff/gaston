import { NextRequest } from "next/server";
import { getAgent } from "@/lib/atproto/session";
import { getNode, putNode, deleteNode } from "@/lib/atproto/repo";
import type { ChatNodeRecord } from "@/types/chat";

type Ctx = { params: Promise<{ rkey: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { rkey } = await params;
  try {
    return Response.json({ node: await getNode(agent, rkey) });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { rkey } = await params;
  const record = (await req.json()) as ChatNodeRecord;
  if (!record?.title || !record?.model || !Array.isArray(record.messages)) {
    return Response.json({ error: "Invalid chatNode" }, { status: 400 });
  }
  const node = await putNode(agent, rkey, record);
  return Response.json({ node });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { rkey } = await params;
  await deleteNode(agent, rkey);
  return Response.json({ ok: true });
}
