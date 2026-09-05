"use client";

import { useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { setLostReason } from "@/app/actions/lost-reason";
import { LostReasonSelect } from "@/components/quotes/lost-reason-select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <DropdownMenuItem render={<Link href={href} />}>{children}</DropdownMenuItem>
  );
}

export function QuoteActionsMenu({ row }: { row: TrackingRow }) {
  const emailFormRef = useRef<HTMLFormElement>(null);
  const smsFormRef = useRef<HTMLFormElement>(null);
  const compareId = quoteCompareId(row);
  const emailBody = `Emailed ${row.carrierName} quote ${row.quoteNumber ?? "—"} (${row.status}) from the Quotes list.`;
  const smsBody = `Texted ${row.carrierName} quote ${row.quoteNumber ?? "—"} from the Quotes list.`;

  return (
    <div className="shrink-0" data-testid={`quote-actions-${row.id}`}>
      <form ref={emailFormRef} action={sendDeskEmail} className="hidden">
        <input type="hidden" name="dealId" value={row.dealId} />
        {row.contactId ? <input type="hidden" name="contactId" value={row.contactId} /> : null}
        {row.accountId ? <input type="hidden" name="accountId" value={row.accountId} /> : null}
        {row.email ? <input type="hidden" name="toAddress" value={row.email} /> : null}
        <input type="hidden" name="subject" value={`${row.carrierName} quote ${row.quoteNumber ?? ""}`.trim()} />
        <input type="hidden" name="body" value={emailBody} />
      </form>
      <form ref={smsFormRef} action={sendDeskSms} className="hidden">
        <input type="hidden" name="dealId" value={row.dealId} />
        {row.contactId ? <input type="hidden" name="contactId" value={row.contactId} /> : null}
        {row.accountId ? <input type="hidden" name="accountId" value={row.accountId} /> : null}
        {row.phone ? <input type="hidden" name="phone" value={row.phone} /> : null}
        <input type="hidden" name="direction" value="outbound" />
        <input type="hidden" name="body" value={smsBody} />
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" size="xs" variant="outline" className="gap-1" />
          }
        >
          Actions
          <ChevronDown className="size-3 opacity-80" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            <MenuLink href={compareHref(row.dealId, [compareId])}>Compare</MenuLink>
            {row.pdfDocumentId ? (
              <MenuLink href={filePreviewHref(row.pdfDocumentId)}>Open PDF</MenuLink>
            ) : (
              <DropdownMenuItem disabled>No PDF</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => emailFormRef.current?.requestSubmit()}>
              Email stub
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => smsFormRef.current?.requestSubmit()}>
              SMS stub
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {row.status === "bound" && row.policyId ? (
              <MenuLink href={`/policies/${row.policyId}`}>Hit — policy</MenuLink>
            ) : row.status === "bound" ? (
              <DropdownMenuItem disabled>Hit — bound</DropdownMenuItem>
            ) : null}
            <MenuLink href={`/deals/${row.dealId}?tab=quotes`}>Open deal</MenuLink>
            {row.appetiteLogId ? (
              <MenuLink href={`/logs#log-${row.appetiteLogId}`}>Appetite log</MenuLink>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function QuoteLostReason({ row }: { row: TrackingRow }) {
  const lostLabel =
    row.lostReason && isLostBusinessReason(row.lostReason)
      ? LOST_BUSINESS_REASON_LABELS[row.lostReason]
      : row.lostReason;

  if (row.status === "bound") return null;

  return (
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
  );
}
