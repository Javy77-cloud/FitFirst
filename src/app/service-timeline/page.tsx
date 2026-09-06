import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { StatusBadge } from "@/components/status-badge";
import { formatDay } from "@/lib/domain";
import { SERVICE_TIMELINE_COLUMNS } from "@/lib/list-columns";
import { SERVICE_TIMELINE_DISCLAIMER, serviceTimelineEventLabel } from "@/lib/domain-ams";
import { listServiceTimeline } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function ServiceTimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const event = typeof params.event === "string" ? params.event : undefined;
  const rows = await listServiceTimeline();
  const filtered = event ? rows.filter(({ log }) => log.eventType === event) : rows;

  return (
    <AppShell title="Service timeline">
      <p className="mb-3 text-base text-muted-foreground">{SERVICE_TIMELINE_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        <Link href="/service-timeline" className="text-primary hover:underline">
          All servicing
        </Link>
        {" · "}
        <Link href="/service-timeline?event=service_note" className="text-primary hover:underline">
          Notes
        </Link>
        {" · "}
        <Link href="/service-requests" className="text-primary hover:underline">
          Service requests
        </Link>
        {" · "}
        <Link href="/endorsements" className="text-primary hover:underline">
          Endorsements
        </Link>
        {" · "}
        <Link href="/renewals/queue" className="text-primary hover:underline">
          Renewal queue
        </Link>
        {" · "}
        <Link href="/inspections" className="text-primary hover:underline">
          Inspections
        </Link>
        {" · "}
        <Link href="/installments" className="text-primary hover:underline">
          Installments
        </Link>
      </p>
      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="service-timeline"
          columns={SERVICE_TIMELINE_COLUMNS}
          empty="No servicing activity on the book. Open a Policy and log a note, or work a request."
          rows={filtered.map(({ log, activity, policy, contact, account }) => ({
            key: log.id,
            cells: {
              when: formatDay(log.occurredAt),
              event: <StatusBadge status={log.eventType}>{serviceTimelineEventLabel(log.eventType)}</StatusBadge>,
              policy: policy ? (
                <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
              ) : (
                activity.title
              ),
              party: contact ? `${contact.lastName}, ${contact.firstName}` : account?.name ?? "—",
              log: log.body,
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
