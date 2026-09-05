"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { kindLabel } from "@/lib/search/live-query";
import type { SearchHit } from "@/lib/wire/search";

export function LiveSearchResults({
  initialQuery,
  initialHits,
}: {
  initialQuery: string;
  initialHits: SearchHit[];
}) {
  const liveQuery = useLiveContainsQuery("chrome-search", initialQuery);
  const [hits, setHits] = useState(initialHits);
  const [loading, setLoading] = useState(false);
  const q = liveQuery.trim() || initialQuery.trim();

  useEffect(() => {
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    if (q === initialQuery.trim()) {
      setHits(initialHits);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("search failed");
        return (await response.json()) as { hits: SearchHit[] };
      })
      .then((body) => setHits(body.hits))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHits([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initialHits, initialQuery, q]);

  if (!q) {
    return (
      <p className="text-base text-muted-foreground">
        Type a name, policy number, or carrier. Results appear as you type.
      </p>
    );
  }
  if (loading && hits.length === 0) {
    return <p className="text-base text-muted-foreground">Searching…</p>;
  }
  if (hits.length === 0) {
    return <p className="text-base text-muted-foreground">No records for “{q}”.</p>;
  }

  return (
    <ul className="ff-card divide-y divide-border">
      {hits.map((hit) => (
        <li key={`${hit.kind}-${hit.id}`} className="px-4 py-3">
          <div className="text-[11px] uppercase text-muted-foreground">{kindLabel(hit.kind)}</div>
          <Link href={hit.href} className="font-medium text-primary hover:underline">
            {hit.title}
          </Link>
          <div className="text-base text-muted-foreground">{hit.subtitle}</div>
        </li>
      ))}
    </ul>
  );
}
