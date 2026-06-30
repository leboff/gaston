import { KEY_HEADER } from "@/lib/openrouter";

export interface ApiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Stream a chat completion through our BYOK proxy, invoking `onToken` for each
 * incremental chunk of assistant text. Resolves with the full text.
 */
export async function streamChat(opts: {
  apiKey: string;
  model: string;
  messages: ApiMessage[];
  onToken: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [KEY_HEADER]: opts.apiKey,
    },
    body: JSON.stringify({ model: opts.model, messages: opts.messages }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on SSE event boundaries.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const chunk: string = json.choices?.[0]?.delta?.content ?? "";
        if (chunk) {
          full += chunk;
          opts.onToken(chunk);
        }
      } catch {
        // Partial JSON or keep-alive comment — ignore.
      }
    }
  }
  return full;
}
