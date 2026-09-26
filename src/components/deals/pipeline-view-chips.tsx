"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { saveDefaultPipelineViewAction } from "@/app/actions/pipeline-view-prefs";
import { chipTabClass } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";
import { FAVORITE_VIEW_TOOLTIP, favoriteViewFormData } from "@/lib/wire/view-favorite";
import type { PipelineViewCookie } from "@/lib/wire/pipeline-view-cookies";

export type PipelineViewChip = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

/**
 * View switcher chips with a star in each one.
 * The label navigates. The star writes the existing default-view cookie and does not navigate.
 */
export function PipelineViewChips({
  chips,
  defaultView,
  cookieKey,
}: {
  chips: PipelineViewChip[];
  defaultView: string | null;
  cookieKey: PipelineViewCookie;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingPick, setPendingPick] = useState<{ view: string; baseline: string | null } | null>(null);
  const baseline = defaultView ?? null;
  const favorite = pendingPick && pendingPick.baseline === baseline ? pendingPick.view : baseline;

  function onFavorite(view: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPendingPick({ view, baseline });
    const data = favoriteViewFormData(view, cookieKey);
    startTransition(async () => {
      await saveDefaultPipelineViewAction(data);
    });
  }

  return chips.map((chip) => {
    const isFavorite = favorite === chip.id;
    return (
      <span
        key={chip.id}
        className={chipTabClass(chip.active, "inline-flex items-center gap-1 whitespace-nowrap !pl-2.5 !pr-1")}
        data-active={chip.active ? "true" : "false"}
        data-ff-view-chip={chip.id}
      >
        <Link href={chip.href} data-ff-view-link={chip.id} className="rounded-sm leading-none">
          {chip.label}
        </Link>
        <button
          type="button"
          data-testid={`pipeline-view-favorite-star-${chip.id}`}
          data-ff-view-favorite={chip.id}
          data-favorite={isFavorite ? "true" : "false"}
          title={FAVORITE_VIEW_TOOLTIP}
          aria-label={FAVORITE_VIEW_TOOLTIP}
          aria-pressed={isFavorite}
          data-ff-no-hover=""
          onClick={(event) => onFavorite(chip.id, event)}
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-sm",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#BF0A30]",
            pending && "opacity-60",
          )}
        >
          <Star className={cn("size-3", isFavorite && "fill-current")} strokeWidth={isFavorite ? 1.75 : 2} aria-hidden />
        </button>
      </span>
    );
  });
}
