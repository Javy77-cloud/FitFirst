"use client";

import { useEffect, useState, useTransition } from "react";
import { saveDealPipelineCell } from "@/app/actions/pipeline-sheet";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import type { DealStageOption } from "@/lib/deals/deal-columns";
import type { PipelineGridControl } from "@/lib/deals/pipeline-sheet";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

const cellClass =
  "h-7 w-full min-w-[6rem] rounded-sm border border-border bg-background px-1.5 text-xs text-navy";

function MultilineNotesCell({
  ariaLabel,
  columnId,
  draft,
  disabled,
  onDraftChange,
  onPersist,
}: {
  ariaLabel: string;
  columnId: string;
  draft: string;
  disabled: boolean;
  onDraftChange: (next: string) => void;
  onPersist: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <textarea
      aria-label={ariaLabel}
      data-ff-pipe-edit={columnId}
      data-ff-notes-expanded={expanded ? "1" : "0"}
      style={{ width: "100%" }}
      className={cn(
        "box-border w-full min-w-0 rounded-sm border border-border bg-background px-1.5 text-xs text-navy resize-none",
        expanded
          ? "min-h-[2.75rem] py-1 whitespace-pre-wrap"
          : "h-7 min-h-7 overflow-hidden whitespace-nowrap text-ellipsis py-1 leading-tight",
      )}
      value={draft}
      disabled={disabled}
      rows={expanded ? 2 : 1}
      onChange={(event) => onDraftChange(event.target.value)}
      onFocus={() => setExpanded(true)}
      onBlur={() => {
        setExpanded(false);
        onPersist();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      title={expanded ? undefined : draft || undefined}
    />
  );
}

export function PipelineGridCell({
  dealId,
  columnId,
  control,
  value,
  options = [],
  ariaLabel,
  pipelineSlug,
  stageSlug,
  stages,
}: {
  dealId: string;
  columnId: string;
  control: PipelineGridControl;
  value: string;
  options?: Array<{ value: string; label: string }>;
  ariaLabel: string;
  pipelineSlug?: string;
  stageSlug?: string;
  stages?: DealStageOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function persist(next: string) {
    if (next === value) return;
    startTransition(async () => {
      const result = await saveDealPipelineCell({
        dealId,
        columnId,
        value: next,
        pipelineSlug,
      });
      if (result.ok) {
        flashAction("deal-updated");
        return;
      }
      setDraft(value);
      flashAction(result.error || "Could not save", "error");
    });
  }

  if (columnId === "stage" && stages && stageSlug) {
    return (
      <DealStageSelect
        dealId={dealId}
        pipelineSlug={pipelineSlug || "p-c"}
        stageSlug={stageSlug}
        stages={stages}
        toastOnSave
      />
    );
  }

  if (control === "boolean") {
    const checked = draft === "true" || draft === "1" || draft === "on";
    return (
      <label className="inline-flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          aria-label={ariaLabel}
          data-ff-pipe-edit={columnId}
          checked={checked}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked ? "true" : "";
            setDraft(next);
            persist(next);
          }}
        />
        {checked ? "Yes" : "No"}
      </label>
    );
  }

  if (control === "picklist") {
    return (
      <select
        aria-label={ariaLabel}
        data-ff-pipe-edit={columnId}
        className={cn(cellClass, "max-w-[12rem]")}
        value={draft}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          persist(next);
        }}
      >
        <option value="">None</option>
        {options.map((option) => (
          <option key={`${columnId}:${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (control === "multiline") {
    return (
      <MultilineNotesCell
        ariaLabel={ariaLabel}
        columnId={columnId}
        draft={draft}
        disabled={pending}
        onDraftChange={setDraft}
        onPersist={() => persist(draft)}
      />
    );
  }

  const inputType =
    control === "date"
      ? "date"
      : control === "datetime"
        ? "datetime-local"
        : control === "number"
          ? "number"
          : control === "email"
            ? "email"
            : control === "phone"
              ? "tel"
              : control === "currency"
                ? "text"
                : "text";

  return (
    <input
      aria-label={ariaLabel}
      data-ff-pipe-edit={columnId}
      type={inputType}
      inputMode={control === "currency" || control === "number" ? "decimal" : undefined}
      className={cellClass}
      value={draft}
      disabled={pending}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => persist(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
