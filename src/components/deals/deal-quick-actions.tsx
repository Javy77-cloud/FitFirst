"use client";

import { RecordQuickActions, type RecordQuickActionsProps } from "@/components/desk/record-quick-actions";

export function DealQuickActions({
  dealId,
  phone,
  email,
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
}) {
  const props: RecordQuickActionsProps = {
    dealId,
    phone,
    email,
    contactId,
    accountId,
    leadId,
    testId: "deal-quick-actions",
  };
  return <RecordQuickActions {...props} />;
}
