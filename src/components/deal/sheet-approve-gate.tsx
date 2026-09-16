"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { approveMasterSheet } from "@/app/actions/quoting";
import { SHEET_CONFIRM_HASH } from "@/lib/desk/action-flash";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function mergeSheetFieldsIntoForm(form: HTMLFormElement) {
  const sheetForm = document.getElementById("ff-master-sheet-save");
  if (!(sheetForm instanceof HTMLFormElement)) return;
  const existing = new Set(
    [...form.querySelectorAll("[name]")].map((el) => (el as HTMLInputElement).name),
  );
  for (const [key, value] of new FormData(sheetForm).entries()) {
    if (existing.has(key)) continue;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
    existing.add(key);
  }
}

function ConfirmSubmitButton({ reviewed }: { reviewed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={!reviewed || pending}>
      {pending ? "Confirming…" : "Confirm"}
    </Button>
  );
}

export function SheetApproveGate({
  dealId,
  line,
  formLabel,
  unlocked,
  approvedBy,
}: {
  dealId: string;
  line: string;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
  persistSheet?: () => Promise<void>;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unlocked) {
    return (
      <div
        id={SHEET_CONFIRM_HASH}
        className="space-y-2 scroll-mt-24 rounded-md border border-fit-green/30 bg-fit-green-bg px-3 py-3"
        data-ff-sheet-approve
      >
        <p className="text-xs text-fit-green">
          Master sheet approved{approvedBy ? ` by ${approvedBy}` : ""}. Select carriers on Markets,
          then request quotes.
        </p>
        <Link
          href={`/deals/${dealId}?tab=markets&line=${line}`}
          className={cn(buttonVariants({ size: "sm" }))}
          data-ff-sheet-go-markets=""
        >
          Go to Markets
        </Link>
      </div>
    );
  }

  return (
    <form
      action={approveMasterSheet}
      onSubmit={(event) => {
        if (!reviewed) {
          event.preventDefault();
          setError("Check that you visually reviewed this sheet first.");
          return;
        }
        setError(null);
        mergeSheetFieldsIntoForm(event.currentTarget);
      }}
      id={SHEET_CONFIRM_HASH}
      className="scroll-mt-24 rounded-md border border-fit-yellow/40 bg-fit-yellow-bg/40 p-3"
      data-ff-sheet-approve
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      <input type="hidden" name="reviewed" value={reviewed ? "yes" : ""} />
      <input type="hidden" name="sure" value={reviewed ? "yes" : ""} />
      <p className="text-sm font-semibold text-navy">Confirm this sheet</p>
      <p className="mt-1 text-helper text-muted-foreground">
        Glance the {formLabel} master sheet. Confirm opens Markets so you can select carriers and
        request quotes.
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
          className="mt-0.5"
        />
        <span>I Visually Reviewed This Master Sheet.</span>
      </label>
      <div className="mt-3">
        <ConfirmSubmitButton reviewed={reviewed} />
      </div>
      {error ? <p className="mt-2 text-xs text-fit-flag">{error}</p> : null}
    </form>
  );
}
