import { NextRequest } from "next/server";
import { OPENROUTER_BASE, KEY_HEADER, type OpenRouterModel } from "@/lib/openrouter";

// Proxy OpenRouter's public model list to feed the model picker. A key is not
// required for this endpoint, but we forward one if present.
export async function GET(req: NextRequest) {
  const key = req.headers.get(KEY_HEADER);
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    // OpenRouter's catalog changes slowly; cache briefly.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return Response.json(
      { error: "Failed to load models", status: res.status },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
  const models: OpenRouterModel[] = (json.data ?? [])
    .map((m) => ({ id: m.id, name: m.name ?? m.id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ models });
}
