"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { saveDefaultPipelineViewAction } from "@/app/actions/pipeline-view-prefs";
import { cn } from "@/lib/utils";
import type { PipelineViewId } from "@/lib/wire/pipeline";

export function PipelineViewDefaultStar({
  currentView,
  defaultView,
}: {
  currentView: PipelineViewId;
  defaultView: PipelineViewId | null;
}) {
  const [pending, startTransition] = useTransition();
  const isDefault = defaultView === currentView;
  const label = isDefault ? "Clear my default view" : "Make this my default";

  function onClick() {
    const data = new FormData();
    data.set("view", isDefault ? "" : currentView);
    startTransition(async () => {
      await saveDefaultPipelineViewAction(data);
    });
  }

  return (
    <button
      type="button"
      data-testid="deal-pipeline-default-star"
      title={isDefault ? "Default view — click to clear" : label}
      aria-label={label}
      aria-pressed={isDefault}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded p-0.5 transition-colors",
        isDefault ? "text-fit-flag" : "text-muted-foreground/50 hover:text-fit-flag/70",
        pending && "opacity-60",
      )}
    >
      <Star className={cn("size-3.5", isDefault && "fill-current")} aria-hidden />
    </button>
  );
}
