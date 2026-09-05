import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { setLostReason } from "@/app/actions/lost-reason";
import { LostReasonSelect } from "@/components/quotes/lost-reason-select";
import { buttonVariants } from "@/components/ui/button";
import { LOST_BUSINESS_REASON_LABELS, isLostBusinessReason } from "@/lib/domain";
import { filePreviewHref } from "@/lib/files/urls";
import { compareHref, quoteCompareId } from "@/lib/quotes/board";
import type { TrackingRow } from "@/lib/quotes/tracking";
import { cn } from "@/lib/utils";

function ActionButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className={cn(buttonVariants({ size: "xs", variant: "outline" }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

function ActionLink({
  href,
  children,
  disabled,
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className={cn(buttonVariants({ size: "xs", variant: "outline" }), "cursor-not-allowed opacity-50")}
        aria-disabled="true"
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(buttonVariants({ size: "xs", variant: "outline" }))}>
      {children}
    </Link>
  );
}

export function QuoteActions({ row }: { row: TrackingRow }) {
  const compareId = quoteCompareId(row);
  const lostLabel =
    row.lostReason && isLostBusinessReason(row.lostReason)
      ? LOST_BUSINESS_REASON_LABELS[row.lostReason]
      : row.lostReason;
  const emailBody = `Emailed ${row.carrierName} quote ${row.quoteNumber ?? "—"} (${row.status}) from the Quotes list.`;
  const smsBody = `Texted ${row.carrierName} quote ${row.quoteNumber ?? "—"} from the Quotes list.`;

  return (
    <div className="space-y-2" data-testid={`quote-actions-${row.id}`}>
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label={`${row.carrierName} quote actions`}>
        <ActionLink href={compareHref(row.dealId, [compareId])}>Compare</ActionLink>
        <ActionLink href={row.pdfDocumentId ? filePreviewHref(row.pdfDocumentId) : "#"} disabled={!row.pdfDocumentId}>
          {row.pdfDocumentId ? "Open PDF" : "No PDF"}
        </ActionLink>
        <form action={sendDeskEmail}>
          <input type="hidden" name="dealId" value={row.dealId} />
          {row.contactId ? <input type="hidden" name="contactId" value={row.contactId} /> : null}
          {row.accountId ? <input type="hidden" name="accountId" value={row.accountId} /> : null}
          {row.email ? <input type="hidden" name="toAddress" value={row.email} /> : null}
          <input type="hidden" name="subject" value={`${row.carrierName} quote ${row.quoteNumber ?? ""}`.trim()} />
          <input type="hidden" name="body" value={emailBody} />
          <ActionButton>Email stub</ActionButton>
        </form>
        <form action={sendDeskSms}>
          <input type="hidden" name="dealId" value={row.dealId} />
          {row.contactId ? <input type="hidden" name="contactId" value={row.contactId} /> : null}
          {row.accountId ? <input type="hidden" name="accountId" value={row.accountId} /> : null}
          {row.phone ? <input type="hidden" name="phone" value={row.phone} /> : null}
          <input type="hidden" name="direction" value="outbound" />
          <input type="hidden" name="body" value={smsBody} />
          <ActionButton>SMS stub</ActionButton>
        </form>
        {row.status === "bound" && row.policyId ? (
          <ActionLink href={`/policies/${row.policyId}`}>Hit — policy</ActionLink>
        ) : row.status === "bound" ? (
          <span className={cn(buttonVariants({ size: "xs", variant: "secondary" }))}>Hit — bound</span>
        ) : null}
        <ActionLink href={`/deals/${row.dealId}?tab=quotes`}>Open deal</ActionLink>
        {row.appetiteLogId ? (
          <ActionLink href={`/logs#log-${row.appetiteLogId}`}>Appetite log</ActionLink>
        ) : null}
      </div>

      {row.status !== "bound" ? (
        <form action={setLostReason} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealId" value={row.dealId} />
          {row.quoteId ? <input type="hidden" name="quoteId" value={row.quoteId} /> : null}
          {row.appetiteLogId ? <input type="hidden" name="logId" value={row.appetiteLogId} /> : null}
          <div className="min-w-[12rem] flex-1">
            <LostReasonSelect defaultValue={row.lostReason} label="Mark lost" />
          </div>
          <ActionButton>Save lost reason</ActionButton>
          {lostLabel ? (
            <span className="text-xs text-muted-foreground">Current: {lostLabel}</span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
