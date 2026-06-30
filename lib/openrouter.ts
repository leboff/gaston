// Helpers + constants for talking to the OpenRouter API. The key is BYOK: it is
// supplied per-request by the browser and never read from server env or stored.

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** Header the browser uses to pass the user's OpenRouter key to our proxy. */
export const KEY_HEADER = "x-openrouter-key";

/**
 * Attribution headers OpenRouter recommends. Safe to send a generic referer;
 * this is not authentication.
 */
export function attributionHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": process.env.PUBLIC_URL ?? "http://127.0.0.1:3000",
    "X-Title": "Gaston",
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
}
