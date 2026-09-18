"use client";

import { RecordActivityMenu } from "@/components/desk/record-activity-menu";

export function ContactActionButtons({
  leadId,
}: {
  leadId: string;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <RecordActivityMenu
      menuTestId="lead-activity-menu"
      listTestId="lead-contact-actions"
      optionAttr="data-ff-lead-activity-option"
      leadId={leadId}
    />
  );
}
