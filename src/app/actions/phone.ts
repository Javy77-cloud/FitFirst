"use server";

import { saveCallOutcome } from "@/app/actions/activities-desk";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Phone-page dialer stub. Writes a call activity + outcome. Nothing dials. */
export async function logPhoneStubCall(formData: FormData) {
  formData.set("kind", "call");
  formData.set("status", "completed");
  formData.set("direction", str(formData, "direction") || "outbound");
  formData.set("returnTo", "/phone?notice=logged");
  if (!str(formData, "title")) {
    const phone = str(formData, "phone") || str(formData, "phoneNumber");
    formData.set("title", phone ? `Call · ${phone}` : "Call");
  }
  const hasRelated =
    Boolean(str(formData, "contactId")) ||
    Boolean(str(formData, "accountId")) ||
    Boolean(str(formData, "policyId")) ||
    Boolean(str(formData, "leadId"));
  if (!hasRelated) formData.set("allowOrphan", "1");
  const { returnTo } = await saveCallOutcome(formData);
  flashAction(returnTo, "outcome-saved");
}
