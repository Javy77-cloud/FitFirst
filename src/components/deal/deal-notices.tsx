"use client";

import { useState } from "react";
import Link from "next/link";
import { completeDealProductNotice } from "@/app/actions/product-stage";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dealProductDef, parseDealProduct } from "@/lib/deals/deal-products";
import {
  isActiveNotice,
  mergeNoticeTypeOptions,
  noticeChipLabel,
  noticeTaskKind,
  noticeTaskTitle,
  noticeTypeLabel,
  SEED_NOTICE_TYPE_OPTIONS,
  type NoticeTypeOption,
} from "@/lib/deals/notices";
import { canonicalizeProductStage } from "@/lib/deals/product-stages";
import { isDeskTaskType } from "@/lib/tasks/task-types";
import { cn } from "@/lib/utils";

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
  dealName,
  contactId,
  product,
  stage,
  noticeType = "none",
  noticeTypes,
  noticeTaskId,
  taskDueDate,
  taskDueTime,
  returnTo,
  variant = "quotes",
}: {
  dealId: string;
  dealName?: string | null;
  contactId?: string | null;
  product?: string | null;
  stage?: string | null;
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  noticeTaskId?: string | null;
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
  variant?: "quotes" | "header";
}) {
  const options = mergeNoticeTypeOptions(noticeTypes?.length ? noticeTypes : SEED_NOTICE_TYPE_OPTIONS, noticeType);
  const active = isActiveNotice(noticeType);
  const [selected, setSelected] = useState(noticeType && active ? parseKeep(noticeType) : "none");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [pendingType, setPendingType] = useState(selected);
  const canonical = canonicalizeProductStage(stage);
  const productValue = product ?? "homeowners";
  const productId = parseDealProduct(productValue);
  const productLabel = productId ? dealProductDef(productId).label : undefined;
  const showSet = selected !== "none";
  const kind = noticeTaskKind(pendingType);
  const taskType = isDeskTaskType(kind) ? kind : "work_reminder";
  const fixedTitle = noticeTaskTitle({
    noticeType: pendingType,
    productLabel,
    options,
  });

  if (variant === "header" && !active) return null;

  function openNoticeTask(nextType = selected) {
    if (nextType === "none") return;
    setPendingType(nextType);
    setTaskOpen(true);
  }

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
        <div className="flex flex-wrap items-end gap-2">
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
          {showSet ? (
            <Button
              type="button"
              size="xs"
              onClick={() => openNoticeTask(selected)}
              data-ff-notice-set=""
            >
              Set
            </Button>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <div className="flex flex-wrap items-end gap-1.5">
          {noticeTaskId ? (
            <Link
              href={`/tasks/${noticeTaskId}`}
              className="text-[11px] font-medium text-primary hover:underline"
              data-ff-notice-task-link=""
            >
              Reminder
            </Link>
          ) : (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => openNoticeTask(parseKeep(noticeType ?? selected))}
              data-ff-notice-set-reminder=""
            >
              Reminder
            </Button>
          )}
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
        </div>
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

      {taskOpen ? (
        <CreateTaskDialog
          key={pendingType}
          open={taskOpen}
          onOpenChange={setTaskOpen}
          hideTrigger
          lockRecord
          title={`Notice · ${noticeTypeLabel(pendingType, options)}`}
          description="Day, time, assignee, and snooze use the desk task reminder already on this record."
          defaults={{
            recordType: "deal",
            recordId: dealId,
            recordName: dealName ?? "This deal",
            dealId,
            contactId,
            taskType,
            fixedTitle,
            noticeType: pendingType,
            noticeProduct: productValue,
            dueDate: taskDueDate ?? undefined,
            dueTime: taskDueTime ?? undefined,
            returnTo: returnTo ?? `/deals/${dealId}?tab=quotes&product=${productValue}`,
          }}
        />
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
  dealName?: string | null;
  contactId?: string | null;
  product?: string | null;
  stage?: string | null;
  inspectionStatus?: string | null;
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  noticeTaskId?: string | null;
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
}) {
  return (
    <DealNotices
      dealId={props.dealId}
      dealName={props.dealName}
      contactId={props.contactId}
      product={props.product}
      stage={props.stage}
      noticeType={props.noticeType ?? props.inspectionStatus}
      noticeTypes={props.noticeTypes}
      noticeTaskId={props.noticeTaskId}
      taskDueDate={props.taskDueDate}
      taskDueTime={props.taskDueTime}
      returnTo={props.returnTo}
      variant="quotes"
    />
  );
}
