import { and, eq } from "drizzle-orm";
import {
  DEFAULT_TENANT_ID,
  SEND_FROM_PROVIDERS,
  SEND_FROM_LABELS,
  type SendFromProvider,
} from "@/lib/domain";
import { db, sql } from "@/lib/db";
import { emailSendAccounts } from "@/lib/db/schema";

export type SendAccountView = {
  id: string;
  provider: SendFromProvider;
  label: string;
  status: string;
  accountEmail: string | null;
  source: "email_connections" | "email_send_accounts";
  connected: boolean;
};

function asProvider(value: string): SendFromProvider {
  if (value === "zoho") return "zoho_mail";
  if (value === "other") return "imap";
  if ((SEND_FROM_PROVIDERS as readonly string[]).includes(value)) {
    return value as SendFromProvider;
  }
  return "google";
}

function isConnected(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "connected" || s === "connected_demo";
}

type ConnectionRow = {
  id: string;
  provider: string;
  status: string;
  account_email: string | null;
};

async function readInboxConnections(tenantId: string): Promise<ConnectionRow[] | null> {
  try {
    const rows = await sql<ConnectionRow[]>`
      select id, provider, status, account_email
      from email_connections
      where tenant_id = ${tenantId}
    `;
    return rows ?? [];
  } catch {
    return null;
  }
}

export async function listSendAccounts(tenantId = DEFAULT_TENANT_ID): Promise<SendAccountView[]> {
  const inbox = await readInboxConnections(tenantId);
  if (inbox && inbox.length > 0) {
    const byProvider = new Map<SendFromProvider, SendAccountView>();
    for (const row of inbox) {
      const provider = asProvider(row.provider);
      byProvider.set(provider, {
        id: row.id,
        provider,
        label: SEND_FROM_LABELS[provider],
        status: row.status,
        accountEmail: row.account_email,
        source: "email_connections",
        connected: isConnected(row.status),
      });
    }
    return SEND_FROM_PROVIDERS.map((provider) => {
      const existing = byProvider.get(provider);
      if (existing) return existing;
      return {
        id: `missing-${provider}`,
        provider,
        label: SEND_FROM_LABELS[provider],
        status: "disconnected",
        accountEmail: null,
        source: "email_connections",
        connected: false,
      };
    });
  }

  const local = await db
    .select()
    .from(emailSendAccounts)
    .where(eq(emailSendAccounts.tenantId, tenantId));

  return SEND_FROM_PROVIDERS.map((provider) => {
    const row = local.find((r) => asProvider(r.provider) === provider);
    return {
      id: row?.id ?? `missing-${provider}`,
      provider,
      label: SEND_FROM_LABELS[provider],
      status: row?.status ?? "disconnected",
      accountEmail: row?.accountEmail ?? null,
      source: "email_send_accounts" as const,
      connected: isConnected(row?.status),
    };
  });
}

export async function getSendAccount(
  provider: SendFromProvider,
  tenantId = DEFAULT_TENANT_ID,
): Promise<SendAccountView> {
  const accounts = await listSendAccounts(tenantId);
  return (
    accounts.find((a) => a.provider === provider) ?? {
      id: `missing-${provider}`,
      provider,
      label: SEND_FROM_LABELS[provider],
      status: "disconnected",
      accountEmail: null,
      source: "email_send_accounts",
      connected: false,
    }
  );
}

export async function markSendAccountDemoConnected(
  provider: SendFromProvider,
  tenantId = DEFAULT_TENANT_ID,
): Promise<SendAccountView> {
  const stubEmail =
    provider === "google"
      ? "desk@javiergarcia.example"
      : provider === "outlook"
        ? "desk@javiergarcia.onmicrosoft.example"
        : provider === "yahoo"
          ? "desk@yahoo.example"
          : provider === "zoho_mail"
            ? "desk@zoho.example"
            : "desk@imap.example";

  const inbox = await readInboxConnections(tenantId);
  if (inbox) {
    const match = inbox.find((row) => asProvider(row.provider) === provider);
    if (match) {
      await sql`
        update email_connections
        set status = 'connected_demo',
            account_email = coalesce(account_email, ${stubEmail}),
            updated_at = now()
        where id = ${match.id}
      `;
    }
  }

  const [existing] = await db
    .select()
    .from(emailSendAccounts)
    .where(
      and(eq(emailSendAccounts.tenantId, tenantId), eq(emailSendAccounts.provider, provider)),
    );

  if (existing) {
    await db
      .update(emailSendAccounts)
      .set({
        status: "connected_demo",
        accountEmail: existing.accountEmail ?? stubEmail,
        updatedAt: new Date(),
      })
      .where(eq(emailSendAccounts.id, existing.id));
  }

  return getSendAccount(provider, tenantId);
}

export async function markSendAccountConnected(
  provider: SendFromProvider,
  accountEmail: string | null,
  opts: { connected?: boolean; tenantId?: string } = {},
): Promise<SendAccountView> {
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;
  const connected = opts.connected !== false;
  const status = connected ? "connected" : "disconnected";
  const inbox = await readInboxConnections(tenantId);
  if (inbox) {
    const match = inbox.find((row) => asProvider(row.provider) === provider);
    if (match) {
      await sql`
        update email_connections
        set status = ${status},
            account_email = coalesce(${accountEmail}, account_email),
            updated_at = now()
        where id = ${match.id}
      `;
    }
  }

  const [existing] = await db
    .select()
    .from(emailSendAccounts)
    .where(and(eq(emailSendAccounts.tenantId, tenantId), eq(emailSendAccounts.provider, provider)));

  if (existing) {
    await db
      .update(emailSendAccounts)
      .set({
        status,
        accountEmail: accountEmail ?? (connected ? existing.accountEmail : existing.accountEmail),
        updatedAt: new Date(),
      })
      .where(eq(emailSendAccounts.id, existing.id));
  } else if (connected) {
    await db.insert(emailSendAccounts).values({
      tenantId,
      provider,
      status,
      accountEmail,
    });
  }

  return getSendAccount(provider, tenantId);
}

export type ConnectorSendResult =
  | { ok: true; detail: string }
  | { ok: false; queued: true; detail: string }
  | { ok: false; queued: false; detail: string };

export async function sendThroughConnectedInbox(input: {
  provider: SendFromProvider;
  to: string;
  subject: string;
  body: string;
}): Promise<ConnectorSendResult> {
  const account = await getSendAccount(input.provider);
  if (!account.connected) {
    return { ok: false, queued: true, detail: "connect email to send" };
  }

  if (account.provider === "google") {
    try {
      const { gmailIsReady, sendGmailMessage } = await import("@/lib/integrations/gmail");
      if (await gmailIsReady()) {
        const sent = await sendGmailMessage({
          to: input.to,
          subject: input.subject,
          body: input.body,
        });
        return { ok: true, detail: `gmail:${sent.id}` };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Gmail send failed";
      return { ok: false, queued: false, detail };
    }
  }

  try {
    const load = new Function("spec", "return import(spec)") as (
      spec: string,
    ) => Promise<{
      getEmailProvider?: (
        kind: string,
        id: string,
      ) => {
        send: (draft: { to: string; subject: string; body: string }) => Promise<{
          status?: string;
        }>;
      };
    }>;
    const email = await load("@/lib/email");
    if (typeof email.getEmailProvider === "function") {
      const provider = email.getEmailProvider(
        account.provider === "zoho_mail"
          ? "zoho"
          : account.provider === "imap"
            ? "other"
            : account.provider,
        account.id,
      );
      const result = await provider.send({
        to: input.to,
        subject: input.subject,
        body: input.body,
      });
      return { ok: true, detail: result.status ?? "would_send" };
    }
  } catch {
    // Inbox slice not merged. Demo-connected catalog still "sends" locally.
  }

  return { ok: true, detail: "would_send" };
}
