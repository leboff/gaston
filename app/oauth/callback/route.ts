import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/atproto/client";
import { getSession } from "@/lib/atproto/session";
import { PUBLIC_URL } from "@/lib/atproto/client";

// OAuth redirect target. Completes the flow, stores the DID in the session
// cookie, and bounces back to the app.
export async function GET(req: NextRequest) {
  try {
    const { session: oauthSession } = await getOAuthClient().callback(
      req.nextUrl.searchParams,
    );

    const session = await getSession();
    session.did = oauthSession.did;
    await session.save();

    return NextResponse.redirect(new URL("/", PUBLIC_URL));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    const url = new URL("/", PUBLIC_URL);
    url.searchParams.set("authError", message);
    return NextResponse.redirect(url);
  }
}
