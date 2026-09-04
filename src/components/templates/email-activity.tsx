import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDay } from "@/lib/domain";
import type { EmailSendJob } from "@/lib/db/schema";

function statusLabel(job: EmailSendJob) {
  const holdReason = "holdReason" in job ? String(job.holdReason ?? "") : "";
  if (job.status === "queued" && holdReason === "connect_email_to_send") {
    return "Queued — connect email to send";
  }
  if (job.status === "queued" && holdReason === "missing_contact_email") {
    return "Queued — contact has no email";
  }
  if (job.status === "queued") return "Queued";
  if (job.status === "sent") return "Sent";
  return "Failed";
}

function statusVariant(job: EmailSendJob): "outline" | "secondary" | "destructive" {
  if (job.status === "sent") return "secondary";
  if (job.status === "failed") return "destructive";
  return "outline";
}

export function EmailActivityList({
  jobs,
  empty,
}: {
  jobs: { job: EmailSendJob }[];
  empty: string;
}) {
  if (jobs.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {jobs.map(({ job }) => (
        <li key={job.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {"subject" in job && job.subject ? String(job.subject) : "Queued send"}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                To {("toEmail" in job && job.toEmail ? String(job.toEmail) : null) ?? "—"} ·{" "}
                {("sendFromProvider" in job && job.sendFromProvider
                  ? String(job.sendFromProvider)
                  : "inbox")}{" "}
                · scheduled {formatDay(job.scheduledFor)} from {job.anchorKind.replace("_", " ")}{" "}
                {formatDay(job.anchorAt)}
              </p>
            </div>
            <Badge variant={statusVariant(job)}>{statusLabel(job)}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HistoryList({
  items,
}: {
  items: { id: string; eventType: string; body: string; occurredAt: Date }[];
}) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((row) => (
        <li key={row.id} className="px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {row.eventType.replaceAll("_", " ")} · {formatDay(row.occurredAt)}
          </div>
          <p className="mt-1 text-sm">{row.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function SettingsSubnav({
  current,
}: {
  current: "hub" | "agency" | "templates" | "signatures" | "triggers" | "my-desk";
}) {
  const items = [
    { href: "/settings", id: "hub" as const, label: "Overview" },
    { href: "/settings/agency", id: "agency" as const, label: "Agency" },
    { href: "/settings/email-templates", id: "templates" as const, label: "Templates" },
    { href: "/settings/email-signatures", id: "signatures" as const, label: "Signatures" },
    { href: "/settings/email-triggers", id: "triggers" as const, label: "Triggers" },
    { href: "/settings/my-desk", id: "my-desk" as const, label: "My desk" },
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={
            current === item.id
              ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
              : "rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-navy"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
