import { NextRequest } from "next/server";
import { getAgent } from "@/lib/atproto/session";
import { getPrefs, putPrefs } from "@/lib/atproto/prefs";
import type { UserPrefsRecord } from "@/types/prefs";

export async function GET() {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });
  const prefs = await getPrefs(agent);
  return Response.json({ prefs });
}

export async function PUT(req: NextRequest) {
  const agent = await getAgent();
  if (!agent) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json()) as Partial<UserPrefsRecord>;
  if (!body?.enc || !body?.salt || !body?.iv) {
    return Response.json({ error: "Invalid prefs" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const record: UserPrefsRecord = {
    enc: body.enc,
    salt: body.salt,
    iv: body.iv,
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  };
  const prefs = await putPrefs(agent, record);
  return Response.json({ prefs });
}
