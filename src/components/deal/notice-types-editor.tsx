"use client";

import { useState, useTransition } from "react";
import { applyDealNoticeType, saveDealNoticeTypes } from "@/app/actions/product-stage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isActiveNotice, noticeFamilyLabel, parseNoticeType, type NoticeTypeOption } from "@/lib/deals/notices";
import { cn } from "@/lib/utils";

export function NoticeTypesEditor({
  open,
  onOpenChange,
  dealId,
  family,
  picklistId,
  options,
  returnTo,
  product,
  currentType,
  mode = "manage",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  family: "pc" | "life" | "health";
  picklistId?: string | null;
  options: readonly NoticeTypeOption[];
  returnTo?: string | null;
  product?: string | null;
  currentType?: string | null;
  mode?: "create" | "manage";
}) {
  const [rows, setRows] = useState(() => labelsFromOptions(options));
  const [draft, setDraft] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(() => indexForType(labelsFromOptions(options), currentType));
  const [pending, startTransition] = useTransition();
  const familyLabel = noticeFamilyLabel(family);
  const creating = mode === "create";
  const productValue = product ?? "homeowners";
  const draftLabel = draft.trim();
  const selectedLabel = selectedIndex >= 0 ? rows[selectedIndex]?.trim() ?? "" : "";
  const applyLabel = draftLabel || selectedLabel;
  const canApply = Boolean(applyLabel) && parseNoticeType(applyLabel) !== "none";

  function resetFromProps() {
    const next = labelsFromOptions(options);
    setRows(next);
    setDraft("");
    setSelectedIndex(creating ? -1 : indexForType(next, currentType));
  }

  function addDraft() {
    const next = draft.trim();
    if (!next) return;
    const existing = rows.findIndex((row) => row.trim().toLowerCase() === next.toLowerCase());
    if (existing >= 0) {
      setSelectedIndex(existing);
      setDraft("");
      return;
    }
    setRows((current) => [...current, next]);
    setSelectedIndex(rows.length);
    setDraft("");
  }

  function fillTypeForm(data: FormData, labels: string[], noticeType?: string) {
    data.set("dealId", dealId);
    data.set("family", family);
    data.set("product", productValue);
    if (picklistId) data.set("picklistId", picklistId);
    if (returnTo) data.set("returnTo", returnTo);
    for (const label of labels) data.append("options", label);
    if (noticeType) data.set("noticeType", noticeType);
  }

  function labelsForSave() {
    const next = rows.map((row) => row.trim()).filter(Boolean);
    if (draftLabel && !next.some((row) => row.toLowerCase() === draftLabel.toLowerCase())) {
      next.push(draftLabel);
    }
    return next;
  }

  function onSaveTypes() {
    const data = new FormData();
    fillTypeForm(data, labelsForSave());
    startTransition(async () => {
      await saveDealNoticeTypes(data);
      onOpenChange(false);
    });
  }

  function onSetNotice() {
    if (!canApply) return;
    const data = new FormData();
    fillTypeForm(data, labelsForSave(), applyLabel);
    startTransition(async () => {
      await applyDealNoticeType(data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetFromProps();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="overflow-visible sm:max-w-xl"
        data-ff-notice-edit-types-dialog=""
        data-ff-notice-create-modal=""
        data-ff-notice-type-modal=""
      >
        <DialogHeader>
          <DialogTitle>{creating ? "Create notice" : `Notice types · ${familyLabel}`}</DialogTitle>
          <DialogDescription>
            {creating
              ? `Choose a type for this product, or name a new one. Rename or delete types you do not want. Stays on this ${familyLabel} deal — not an admin picklist.`
              : `Add, rename, or delete types for ${familyLabel} deals. Set one on this product when you are ready. Stays on this deal — no admin jump.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Notice types
          </p>
          <ul
            className="max-h-72 space-y-2 overflow-y-auto overflow-x-visible pr-0.5"
            data-ff-notice-edit-types-list=""
            role="radiogroup"
            aria-label="Notice type"
          >
            {rows.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No types yet. Name one below and set it on this product.
              </li>
            ) : (
              rows.map((label, index) => {
                const selected = selectedIndex === index;
                return (
                  <li key={`${index}-${label}`}>
                    <div
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      data-ff-notice-type-choice={parseNoticeType(label)}
                      data-ff-notice-type-row=""
                      onClick={() => setSelectedIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedIndex(index);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                        selected
                          ? "border-navy/40 bg-navy/5 ring-1 ring-navy/20"
                          : "border-border bg-background hover:border-navy/25",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-3.5 shrink-0 rounded-full border",
                          selected ? "border-navy bg-navy" : "border-muted-foreground/40 bg-card",
                        )}
                      />
                      <Input
                        value={label}
                        aria-label={`Rename notice type ${index + 1}`}
                        className="h-9 min-w-0 flex-1 text-sm"
                        data-ff-notice-edit-type-label=""
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setRows((current) => current.map((row, i) => (i === index ? value : row)));
                          setSelectedIndex(index);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-ff-notice-edit-type-delete=""
                        onClick={(event) => {
                          event.stopPropagation();
                          setRows((current) => current.filter((_, i) => i !== index));
                          setSelectedIndex((current) => {
                            if (current === index) return -1;
                            if (current > index) return current - 1;
                            return current;
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New type
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                placeholder="Name a new type"
                className="h-9 min-w-0 flex-1 text-sm"
                data-ff-notice-edit-type-new=""
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDraft();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addDraft} data-ff-notice-edit-type-add="">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set notice uses a named new type right away, or the type you selected above.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onSaveTypes}
            data-ff-notice-edit-types-save=""
          >
            {pending ? "Saving…" : "Save types"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !canApply}
            onClick={onSetNotice}
            data-ff-notice-set=""
            data-ff-notice-apply=""
          >
            {pending ? "Setting…" : "Set notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelsFromOptions(options: readonly NoticeTypeOption[]): string[] {
  return options.filter((row) => row.value !== "none").map((row) => row.label);
}

function indexForType(labels: readonly string[], currentType?: string | null): number {
  if (!currentType || !isActiveNotice(currentType)) return -1;
  const slug = parseNoticeType(currentType);
  return labels.findIndex((label) => parseNoticeType(label) === slug);
}
