"use client";

import Link from "next/link";
import { listProductStageLabel, type ListProductStageChip } from "@/lib/deals/product-stages";
import { cn } from "@/lib/utils";

const CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-navy";

export function DealProductStageChips({
  chips,
  className,
}: {
  chips: readonly ListProductStageChip[];
  className?: string;
}) {
  if (!chips.length) return null;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      data-ff-deal-product-stage-chips=""
    >
      {chips.map((chip) => {
        const title = `${chip.label} · ${chip.stageLabel || listProductStageLabel(chip.stage)}`;
        const body = (
          <>
            <span>{chip.label}</span>
            <span className="font-medium text-muted-foreground">
              {chip.stageLabel || listProductStageLabel(chip.stage)}
            </span>
          </>
        );
        if (chip.href) {
          return (
            <Link
              key={chip.product}
              href={chip.href}
              className={cn(CHIP_CLASS, "hover:border-navy/40 hover:bg-muted/40")}
              data-ff-list-product-stage-chip={chip.product}
              data-ff-list-product-stage={chip.stage}
              data-ff-list-product-stage-href={chip.href}
              title={title}
              onClick={(event) => event.stopPropagation()}
            >
              {body}
            </Link>
          );
        }
        return (
          <span
            key={chip.product}
            className={CHIP_CLASS}
            data-ff-list-product-stage-chip={chip.product}
            data-ff-list-product-stage={chip.stage}
            title={title}
          >
            {body}
          </span>
        );
      })}
    </div>
  );
}
