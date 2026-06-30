import { getAgent } from "@/lib/atproto/session";

// Returns the signed-in identity, or { did: null } when logged out.
export async function GET() {
  const agent = await getAgent();
  if (!agent || !agent.did) return Response.json({ did: null });

  let handle: string | undefined;
  try {
    const profile = await agent.getProfile({ actor: agent.did });
    handle = profile.data.handle;
  } catch {
    // No bsky profile / appview — DID alone is fine.
  }

  return Response.json({ did: agent.did, handle });
}
