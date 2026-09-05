import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { formatDay } from "@/lib/domain";
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
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No servicing activity on the book. Open a Policy and log a note, or work a request.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Policy</th>
                <th>Party</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ log, activity, policy, contact, account }) => (
                <tr key={log.id}>
                  <td>{formatDay(log.occurredAt)}</td>
                  <td>
                    <span className="rounded-full bg-[var(--ff-sidebar)] px-2 py-0.5 text-xs font-semibold text-white">
                      {serviceTimelineEventLabel(log.eventType)}
                    </span>
                  </td>
                  <td className="font-medium">
                    {policy ? (
                      <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                    ) : (
                      activity.title
                    )}
                  </td>
                  <td>
                    {contact
                      ? `${contact.lastName}, ${contact.firstName}`
                      : account?.name ?? "—"}
                  </td>
                  <td className="text-sm text-muted-foreground">{log.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
