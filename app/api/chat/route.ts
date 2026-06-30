import { NextRequest } from "next/server";
import {
  OPENROUTER_BASE,
  KEY_HEADER,
  attributionHeaders,
} from "@/lib/openrouter";

// Streaming proxy to OpenRouter. The user's key arrives in the KEY_HEADER and is
// only forwarded as the Authorization bearer — never logged or persisted.
export async function POST(req: NextRequest) {
  const key = req.headers.get(KEY_HEADER);
  if (!key) {
    return Response.json(
      { error: "Missing OpenRouter API key. Add one in Settings." },
      { status: 401 },
    );
  }

  let body: { model?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.model || !Array.isArray(body.messages)) {
    return Response.json(
      { error: "Expected { model, messages }" },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...attributionHeaders(),
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: "OpenRouter request failed", status: upstream.status, detail },
      { status: upstream.status || 502 },
    );
  }

  // Pass OpenRouter's SSE stream straight through to the browser.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
