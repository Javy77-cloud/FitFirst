"use client";

import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";

export function HiddenLiveQuery({
  moduleId,
  name = "q",
}: {
  moduleId: string;
  name?: string;
}) {
  const q = useLiveContainsQuery(moduleId).trim();
  if (!q) return null;
  return <input type="hidden" name={name} value={q} />;
}
