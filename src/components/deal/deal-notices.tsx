"use client";

import { useState } from "react";
import Link from "next/link";
import {
  completeDealProductNotice,
  setDealProductNotice,
  snoozeDealProductNotice,
} from "@/app/actions/product-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isActiveNotice,
  mergeNoticeTypeOptions,
  noticeChipLabel,
  SEED_NOTICE_TYPE_OPTIONS,
  type NoticeTypeOption,
} from "@/lib/deals/notices";
import { canonicalizeProductStage } from "@/lib/deals/product-stages";
import { cn } from "@/lib/utils";

function defaultDueParts() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return { date: `${tomorrow.getFullYear()}-${month}-${day}`, time: "17:00" };
}

export function DealNoticeChip({
  noticeType,
  noticeTypes,
  className,
}: {
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  className?: string;
}) {
  const label = noticeChipLabel(noticeType, noticeTypes);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-fit-yellow/50 bg-fit-yellow-bg px-2 py-0.5 text-[11px] font-semibold text-fit-yellow",
        className,
      )}
      data-ff-deal-notice-chip=""
      data-ff-notice-type={noticeType ?? ""}
    >
      {label}
    </span>
  );
}

export function DealNotices({
  dealId,
  product,
  stage,
  noticeType = "none",
  noticeTypes,
  taskDueDate,
  taskDueTime,
  returnTo,
  variant = "quotes",
}: {
  dealId: string;
  product?: string | null;
  stage?: string | null;
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
  variant?: "quotes" | "header";
}) {
  const options = mergeNoticeTypeOptions(noticeTypes?.length ? noticeTypes : SEED_NOTICE_TYPE_OPTIONS, noticeType);
  const active = isActiveNotice(noticeType);
  const [selected, setSelected] = useState(noticeType && active ? parseKeep(noticeType) : "none");
  const [completeOpen, setCompleteOpen] = useState(false);
  const fallbackDue = defaultDueParts();
  const dueDate = taskDueDate || fallbackDue.date;
  const dueTime = taskDueTime || fallbackDue.time;
  const canonical = canonicalizeProductStage(stage);
  const productValue = product ?? "homeowners";
  const showSetFields = selected !== "none";

  if (variant === "header" && !active) return null;

  return (
    <div
      className={cn(
        "flex w-fit max-w-full flex-wrap items-center gap-2",
        variant === "quotes" && "rounded-md border border-border/70 px-2 py-1.5",
      )}
      data-ff-deal-notices={variant}
      data-ff-quotes-stage-flags={variant === "quotes" ? "" : undefined}
      data-ff-notice-type={noticeType ?? "none"}
    >
      <DealNoticeChip noticeType={noticeType} noticeTypes={options} />
      {variant === "quotes" ? (
        <form action={setDealProductNotice} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="product" value={productValue} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notices
            <select
              name="noticeType"
              value={selected}
              onChange={(event) => setSelected(event.currentTarget.value)}
              className="ml-2 h-7 rounded-md border border-border bg-background px-2 text-xs font-medium normal-case tracking-normal text-navy"
              data-ff-notice-status=""
            >
              {options.map((option) => (
                <option key={option.value} value={option.value} disabled={active && option.value === "none"}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {showSetFields ? (
            <>
              <label className="text-[11px] text-muted-foreground">
                Due
                <Input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={dueDate}
                  className="mt-0.5 h-7 w-[9.5rem] text-xs"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Time
                <Input
                  name="dueTime"
                  type="time"
                  defaultValue={dueTime}
                  className="mt-0.5 h-7 w-[7.5rem] text-xs"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Note
                <Input
                  name="note"
                  placeholder="Optional"
                  className="mt-0.5 h-7 w-36 text-xs"
                />
              </label>
              <label className="flex items-center gap-1 pb-1 text-[11px] text-muted-foreground">
                <input type="checkbox" name="createTask" value="1" defaultChecked data-ff-notice-create-task="" />
                Review task
              </label>
              <Button type="submit" size="xs" data-ff-notice-set="">
                Set
              </Button>
            </>
          ) : null}
        </form>
      ) : null}

      {active ? (
        <>
          <form action={snoozeDealProductNotice} className="flex flex-wrap items-end gap-1.5">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="product" value={productValue} />
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <Input
              name="dueDate"
              type="date"
              required
              defaultValue={dueDate}
              className="h-7 w-[9.5rem] text-xs"
              aria-label="Snooze date"
            />
            <Input
              name="dueTime"
              type="time"
              defaultValue={dueTime}
              className="h-7 w-[7.5rem] text-xs"
              aria-label="Snooze time"
            />
            <Button type="submit" size="xs" variant="outline" data-ff-notice-snooze="">
              Snooze
            </Button>
          </form>
          {completeOpen || variant === "quotes" ? (
            <form action={completeDealProductNotice} className="flex flex-wrap items-end gap-1.5">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="product" value={productValue} />
              {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <label className="text-[11px] text-muted-foreground">
                Complete notes
                <Input
                  name="notes"
                  required
                  minLength={2}
                  placeholder="What happened"
                  className="mt-0.5 h-7 w-44 text-xs"
                  data-ff-notice-complete-notes=""
                />
              </label>
              <Button type="submit" size="xs" data-ff-notice-complete="">
                Complete
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setCompleteOpen(true)}
              data-ff-notice-complete-open=""
            >
              Complete
            </Button>
          )}
        </>
      ) : null}

      {variant === "quotes" ? (
        <Link
          href="/settings/picklists"
          className="text-[11px] text-primary hover:underline"
          data-ff-notice-edit-types=""
        >
          Edit types
        </Link>
      ) : null}
      {variant === "quotes" && canonical === "policy_issued" ? (
        <p className="text-[11px] text-muted-foreground" data-ff-policy-escrow-stub="">
          Mortgage / escrow is not a pipeline stage. Track it on the issued policy.
        </p>
      ) : null}
    </div>
  );
}

function parseKeep(value: string) {
  return value.trim() || "none";
}

/** Quotes-only leftover name — same Notices control. */
export function QuotesStageFlags(props: {
  dealId: string;
  product?: string | null;
  stage?: string | null;
  inspectionStatus?: string | null;
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
}) {
  return (
    <DealNotices
      dealId={props.dealId}
      product={props.product}
      stage={props.stage}
      noticeType={props.noticeType ?? props.inspectionStatus}
      noticeTypes={props.noticeTypes}
      taskDueDate={props.taskDueDate}
      taskDueTime={props.taskDueTime}
      returnTo={props.returnTo}
      variant="quotes"
    />
  );
}
