"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detailHref,
  listPosition,
  readListOrder,
  type RecordListModule,
} from "@/lib/desk/record-list-order";
import { cn } from "@/lib/utils";

/**
 * Header prev/next for Contact / Account detail.
 * Uses sessionStorage order written by the list page; hides when no list context.
 */
export function RecordListPager({
  module,
  recordId,
  className,
}: {
  module: RecordListModule;
  recordId: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  // Include recordId so navigating prev/next re-evaluates position against storage.
  const ids = useMemo(() => {
    void recordId;
    return readListOrder(module);
  }, [module, recordId]);
  const pos = useMemo(() => listPosition(ids, recordId), [ids, recordId]);

  useEffect(() => {
    if (!pos) return;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (event.key === "ArrowLeft" && pos && pos.index > 0) {
        event.preventDefault();
        router.push(detailHref(module, ids[pos.index - 1]!, tab));
      } else if (event.key === "ArrowRight" && pos && pos.index < pos.total - 1) {
        event.preventDefault();
        router.push(detailHref(module, ids[pos.index + 1]!, tab));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pos, ids, module, router, tab]);

  if (!pos) return null;

  const noun = module === "contacts" ? "contact" : "account";
  const prevId = pos.index > 0 ? ids[pos.index - 1] : null;
  const nextId = pos.index < pos.total - 1 ? ids[pos.index + 1] : null;

  return (
    <div
      className={cn("ml-auto flex shrink-0 items-center gap-1", className)}
      data-ff-record-list-pager={module}
    >
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="h-7 w-7 px-0"
        disabled={!prevId}
        aria-label={`Previous ${noun}`}
        title={`Previous ${noun}`}
        onClick={() => prevId && router.push(detailHref(module, prevId, tab))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span
        className="min-w-[3.25rem] text-center text-[11px] font-medium tabular-nums text-muted-foreground"
        data-ff-record-list-pager-pos=""
      >
        {pos.index + 1} of {pos.total}
      </span>
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="h-7 w-7 px-0"
        disabled={!nextId}
        aria-label={`Next ${noun}`}
        title={`Next ${noun}`}
        onClick={() => nextId && router.push(detailHref(module, nextId, tab))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
