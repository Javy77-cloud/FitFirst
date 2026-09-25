"use client";

import type { PipelineStageRow } from "@/lib/db/schema";
import { LINES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import { commercialLineMenuOptions } from "@/lib/policy/eo";
import type { DealListFilter } from "@/lib/crm/lists";
import { HiddenLiveQuery } from "@/components/search/hidden-live-query";
import { LiveContainsInput } from "@/components/search/live-contains-input";

export function DealFilters({
  pathname,
  view,
  filter,
  stages,
}: {
  pathname: string;
  view?: string;
  filter: DealListFilter;
  stages: PipelineStageRow[];
}) {
  return (
    <form method="get" action={pathname} className="flex flex-wrap items-end gap-2">
      {view ? <input type="hidden" name="view" value={view} /> : null}
      <HiddenLiveQuery moduleId="deals" />
      <LiveContainsInput
        moduleId="deals"
        initialQuery={filter.q ?? ""}
        placeholder="Name, phone, city"
        aria-label="Search deals"
        inputClassName="mt-0 h-8 w-40 text-sm"
        className="text-xs text-muted-foreground"
      />
      <label className="text-xs text-muted-foreground">
        Stage
        <select
          name="stage"
          defaultValue={filter.stage || "all"}
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm text-navy"
        >
          <option value="all">All stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.slug}>
              {stage.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted-foreground">
        Line
        <select
          name="line"
          defaultValue={filter.line || "all"}
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm text-navy"
        >
          <option value="all">All lines</option>
          {commercialLineMenuOptions(LINES, (line) => LINE_LABELS[line as keyof typeof LINE_LABELS] ?? line).map(
            (line) => (
              <option key={line.value} value={line.value} title={line.title}>
                {line.label}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="text-xs text-muted-foreground">
        State
        <input
          name="state"
          defaultValue={filter.state ?? ""}
          placeholder="FL"
          className="mt-1 block h-8 w-16 rounded-md border border-input bg-card px-2 text-sm text-navy"
        />
      </label>
      <button type="submit" className="h-8 rounded-md bg-navy px-3 text-xs font-medium text-white">
        Filter
      </button>
      {filter.q || (filter.stage && filter.stage !== "all") || (filter.line && filter.line !== "all") || filter.state ? (
        <a
          href={view ? `${pathname}?view=${encodeURIComponent(view)}` : pathname}
          className="h-8 px-2 text-xs leading-8 text-primary hover:underline"
        >
          Clear
        </a>
      ) : null}
    </form>
  );
}
