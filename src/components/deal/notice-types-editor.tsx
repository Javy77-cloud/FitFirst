"use client";

import { useState, useTransition } from "react";
import { saveDealNoticeTypes } from "@/app/actions/product-stage";
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
import { noticeFamilyLabel, type NoticeTypeOption } from "@/lib/deals/notices";

export function NoticeTypesEditor({
  open,
  onOpenChange,
  dealId,
  family,
  picklistId,
  options,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  family: "pc" | "life" | "health";
  picklistId?: string | null;
  options: readonly NoticeTypeOption[];
  returnTo?: string | null;
}) {
  const [rows, setRows] = useState(() => options.filter((row) => row.value !== "none").map((row) => row.label));
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const familyLabel = noticeFamilyLabel(family);

  function resetFromProps() {
    setRows(options.filter((row) => row.value !== "none").map((row) => row.label));
    setDraft("");
  }

  function addDraft() {
    const next = draft.trim();
    if (!next) return;
    if (rows.some((row) => row.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    setRows((current) => [...current, next]);
    setDraft("");
  }

  function onSave() {
    const data = new FormData();
    data.set("dealId", dealId);
    data.set("family", family);
    if (picklistId) data.set("picklistId", picklistId);
    if (returnTo) data.set("returnTo", returnTo);
    for (const label of rows) data.append("options", label);
    startTransition(async () => {
      await saveDealNoticeTypes(data);
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
      <DialogContent className="sm:max-w-md" data-ff-notice-edit-types-dialog="">
        <DialogHeader>
          <DialogTitle>Notice types · {familyLabel}</DialogTitle>
          <DialogDescription>
            Add, rename, or delete types for {familyLabel} deals. Stays on this deal — no admin jump.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-56 space-y-1.5 overflow-auto" data-ff-notice-edit-types-list="">
          {rows.length === 0 ? (
            <li className="text-sm text-muted-foreground">No types yet.</li>
          ) : (
            rows.map((label, index) => (
              <li key={`${label}-${index}`} className="flex items-center gap-1.5">
                <Input
                  value={label}
                  aria-label={`Rename notice type ${index + 1}`}
                  className="h-8 text-sm"
                  data-ff-notice-edit-type-label=""
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setRows((current) => current.map((row, i) => (i === index ? value : row)));
                  }}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  data-ff-notice-edit-type-delete=""
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                >
                  Delete
                </Button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center gap-1.5">
          <Input
            value={draft}
            placeholder="New type"
            className="h-8 text-sm"
            data-ff-notice-edit-type-new=""
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addDraft();
              }
            }}
          />
          <Button type="button" size="xs" variant="outline" onClick={addDraft} data-ff-notice-edit-type-add="">
            Add
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={onSave} data-ff-notice-edit-types-save="">
            {pending ? "Saving…" : "Save types"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
