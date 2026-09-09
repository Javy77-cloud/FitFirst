"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDealStage } from "@/app/actions/crm";
import { ClosedDealArchivePopup } from "@/components/deals/closed-deal-archive-popup";
import { Button } from "@/components/ui/button";
import { isClosedOutcomeStage } from "@/lib/deals/archive-reminder";

export function DealBoardStageMove({
  dealId,
  dealTitle,
  currentStage,
  options,
}: {
  dealId: string;
  dealTitle?: string;
  currentStage: string;
  options: Array<{ id: string; slug: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const defaultValue = options.some((option) => option.slug === currentStage)
    ? currentStage
    : options[0]?.slug ?? currentStage;

  return (
    <>
      <form
        className="mt-2 flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const stage = String(new FormData(form).get("stage") ?? "").trim();
          startTransition(async () => {
            const data = new FormData();
            data.set("dealId", dealId);
            data.set("stage", stage);
            await updateDealStage(data);
            router.refresh();
            if (isClosedOutcomeStage(stage)) setArchiveOpen(true);
          });
        }}
      >
        <select
          name="stage"
          defaultValue={defaultValue}
          disabled={pending || options.length === 0}
          className="h-7 flex-1 rounded-md border border-input bg-card px-1.5 text-[11px]"
        >
          {options.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="xs" variant="ghost" disabled={pending}>
          Move
        </Button>
      </form>
      <ClosedDealArchivePopup
        dealId={dealId}
        dealTitle={dealTitle}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </>
  );
}
