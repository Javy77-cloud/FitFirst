"use client";

import { useRouter } from "next/navigation";
import { DEAL_TODAY_ACTIVITY_CHIPS, type DealActivityTouch, type DealTodayActivityType } from "@/lib/deals/pipeline-desk";
import { whenForActivity } from "@/lib/activities/rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DealWorkQueuePanel({
  type,
  items,
}: {
  type: DealTodayActivityType;
  items: DealActivityTouch[];
}) {
  const router = useRouter();
  const chip = DEAL_TODAY_ACTIVITY_CHIPS.find((row) => row.id === type);

  function closeQueue() {
    router.push("/deals");
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) closeQueue();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        data-testid="deal-work-queue"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Work queue · {chip?.label ?? type}</DialogTitle>
          <DialogDescription>
            Due today for this activity type. Close to return to the pipeline.
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing of this type is due today.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const when = whenForActivity(item);
              const href = item.dealId ? `/deals/${item.dealId}` : undefined;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  {href ? (
                    <Link href={href} className="font-medium text-primary hover:underline" onClick={closeQueue}>
                      {item.title}
                    </Link>
                  ) : (
                    <span className="text-navy">{item.title}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {when ? when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Due today"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={closeQueue}>
            Close queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
