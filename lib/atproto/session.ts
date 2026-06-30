import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { Agent } from "@atproto/api";
import { getOAuthClient } from "./client";

export interface SessionData {
  did?: string;
}

const cookieName = "gaston_session";

function sessionOptions() {
  const password = process.env.COOKIE_SECRET;
  if (!password || password.length < 32) {
    throw new Error("COOKIE_SECRET env var must be set and at least 32 characters");
  }
  return {
    password,
    cookieName,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: (process.env.PUBLIC_URL ?? "").startsWith("https://"),
      path: "/",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}

/**
 * Restore the authenticated atproto Agent for the current request, or null if
 * the user is not signed in / the session can no longer be restored.
 */
export async function getAgent(): Promise<Agent | null> {
  const session = await getSession();
  if (!session.did) return null;
  try {
    const oauthSession = await getOAuthClient().restore(session.did);
    return new Agent(oauthSession);
  } catch {
    // Session revoked or expired beyond refresh — clear it.
    session.destroy();
    await session.save();
    return null;
  }
}
