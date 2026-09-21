"use server";

import { revalidatePath } from "next/cache";
import { writeDeskComms } from "@/lib/desk/write-comms";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Log an email or SMS touch from a stack card. Does not leave the desk. */
export async function logStackTouch(formData: FormData) {
  const kind = str(formData, "kind");
  if (kind !== "email" && kind !== "sms") return;
  const name = str(formData, "name") || "this record";
  const note = str(formData, "body");
  const related = {
    contactId: str(formData, "contactId") || null,
    accountId: str(formData, "accountId") || null,
    policyId: str(formData, "policyId") || null,
    dealId: str(formData, "dealId") || null,
    leadId: str(formData, "leadId") || null,
  };
  await writeDeskComms({
    kind,
    title: kind === "email" ? `Email · ${name}` : `Text · ${name}`,
    body: note || (kind === "email" ? `Email logged for ${name}` : `Text logged for ${name}`),
    direction: "outbound",
    eventType: "queued",
    status: "completed",
    toAddress: kind === "email" ? str(formData, "email") || null : str(formData, "phone") || null,
    phoneNumber: str(formData, "phone") || null,
    ...related,
  });
  revalidatePath("/leads");
  revalidatePath("/deals");
  revalidatePath("/renewals");
  if (related.leadId) revalidatePath(`/leads/${related.leadId}`);
  if (related.dealId) revalidatePath(`/deals/${related.dealId}`);
  if (related.policyId) revalidatePath(`/policies/${related.policyId}`);
  if (related.contactId) revalidatePath(`/contacts/${related.contactId}`);
}
