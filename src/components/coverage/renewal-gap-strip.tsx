"use client";

import { useState } from "react";
import {
  addCoverageGapProductToPackage,
  dismissCoverageGap,
} from "@/app/actions/coverage-gaps";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  GAP_DISMISS_REASON_LABELS,
  GAP_DISMISS_REASONS,
  sliceRenewalGapStrip,
  type RenewalGapItem,
} from "@/lib/coverage/renewal-gaps";

function GapActions({
  item,
  policyId,
  dealId,
  contactId,
  accountId,
  currentProductId,
}: {
  item: RenewalGapItem;
  policyId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  currentProductId?: string | null;
}) {
  const householdReady = Boolean(contactId || accountId);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.productId ? (
        <form action={addCoverageGapProductToPackage}>
          <input type="hidden" name="productId" value={item.productId} />
          <input type="hidden" name="policyId" value={policyId ?? ""} />
          <input type="hidden" name="dealId" value={dealId ?? ""} />
          <input type="hidden" name="contactId" value={contactId ?? ""} />
          <input type="hidden" name="accountId" value={accountId ?? ""} />
          <input type="hidden" name="currentProductId" value={currentProductId ?? ""} />
          <Button type="submit" size="sm" disabled={!householdReady}>
            Add product to package
          </Button>
        </form>
      ) : null}
      {householdReady ? (
        <details className="relative">
          <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-navy">
            Dismiss
          </summary>
          <form
            action={dismissCoverageGap}
            className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col gap-1 rounded-md border border-border bg-background p-1.5 shadow-sm"
          >
            <input type="hidden" name="ruleId" value={item.id} />
            <input type="hidden" name="policyId" value={policyId ?? ""} />
            <input type="hidden" name="dealId" value={dealId ?? ""} />
            <input type="hidden" name="contactId" value={contactId ?? ""} />
            <input type="hidden" name="accountId" value={accountId ?? ""} />
            {GAP_DISMISS_REASONS.map((reason) => (
              <button
                key={reason}
                type="submit"
                name="reason"
                value={reason}
                className="rounded px-2 py-1 text-left text-[11px] text-navy hover:bg-muted"
              >
                {GAP_DISMISS_REASON_LABELS[reason]}
              </button>
            ))}
          </form>
        </details>
      ) : (
        <span className="text-[11px] text-muted-foreground">Link a contact first.</span>
      )}
    </div>
  );
}

function GapRow({
  item,
  compact,
  policyId,
  dealId,
  contactId,
  accountId,
  currentProductId,
}: {
  item: RenewalGapItem;
  compact?: boolean;
  policyId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  currentProductId?: string | null;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2" data-ff-renewal-gap={item.id}>
      <div className="min-w-0 flex-1">
        <p className={compact ? "text-[12px] font-medium text-navy" : "text-sm font-semibold text-navy"}>
          {item.title}
        </p>
        <p className={compact ? "mt-0.5 text-[11px] text-muted-foreground" : "mt-1 text-sm text-navy/90"}>
          {item.why}
        </p>
      </div>
      <GapActions
        item={item}
        policyId={policyId}
        dealId={dealId}
        contactId={contactId}
        accountId={accountId}
        currentProductId={currentProductId}
      />
    </li>
  );
}

export function RenewalGapStrip({
  findings,
  policyId,
  dealId,
  contactId,
  accountId,
  currentProductId,
}: {
  findings: RenewalGapItem[];
  policyId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  currentProductId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (findings.length === 0) return null;

  const { visible, overflowCount } = sliceRenewalGapStrip(findings);

  return (
    <section
      className="rounded-md border border-border px-3 py-2"
      data-ff-renewal-gap-strip=""
      data-ff-renewal-gap-count={findings.length}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-navy">Coverage gaps</h3>
        {overflowCount > 0 ? (
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => setOpen(true)}
            data-ff-renewal-gap-more={overflowCount}
          >
            +{overflowCount} more
          </button>
        ) : null}
      </div>
      <ul className="mt-1.5 space-y-2">
        {visible.map((item) => (
          <GapRow
            key={item.id}
            item={item}
            compact
            policyId={policyId}
            dealId={dealId}
            contactId={contactId}
            accountId={accountId}
            currentProductId={currentProductId}
          />
        ))}
      </ul>
      {overflowCount > 0 ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Coverage gaps</SheetTitle>
              <SheetDescription>
                In-force household companions only. Quotes are not coverage.
              </SheetDescription>
            </SheetHeader>
            <ul className="space-y-3 px-4 pb-4">
              {findings.map((item) => (
                <GapRow
                  key={item.id}
                  item={item}
                  policyId={policyId}
                  dealId={dealId}
                  contactId={contactId}
                  accountId={accountId}
                  currentProductId={currentProductId}
                />
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}
