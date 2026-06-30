import {
  NodeOAuthClient,
  type OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
import { stateStore, sessionStore } from "./db";

export const PUBLIC_URL = process.env.PUBLIC_URL ?? "http://127.0.0.1:3000";
export const SCOPE = "atproto transition:generic";

// A loopback host (127.0.0.1 / localhost) means we're in local dev and use
// atproto's special "localhost" development client, which needs no hosted
// metadata document.
const isLoopback = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(
  PUBLIC_URL,
);

const REDIRECT_URI = `${PUBLIC_URL}/oauth/callback`;

function buildClientMetadata(): OAuthClientMetadataInput {
  if (isLoopback) {
    // The dev client encodes redirect_uri + scope into the client_id query
    // string. Note: the redirect host must be a loopback IP, not "localhost".
    const redirect = REDIRECT_URI.replace("localhost", "127.0.0.1");
    const client_id = `http://localhost?redirect_uri=${encodeURIComponent(
      redirect,
    )}&scope=${encodeURIComponent(SCOPE)}`;
    return {
      client_id,
      client_name: "Gaston",
      redirect_uris: [redirect],
      scope: SCOPE,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    };
  }

  // Production: a public web client whose metadata we host ourselves.
  return {
    client_id: `${PUBLIC_URL}/oauth/client-metadata.json`,
    client_name: "Gaston",
    client_uri: PUBLIC_URL,
    redirect_uris: [REDIRECT_URI],
    scope: SCOPE,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };
}

// Cache the client across hot reloads / route invocations.
const globalForClient = globalThis as unknown as {
  __gastonOAuthClient?: NodeOAuthClient;
};

export function getOAuthClient(): NodeOAuthClient {
  if (!globalForClient.__gastonOAuthClient) {
    globalForClient.__gastonOAuthClient = new NodeOAuthClient({
      clientMetadata: buildClientMetadata(),
      stateStore,
      sessionStore,
    });
  }
  return globalForClient.__gastonOAuthClient;
}
