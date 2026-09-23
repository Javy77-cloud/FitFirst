"use server";

import { listEmailTemplates } from "@/lib/db/template-queries";
import { resolveOutboundEmailSignature } from "@/lib/desk/outbound-email-signature";

export type QuickCommsEmailTemplateOption = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export async function loadQuickCommsEmailTemplates(): Promise<QuickCommsEmailTemplateOption[]> {
  const rows = await listEmailTemplates();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: (row.subjectEn ?? row.subject ?? "").trim() || row.name,
    body: (row.bodyEn ?? row.body ?? "").trim(),
  }));
}

export async function loadQuickCommsEmailSignature(): Promise<string> {
  return resolveOutboundEmailSignature();
}
