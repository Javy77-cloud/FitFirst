"use client";

import { useEffect, useState } from "react";
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
  product,
  formLabel,
  unlocked,
  approvedBy,
  needsReapprove = false,
  hasRequestedQuotes = false,
}: {
  dealId: string;
  line: string;
  product?: string | null;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
  persistSheet?: () => Promise<void>;
  needsReapprove?: boolean;
  hasRequestedQuotes?: boolean;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showForm = !unlocked || needsReapprove;
  const subsequent = Boolean(unlocked || needsReapprove);
  const approvedHref = hasRequestedQuotes
    ? `/deals/${dealId}?tab=quotes&line=${line}${product ? `&product=${product}` : ""}`
    : `/deals/${dealId}?tab=markets&line=${line}${product ? `&product=${product}` : ""}`;
  const approvedLabel = hasRequestedQuotes ? "Go to Quotes" : "Go to Markets";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const query = new URLSearchParams(window.location.search);
    const landedOnConfirm =
      hash === SHEET_CONFIRM_HASH ||
      query.get("notice") === "sheet-saved" ||
      query.get("flash") === "sheet-saved";
    if (!landedOnConfirm) return;
    document.getElementById(SHEET_CONFIRM_HASH)?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
  }, []);

  if (!showForm) {
    return (
      <div
        id={SHEET_CONFIRM_HASH}
        className="space-y-2 scroll-mt-24 rounded-md border border-fit-green/30 bg-fit-green-bg px-3 py-3"
        data-ff-sheet-approve
        data-ff-sheet-approve-state="approved"
      >
        <p className="text-xs text-fit-green">
          Master sheet approved{approvedBy ? ` by ${approvedBy}` : ""}.{" "}
          {hasRequestedQuotes
            ? "Recheck quotes on the Quotes tab."
            : "Select carriers on Markets, then request quotes."}
        </p>
        <Link
          href={approvedHref}
          className={cn(buttonVariants({ size: "sm" }))}
          data-ff-sheet-go-markets={hasRequestedQuotes ? undefined : ""}
          data-ff-sheet-go-quotes={hasRequestedQuotes ? "" : undefined}
        >
          {approvedLabel}
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
      data-ff-sheet-approve-state={needsReapprove ? "reapprove" : "first"}
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      {product ? <input type="hidden" name="product" value={product} /> : null}
      <input type="hidden" name="reviewed" value={reviewed ? "yes" : ""} />
      <input type="hidden" name="sure" value={reviewed ? "yes" : ""} />
      <p className="text-sm font-semibold text-navy">Confirm this sheet</p>
      <p className="mt-1 text-helper text-muted-foreground">
        {subsequent
          ? `Glance the ${formLabel} master sheet. Confirm opens Quotes so you can recheck.`
          : `Glance the ${formLabel} master sheet. Confirm opens Markets so you can select carriers and request quotes.`}
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
          className="mt-0.5"
          data-ff-sheet-visual-review=""
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
