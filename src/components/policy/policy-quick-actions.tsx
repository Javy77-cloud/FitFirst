"use client";

import { RecordActivityMenu } from "@/components/desk/record-activity-menu";

export function PolicyQuickActions({
  policyId,
  contactId,
  accountId,
}: {
  policyId: string;
  phone?: string | null;
  email?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}) {
  return (
    <RecordActivityMenu
      menuTestId="policy-activity-menu"
      listTestId="policy-quick-actions"
      optionAttr="data-ff-policy-activity-option"
      policyId={policyId}
      contactId={contactId}
      accountId={accountId}
    />
  );
}
