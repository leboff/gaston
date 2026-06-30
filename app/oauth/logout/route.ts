import { NextResponse } from "next/server";
import { getSession } from "@/lib/atproto/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  await session.save();
  return NextResponse.json({ ok: true });
}
