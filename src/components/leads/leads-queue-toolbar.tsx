"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { FollowUpTemplatesPanel, type FollowUpTemplateView } from "@/components/leads/follow-up-templates-panel";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { LEAD_QUEUE_STATUS_FILTERS } from "@/lib/leads/queue";
import { matchesContains } from "@/lib/search/live-query";
import { searchMatchLabel } from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

export function LeadsQueueToolbar({
  sources,
  haystacks,
  templates,
  dueCount,
}: {
  sources: { value: string; label: string }[];
  haystacks: string[];
  templates: FollowUpTemplateView[];
  dueCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const liveQuery = useLiveContainsQuery("leads", search.get("q") ?? "");
  const matchCount = useMemo(
    () => haystacks.filter((hay) => matchesContains(liveQuery, hay)).length,
    [haystacks, liveQuery],
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const temperature = search.get("temperature") ?? "";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <LiveContainsInput
        moduleId="leads"
        initialQuery={search.get("q") ?? ""}
        placeholder="Search a name…"
        aria-label="Search leads by name"
      />
      {liveQuery.trim() ? (
        <span className="text-xs font-medium text-navy" data-testid="lead-match-count">
          {searchMatchLabel(matchCount)}
        </span>
      ) : null}
      <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="sr-only">Status</span>
        <select
          aria-label="Status"
          value={search.get("status") ?? ""}
          onChange={(event) => setParam("status", event.target.value)}
          className="h-7 max-w-[9.5rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
        >
          <option value="">Status</option>
          {LEAD_QUEUE_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="sr-only">Source</span>
        <select
          aria-label="Source"
          value={search.get("source") ?? ""}
          onChange={(event) => setParam("source", event.target.value)}
          className="h-7 max-w-[9.5rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
        >
          <option value="">Source</option>
          {sources.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-flex rounded-md border border-border bg-card p-0.5" role="group" aria-label="Hot or cold">
        {[
          { value: "", label: "All" },
          { value: "hot", label: "Hot" },
          { value: "cold", label: "Cold" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setParam("temperature", option.value)}
            className={cn(
              "h-6 rounded px-2 text-xs font-medium",
              temperature === option.value
                ? "bg-secondary text-navy"
                : "text-muted-foreground hover:text-navy",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <FollowUpTemplatesPanel templates={templates} />
      {dueCount > 0 ? (
        <a href="/tasks" className="text-xs font-medium text-primary hover:underline">
          {dueCount === 1 ? "1 follow-up due" : `${dueCount} follow-ups due`}
        </a>
      ) : null}
    </div>
  );
}
