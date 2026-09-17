"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { completeDealProductNotice, deleteDealProductNotice, saveDealNoticeNote } from "@/app/actions/product-stage";
import { NoticeNotePad } from "@/components/deal/notice-note-pad";
import { NoticeTypesEditor } from "@/components/deal/notice-types-editor";
import { SpeechNoteDialog } from "@/components/deal/speech-note-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dealProductDef, parseDealProduct } from "@/lib/deals/deal-products";
import {
  confirmDeleteDealNotice,
  isActiveNotice,
  isRenderableNoticeStamp,
  mergeNoticeTypeOptions,
  noticeStampPhrase,
  noticeTaskKind,
  noticeTaskTitle,
  noticeTypeLabel,
  SEED_NOTICE_TYPE_OPTIONS,
  type NoticeTypeOption,
} from "@/lib/deals/notices";
import type { NoticeNoteLogEntry } from "@/lib/deals/product-stages";
import { isDeskTaskType } from "@/lib/tasks/task-types";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

export function DealNoticeChip({
  noticeType,
  noticeTypes,
  className,
}: {
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  className?: string;
}) {
  const label = noticeStampPhrase(noticeType, noticeTypes);
  if (!label) return null;
  return (
    <span
      className={cn("ff-deal-status-stamp-ink ff-deal-notice-stamp-ink", className)}
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
  noticeType = "none",
  noticeTypes,
  noticeTaskId,
  noticeNote,
  noticeNotes,
  taskDueDate,
  taskDueTime,
  returnTo,
  family = "pc",
  picklistId,
  placement = "header",
  defaultOpen = false,
}: {
  dealId: string;
  dealName?: string | null;
  contactId?: string | null;
  product?: string | null;
  stage?: string | null;
  noticeType?: string | null;
  noticeTypes?: readonly NoticeTypeOption[];
  noticeTaskId?: string | null;
  noticeNote?: string | null;
  noticeNotes?: readonly NoticeNoteLogEntry[];
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
  family?: "pc" | "life" | "health";
  picklistId?: string | null;
  placement?: "header" | "overlay";
  defaultOpen?: boolean;
}) {
  const options = mergeNoticeTypeOptions(noticeTypes?.length ? noticeTypes : SEED_NOTICE_TYPE_OPTIONS, noticeType);
  const active = isActiveNotice(noticeType);
  const stampLabel = noticeStampPhrase(noticeType, options);
  const compact = placement === "header";
  const showStamp = compact
    ? isRenderableNoticeStamp(noticeType) && Boolean(stampLabel)
    : Boolean(active && stampLabel);
  const [selected, setSelected] = useState(noticeType && active ? parseKeep(noticeType) : "none");
  const [open, setOpen] = useState(defaultOpen);
  const [taskOpen, setTaskOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [typesMode, setTypesMode] = useState<"create" | "manage">("create");
  const [composerOpen, setComposerOpen] = useState(false);
  const [pendingType, setPendingType] = useState(selected);
  const rootRef = useRef<HTMLDivElement>(null);
  const productValue = product ?? "homeowners";
  const productId = parseDealProduct(productValue);
  const productLabel = productId ? dealProductDef(productId).label : undefined;
  const kind = noticeTaskKind(pendingType);
  const taskType = isDeskTaskType(kind) ? kind : "work_reminder";
  const fixedTitle = noticeTaskTitle({
    noticeType: pendingType,
    productLabel,
    options,
  });

  useEffect(() => {
    setSelected(noticeType && active ? parseKeep(noticeType) : "none");
  }, [noticeType, active]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest(NOTICE_LAYER_SEL)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openNoticeTask(nextType = selected) {
    if (nextType === "none") return;
    setPendingType(nextType);
    setTaskOpen(true);
  }

  function openCreateModal() {
    setTypesMode("create");
    setTypesOpen(true);
  }

  /** Open after this click finishes so the new dialog overlay does not eat it. */
  function openTypesEditor() {
    setOpen(false);
    setTypesMode("manage");
    window.setTimeout(() => setTypesOpen(true), 0);
  }

  function openReminderFromMenu() {
    const next = active ? parseKeep(noticeType ?? selected) : selected;
    if (next === "none") return;
    setOpen(false);
    window.setTimeout(() => openNoticeTask(next), 0);
  }

  function deleteNoticeFromMenu() {
    if (!active) return;
    const label = noticeTypeLabel(selected !== "none" ? selected : noticeType, options);
    if (!confirmDeleteDealNotice(label)) return;
    setOpen(false);
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("product", productValue);
    if (returnTo) data.set("returnTo", returnTo);
    void deleteDealProductNotice(data);
  }

  return (
    <div
      className={cn("relative pointer-events-auto", compact ? "inline-flex" : undefined)}
      ref={rootRef}
      data-ff-deal-notices={placement}
      data-ff-notice-type={noticeType ?? "none"}
    >
      {showStamp ? (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${stampLabel}. Open notice.`}
          data-ff-deal-notice-chip=""
          data-ff-notice-stamp=""
          onClick={() => setOpen((value) => !value)}
          className={cn(
            compact ? "ff-deal-notice-compact" : "ff-deal-notice-stamp",
            "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
          )}
        >
          <span
            className={cn(
              "ff-deal-status-stamp-ink",
              compact ? "ff-deal-notice-compact-ink" : "ff-deal-notice-stamp-ink",
            )}
          >
            {stampLabel}
          </span>
        </button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="default"
          aria-expanded={typesOpen}
          aria-haspopup="dialog"
          aria-label="Create notice"
          data-ff-notice-add=""
          data-ff-notice-create=""
          onClick={openCreateModal}
          className="ff-deal-notice-create pointer-events-auto"
        >
          Create notice
        </Button>
      )}

      {open && showStamp ? (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-2.5 shadow-md"
          data-ff-notice-popover=""
          role="dialog"
          aria-label="Notice"
        >
          <div className="flex flex-wrap items-end gap-2">
            <p
              className="min-w-0 flex-1 text-sm font-medium leading-snug text-navy"
              data-ff-notice-type-name=""
            >
              {noticeTypeLabel(selected !== "none" ? selected : noticeType, options)}
            </p>
            <NoticeNotePad
              dealId={dealId}
              product={productValue}
              noticeLabel={noticeTypeLabel(selected !== "none" ? selected : noticeType, options)}
              note={noticeNote}
              notes={noticeNotes}
              returnTo={returnTo}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-navy"
                data-ff-notice-more=""
                aria-label="Notice menu"
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                {noticeTaskId ? (
                  <DropdownMenuItem render={<Link href={`/tasks/${noticeTaskId}`} />} data-ff-notice-task-link="">
                    Open reminder
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  data-ff-notice-set-reminder=""
                  disabled={selected === "none" && !active}
                  onClick={openReminderFromMenu}
                >
                  Set reminder
                </DropdownMenuItem>
                <DropdownMenuItem data-ff-notice-edit-types="" onClick={openTypesEditor}>
                  Change type
                </DropdownMenuItem>
                {active ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      data-ff-notice-delete=""
                      onClick={deleteNoticeFromMenu}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {active ? (
            <form action={completeDealProductNotice} className="mt-2 flex flex-wrap items-end gap-1.5">
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="product" value={productValue} />
              {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
              <input type="hidden" name="notes" value={noticeNote ?? ""} />
              <label className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                Complete notes
                <button
                  type="button"
                  data-ff-notice-complete-notes=""
                  data-ff-notice-complete-composer=""
                  onClick={() => setComposerOpen(true)}
                  className="mt-0.5 flex h-7 w-full items-center rounded-md border border-border bg-background px-2 text-left text-xs font-normal text-navy"
                >
                  <span className={noticeNote?.trim() ? "truncate" : "text-muted-foreground"}>
                    {noticeNote?.trim() || "What happened (optional)"}
                  </span>
                </button>
              </label>
              <Button
                type="submit"
                size="xs"
                data-ff-notice-complete=""
              >
                Complete
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <SpeechNoteDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        title="Complete notes"
        description={`${noticeTypeLabel(selected !== "none" ? selected : noticeType, options)} — speak or type. Same pad as bindable carrier notes.`}
        initialValue={noticeNote ?? ""}
        testId="notice-complete"
        onSave={async (text) => {
          const data = new FormData();
          data.set("dealId", dealId);
          data.set("product", productValue);
          data.set("notes", text);
          if (returnTo) data.set("returnTo", returnTo);
          await saveDealNoticeNote(data);
        }}
      />

      <NoticeTypesEditor
        open={typesOpen}
        onOpenChange={setTypesOpen}
        dealId={dealId}
        dealName={dealName}
        contactId={contactId}
        family={family}
        picklistId={picklistId}
        options={options}
        returnTo={returnTo}
        product={productValue}
        currentType={noticeType}
        taskDueDate={taskDueDate}
        taskDueTime={taskDueTime}
        mode={typesMode}
      />

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

/** Portaled ⋮ menu / dialogs sit outside the popover root — do not treat as dismiss. */
const NOTICE_LAYER_SEL = [
  "[data-slot='dropdown-menu-content']",
  "[data-slot='dialog-content']",
  "[data-slot='dialog-overlay']",
  "[data-ff-notice-edit-types-dialog]",
  "[data-ff-notice-create-modal]",
  "[data-ff-notice-type-modal]",
  "[data-ff-create-task-dialog]",
  "[data-ff-speech-note-dialog]",
  "[data-ff-notice-notepad-dialog]",
].join(",");

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
  noticeNote?: string | null;
  noticeNotes?: readonly NoticeNoteLogEntry[];
  taskDueDate?: string | null;
  taskDueTime?: string | null;
  returnTo?: string | null;
  family?: "pc" | "life" | "health";
  picklistId?: string | null;
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
      noticeNote={props.noticeNote}
      noticeNotes={props.noticeNotes}
      taskDueDate={props.taskDueDate}
      taskDueTime={props.taskDueTime}
      returnTo={props.returnTo}
      family={props.family}
      picklistId={props.picklistId}
      placement="header"
    />
  );
}
