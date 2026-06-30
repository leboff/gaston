import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getOAuthClient } from "@/lib/atproto/client";

// Kick off the OAuth flow for a given handle / DID / PDS URL.
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")?.trim();
  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  try {
    const state = randomBytes(16).toString("hex");
    const url = await getOAuthClient().authorize(handle, { state });
    return NextResponse.redirect(url.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authorization failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
