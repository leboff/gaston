import { getOAuthClient } from "@/lib/atproto/client";

// Public client metadata document referenced by client_id in production.
export async function GET() {
  return Response.json(getOAuthClient().clientMetadata);
}
