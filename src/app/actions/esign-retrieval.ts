"use server";

import { currentDeskSession } from "@/lib/auth/session";
import { copyLinkForRow } from "@/lib/esign/retrieval";
import { getSignedRetrievalRow } from "@/lib/esign/retrieval-store";
import { createDocuSignRecipientView, resendDocuSignEnvelope } from "@/lib/integrations/docusign-envelopes";
import { deskPublicOrigin } from "@/lib/social/origin";

export async function resendSignedEnvelope(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, message: "Sign in to resend." };
  const row = await getSignedRetrievalRow(String(formData.get("id") ?? "").trim());
  if (!row) return { ok: false, message: "Envelope not found." };
  if (!row.canResend) return { ok: false, message: "This envelope cannot be resent." };
  if (row.providerEnvelopeId) {
    const result = await resendDocuSignEnvelope(row.providerEnvelopeId);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, message: `Resent to ${row.signerEmail || row.signerName || "the signer"}.` };
  }
  if (row.publicToken) {
    return {
      ok: true,
      message: "In-desk envelopes do not email again. Copy the signing link and send it.",
    };
  }
  return { ok: false, message: "No resend path for this envelope." };
}

export async function copySignedEnvelopeLink(formData: FormData): Promise<{
  ok: boolean;
  url?: string;
  message: string;
}> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, message: "Sign in to copy a link." };
  const row = await getSignedRetrievalRow(String(formData.get("id") ?? "").trim());
  if (!row) return { ok: false, message: "Envelope not found." };
  const local = copyLinkForRow(row);
  if (local) {
    const origin = await deskPublicOrigin();
    return { ok: true, url: `${origin}${local}`, message: "Signing link copied." };
  }
  if (row.providerEnvelopeId && row.signerEmail && row.signerName) {
    const origin = await deskPublicOrigin();
    const view = await createDocuSignRecipientView({
      envelopeId: row.providerEnvelopeId,
      signerName: row.signerName,
      signerEmail: row.signerEmail,
      returnUrl: `${origin}/esign`,
    });
    if (!view.ok) return { ok: false, message: view.message };
    return { ok: true, url: view.url, message: "DocuSign signing link copied." };
  }
  return { ok: false, message: "No signing link for this envelope." };
}
