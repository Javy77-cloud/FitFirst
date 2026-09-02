import type { EsignProvider } from "@/lib/domain";
import { notImplemented, type NotImplementedResult } from "./types";

export function sendEnvelope(
  provider: EsignProvider,
  input: { documentId: string; signerEmail?: string | null },
): NotImplementedResult {
  return notImplemented(
    `E-signature send via ${provider} for document ${input.documentId}`,
  );
}

export const ESIGN_PROVIDER_LABELS: Record<EsignProvider, string> = {
  docusign: "DocuSign",
  dropbox_sign: "Dropbox Sign",
  zoho_sign: "Zoho Sign",
};
