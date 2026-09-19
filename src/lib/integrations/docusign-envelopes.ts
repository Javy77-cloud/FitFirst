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

export async function attemptDocuSignEnvelope(input: {
  filename: string;
  mimeType: string;
  storagePath: string;
  signerName: string;
  signerEmail: string;
  subject?: string;
}): Promise<DocuSignSendResult> {
  const connected = await docusignIsReady();
  if (!connected) return classifyDocuSignSend({ connected: false });

  const token = await liveAccessToken("docusign");
  if (!token) {
    return classifyDocuSignSend({
      connected: true,
      apiOk: false,
      error: "DocuSign access token is missing. Reconnect sandbox OAuth.",
    });
  }

  try {
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
      return classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: info.error_description || `DocuSign userinfo failed (${infoRes.status}).`,
      });
    }
    const account = info.accounts?.find((row) => row.is_default) ?? info.accounts?.[0];
    if (!account?.account_id || !account.base_uri) {
      return classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: "DocuSign userinfo did not return account_id / base_uri.",
      });
    }

    const bytes = await readStoredFile(input.storagePath);
    if (!bytes) {
      return classifyDocuSignSend({
        connected: true,
        apiOk: false,
        error: "Filled packet is missing from storage.",
      });
    }

    const ext = input.filename.includes(".") ? input.filename.split(".").pop() : "txt";
    const res = await fetch(
      `${account.base_uri.replace(/\/$/, "")}/restapi/v2.1/accounts/${account.account_id}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
                tabs: {
                  signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "120", yPosition: "160" }],
                },
              },
            ],
          },
          status: "sent",
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
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
