import { getOAuthClient } from "@/lib/atproto/client";

// JWKS for the client. Empty for a public client (token_endpoint_auth_method:
// "none"); present if you later add a keyset for a confidential client.
export async function GET() {
  return Response.json(getOAuthClient().jwks);
}
