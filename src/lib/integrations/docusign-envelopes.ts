import { readStoredFile } from "@/lib/files/object-store";
import { docusignIsReady, pingDocuSignSandbox } from "@/lib/integrations/docusign-sandbox";
import { docusignAuthBase } from "@/lib/integrations/oauth";
import { liveAccessToken } from "@/lib/integrations/oauth-exchange";

export type DocuSignSendStatus = "sent" | "needs_connect" | "sandbox_error";

export type DocuSignSendResult = {
  status: DocuSignSendStatus;
  envelopeId?: string;
  message: string;
  testPath: "docusign_sandbox" | "in_desk_stub";
};

export type DocuSignEnvelopePoll = {
  ok: boolean;
  envelopeId: string;
  status: "sent" | "viewed" | "completed" | null;
  rawStatus: string | null;
  message?: string;
};

export function signerTabSet() {
  return {
    signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "80", yPosition: "680" }],
    initialHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "300", yPosition: "680" }],
    dateSignedTabs: [{ documentId: "1", pageNumber: "1", xPosition: "400", yPosition: "680" }],
  };
}

export function mapDocuSignEnvelopeStatus(raw: string | null | undefined): "sent" | "viewed" | "completed" | null {
  const status = (raw ?? "").trim().toLowerCase();
  if (status === "completed" || status === "signed") return "completed";
  if (status === "delivered" || status === "viewed") return "viewed";
  if (status === "sent" || status === "created" || status === "delivered") return "sent";
  return null;
}

export function envelopeIdFromConnectPayload(payload: unknown): {
  envelopeId: string | null;
  status: string | null;
} {
  if (!payload || typeof payload !== "object") return { envelopeId: null, status: null };
  const root = payload as Record<string, unknown>;
  const data = isRecord(root.data) ? root.data : root;
  const summary = isRecord(data.envelopeSummary) ? data.envelopeSummary : data;
  const envelopeId = firstString(data.envelopeId, summary.envelopeId, root.envelopeId);
  const status = firstString(summary.status, data.status, root.status);
  return { envelopeId, status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return null;
}

export function classifyDocuSignSend(input: {
  connected: boolean;
  apiOk?: boolean;
  envelopeId?: string | null;
  error?: string | null;
}): DocuSignSendResult {
  if (!input.connected) {
    return {
      status: "needs_connect",
      message:
        "DocuSign sandbox is not connected. Fill is confirmed and a local envelope was recorded. Connect Settings → E-sign, or use the in-desk sign test path.",
      testPath: "in_desk_stub",
    };
  }
  if (input.apiOk && input.envelopeId) {
    return {
      status: "sent",
      envelopeId: input.envelopeId,
      message: "DocuSign sandbox envelope created. Signer should receive the vendor request.",
      testPath: "docusign_sandbox",
    };
  }
  return {
    status: "sandbox_error",
    envelopeId: input.envelopeId ?? undefined,
    message:
      input.error?.trim() ||
      "DocuSign sandbox is connected but envelope send failed. Local envelope kept. Retry after checking Integration Key scopes, or use in-desk sign.",
    testPath: "in_desk_stub",
  };
}

type UserInfoAccount = {
  account_id?: string;
  account_name?: string;
  base_uri?: string;
  is_default?: boolean;
};

async function resolveDocuSignAccount(): Promise<
  | { ok: true; token: string; accountId: string; baseUri: string }
  | { ok: false; result: DocuSignSendResult }
> {
  const connected = await docusignIsReady();
  if (!connected) return { ok: false, result: classifyDocuSignSend({ connected: false }) };

  const token = await liveAccessToken("docusign");
  if (!token) {
    return {
      ok: false,
      result: classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: "DocuSign access token is missing. Reconnect sandbox OAuth.",
      }),
    };
  }

  const infoRes = await fetch(`${docusignAuthBase()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const info = (await infoRes.json()) as {
    email?: string;
    accounts?: UserInfoAccount[];
    error_description?: string;
  };
  if (!infoRes.ok) {
    return {
      ok: false,
      result: classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: info.error_description || `DocuSign userinfo failed (${infoRes.status}).`,
      }),
    };
  }
  const account = info.accounts?.find((row) => row.is_default) ?? info.accounts?.[0];
  if (!account?.account_id || !account.base_uri) {
    return {
      ok: false,
      result: classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: "DocuSign userinfo did not return account_id / base_uri.",
      }),
    };
  }
  return {
    ok: true,
    token,
    accountId: account.account_id,
    baseUri: account.base_uri.replace(/\/$/, ""),
  };
}

export async function attemptDocuSignEnvelope(input: {
  filename: string;
  mimeType: string;
  storagePath: string;
  signerName: string;
  signerEmail: string;
  subject?: string;
}): Promise<DocuSignSendResult> {
  try {
    const account = await resolveDocuSignAccount();
    if (!account.ok) return account.result;

    const bytes = await readStoredFile(input.storagePath);
    if (!bytes) {
      return classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: "Filled packet is missing from storage.",
      });
    }

    const ext = input.filename.includes(".") ? input.filename.split(".").pop() : "txt";
    const res = await fetch(`${account.baseUri}/restapi/v2.1/accounts/${account.accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailSubject: input.subject || `Please sign ${input.filename}`,
        documents: [
          {
            documentBase64: bytes.toString("base64"),
            name: input.filename,
            fileExtension: ext,
            documentId: "1",
          },
        ],
        recipients: {
          signers: [
            {
              email: input.signerEmail,
              name: input.signerName,
              recipientId: "1",
              tabs: signerTabSet(),
            },
          ],
        },
        status: "sent",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await res.json()) as { envelopeId?: string; message?: string; errorCode?: string };
    if (!res.ok || !payload.envelopeId) {
      return classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: payload.message || payload.errorCode || `DocuSign envelope send failed (${res.status}).`,
      });
    }
    return classifyDocuSignSend({ connected: true, apiOk: true, envelopeId: payload.envelopeId });
  } catch (error) {
    return classifyDocuSignSend({
      connected: true,
      apiOk: false,
      error: error instanceof Error ? error.message : "DocuSign sandbox request failed.",
    });
  }
}

export async function pollDocuSignEnvelope(envelopeId: string): Promise<DocuSignEnvelopePoll> {
  const empty: DocuSignEnvelopePoll = {
    ok: false,
    envelopeId,
    status: null,
    rawStatus: null,
  };
  try {
    const account = await resolveDocuSignAccount();
    if (!account.ok) {
      return { ...empty, message: account.result.message };
    }
    const res = await fetch(
      `${account.baseUri}/restapi/v2.1/accounts/${account.accountId}/envelopes/${encodeURIComponent(envelopeId)}`,
      {
        headers: { Authorization: `Bearer ${account.token}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    const payload = (await res.json()) as { status?: string; message?: string };
    if (!res.ok) {
      return { ...empty, message: payload.message || `DocuSign envelope poll failed (${res.status}).` };
    }
    let mapped = mapDocuSignEnvelopeStatus(payload.status ?? null);
    if (mapped !== "completed") {
      const recipientsRes = await fetch(
        `${account.baseUri}/restapi/v2.1/accounts/${account.accountId}/envelopes/${encodeURIComponent(envelopeId)}/recipients`,
        {
          headers: { Authorization: `Bearer ${account.token}` },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (recipientsRes.ok) {
        const recipients = (await recipientsRes.json()) as {
          signers?: { status?: string }[];
        };
        const signerStatus = recipients.signers?.[0]?.status ?? null;
        mapped = mapDocuSignEnvelopeStatus(signerStatus) ?? mapped;
      }
    }
    return {
      ok: true,
      envelopeId,
      status: mapped,
      rawStatus: payload.status ?? null,
    };
  } catch (error) {
    return {
      ...empty,
      message: error instanceof Error ? error.message : "DocuSign envelope poll failed.",
    };
  }
}

/** Identity ping used by the Documents eSign test path when send is not attempted. */
export async function docusignSandboxIdentity(): Promise<{ ready: boolean; label: string | null }> {
  const ready = await docusignIsReady();
  if (!ready) return { ready: false, label: null };
  try {
    const ping = await pingDocuSignSandbox();
    return { ready: true, label: ping.accountName || ping.email || ping.name };
  } catch {
    return { ready: true, label: null };
  }
}
