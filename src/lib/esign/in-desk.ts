/** Local in-desk e-sign stub. Finish-line DocuSign / Dropbox Sign stay parked. */

export const IN_DESK_ESIGN_LABEL = "In-desk stub — not DocuSign";
export const IN_DESK_ESIGN_PROVIDER = "in_desk";
export const IN_DESK_ESIGN_MODE = "in_desk";

export const IN_DESK_ESIGN_STATUSES = ["none", "requested", "signed"] as const;
export type InDeskEsignStatus = (typeof IN_DESK_ESIGN_STATUSES)[number];

export const IN_DESK_ESIGN_STATUS_LABEL: Record<InDeskEsignStatus, string> = {
  none: "Not requested",
  requested: "Requested",
  signed: "Signed",
};

export const IN_DESK_SIGNATURE_KINDS = ["typed", "drawn"] as const;
export type InDeskSignatureKind = (typeof IN_DESK_SIGNATURE_KINDS)[number];

export const IN_DESK_SIGNER_ROLES = ["client", "agent_demo"] as const;
export type InDeskSignerRole = (typeof IN_DESK_SIGNER_ROLES)[number];

export function isInDeskEsignStatus(value: string | null | undefined): value is InDeskEsignStatus {
  return Boolean(value && (IN_DESK_ESIGN_STATUSES as readonly string[]).includes(value));
}

export function parseInDeskEsignStatus(value: string | null | undefined): InDeskEsignStatus {
  return isInDeskEsignStatus(value) ? value : "none";
}

export function inDeskEsignStatusLabel(value: string | null | undefined): string {
  return IN_DESK_ESIGN_STATUS_LABEL[parseInDeskEsignStatus(value)];
}

export function formatInDeskEsignTimestamp(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function formatInDeskEsignList(
  status: string | null | undefined,
  signedAt?: Date | string | null,
  requestedAt?: Date | string | null,
): string {
  const parsed = parseInDeskEsignStatus(status);
  if (parsed === "signed") {
    const when = formatInDeskEsignTimestamp(signedAt);
    return when === "—" ? "Signed" : `Signed · ${when}`;
  }
  if (parsed === "requested") {
    const when = formatInDeskEsignTimestamp(requestedAt);
    return when === "—" ? "Requested" : `Requested · ${when}`;
  }
  return "—";
}

export function isSignablePacket(doc: {
  mimeType?: string | null;
  filename?: string | null;
  slot?: string | null;
  docType?: string | null;
}): boolean {
  const mime = (doc.mimeType ?? "").toLowerCase();
  const name = (doc.filename ?? "").toLowerCase();
  const slot = doc.slot ?? "";
  const type = doc.docType ?? "";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return true;
  if (slot === "signed_app" || slot === "quote_pdf" || slot === "policy_file" || slot === "proposal") {
    return true;
  }
  return type === "signed_app" || type === "quote_pdf" || type === "proposal_pdf" || type === "policy_dec";
}

export function requestInDeskEsign(current: string | null | undefined): {
  status: InDeskEsignStatus;
  requestedAt: Date;
  signedAt: null;
} {
  parseInDeskEsignStatus(current);
  return {
    status: "requested",
    requestedAt: new Date(),
    signedAt: null,
  };
}

export function resolveSignatureInput(input: {
  typedName: string;
  kind: string;
  drawnData: string;
  role?: string;
}):
  | {
      ok: true;
      kind: InDeskSignatureKind;
      signerName: string;
      signatureData: string | null;
      role: InDeskSignerRole;
    }
  | { ok: false; error: string } {
  const signerName = input.typedName.trim();
  if (signerName.length < 2) {
    return { ok: false, error: "Type the legal name that appears on the packet." };
  }
  const kind = input.kind === "drawn" ? "drawn" : "typed";
  const drawn = input.drawnData.trim();
  if (kind === "drawn" && !isDrawnSignature(drawn)) {
    return { ok: false, error: "Draw a signature, or switch to type name." };
  }
  const role = input.role === "agent_demo" ? "agent_demo" : "client";
  return {
    ok: true,
    kind,
    signerName,
    signatureData: kind === "drawn" ? drawn : null,
    role,
  };
}

export function isDrawnSignature(dataUrl: string | null | undefined): boolean {
  if (!dataUrl) return false;
  if (!dataUrl.startsWith("data:image/png;base64,")) return false;
  const payload = dataUrl.slice("data:image/png;base64,".length);
  return payload.length > 80;
}

export function completeInDeskEsign(input: {
  typedName: string;
  kind: string;
  drawnData: string;
  role?: string;
}):
  | {
      ok: true;
      status: "signed";
      signedAt: Date;
      signerName: string;
      kind: InDeskSignatureKind;
      signatureData: string | null;
      role: InDeskSignerRole;
    }
  | { ok: false; error: string } {
  const resolved = resolveSignatureInput(input);
  if (!resolved.ok) return resolved;
  return {
    ok: true,
    status: "signed",
    signedAt: new Date(),
    signerName: resolved.signerName,
    kind: resolved.kind,
    signatureData: resolved.signatureData,
    role: resolved.role,
  };
}

export function inDeskSignHref(token: string, role?: InDeskSignerRole): string {
  const base = `/sign/${encodeURIComponent(token)}`;
  return role === "agent_demo" ? `${base}?role=agent_demo` : base;
}

export function mintInDeskToken(): string {
  const raw = crypto.randomUUID().replaceAll("-", "");
  return `idesk-${raw.slice(0, 16)}`;
}
