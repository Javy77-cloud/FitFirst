import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { buttonVariants } from "@/components/ui/button";
import { listInboxStubs } from "@/lib/db/queries";
import { inboxWorkEmailConnected } from "@/lib/desk/inbox";
import { listSendAccounts } from "@/lib/templates/connectors";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function kindLabel(kind: string) {
  if (kind === "sms") return "Text";
  if (kind === "inbound_email") return "Queued inbound";
  return "Email";
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function InboxPage() {
  const [rows, accounts] = await Promise.all([listInboxStubs(), listSendAccounts()]);
  const connected = inboxWorkEmailConnected(accounts);

  return (
    <AppShell
      title="Inbox"
      actions={
        <Link href="/settings/email" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Connect work email
        </Link>
      }
    >
      <section className="mb-4 rounded-md border border-dashed border-border px-4 py-3">
        <h2 className="text-base font-semibold text-navy">
          {connected ? "Work email marked" : "Connect your work email"}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          FitFirst does not host a mailbox. Bring Gmail, Outlook, or IMAP under Settings → Email
          when the agency is ready. Threads logged on a Contact still appear below.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Status: {connected ? "connected" : "not connected"}
        </p>
      </section>
      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-navy">Inbound on the book</h2>
          <p className="text-sm text-muted-foreground">
            Email and text already written to the activity log, plus unassigned inbound offers.
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No inbound on this book yet. Log an email on a Contact, or connect work email in
            Settings.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-medium text-navy">{row.subject}</div>
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {kindLabel(row.kind)} · {row.status}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.snippet}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  From {row.from} · {formatWhen(row.occurredAt)}
                  {row.href ? (
                    <>
                      {" · "}
                      <RecordLink href={row.href}>Open record</RecordLink>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
