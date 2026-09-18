"use client";

import { RecordActivityMenu } from "@/components/desk/record-activity-menu";

export function DealQuickActions({
  dealId,
  contactId,
  accountId,
  leadId,
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  homeAddress?: string | null;
}) {
  return (
    <RecordActivityMenu
      menuTestId="deal-activity-menu"
      listTestId="deal-quick-actions"
      optionAttr="data-ff-deal-activity-option"
      dealId={dealId}
      leadId={leadId}
      contactId={contactId}
      accountId={accountId}
    />
  );
}
