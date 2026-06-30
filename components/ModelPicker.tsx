"use client";

import { useStore } from "@/lib/store";

export function ModelPicker() {
  const models = useStore((s) => s.models);
  const model = useStore((s) => s.model);
  const setModel = useStore((s) => s.setModel);

  // Always include the current model so the select shows it even before/without
  // the catalog loading.
  const ids = new Set(models.map((m) => m.id));
  const options = ids.has(model)
    ? models
    : [{ id: model, name: model }, ...models];

  return (
    <select
      value={model}
      onChange={(e) => setModel(e.target.value)}
      className="max-w-[16rem] truncate rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-blue-500"
      title="Model"
    >
      {options.map((m) => (
        <option key={m.id} value={m.id} className="bg-background">
          {m.name}
        </option>
      ))}
    </select>
  );
}
