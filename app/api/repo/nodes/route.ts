import { NextRequest } from "next/server";
import { getAgent } from "@/lib/atproto/session";
import { listNodes, createNode } from "@/lib/atproto/repo";
import type { ChatNodeRecord } from "@/types/chat";

export async function GET() {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });
  const nodes = await listNodes(agent);
  return Response.json({ nodes });
}

export async function POST(req: NextRequest) {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });

  const record = (await req.json()) as ChatNodeRecord;
  if (!record?.title || !record?.model || !Array.isArray(record.messages)) {
    return Response.json({ error: "Invalid chatNode" }, { status: 400 });
  }
  const node = await createNode(agent, record);
  return Response.json({ node });
}
