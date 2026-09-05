import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { formatDay } from "@/lib/domain";
import { requireSignedIn } from "@/lib/auth/guards";
import { listOutboundJobs } from "@/lib/desk/outbound-queue";

export const dynamic = "force-dynamic";

export default async function OutboundQueuePage() {
  await requireSignedIn();
  const jobs = await listOutboundJobs();

  return (
    <SettingsShell title="Outbound queue" current="outbound">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Email and SMS intent from the desk. Jobs draft or hold here. Nothing sends — a later vendor
        can pick this queue up. Opt-outs hold the job.
      </p>
      <p className="mb-4 text-sm">
        <Link href="/settings/communications" className="text-primary hover:underline">
          Communications
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link href="/settings/email-triggers" className="text-primary hover:underline">
          Won-date email jobs
        </Link>
      </p>
      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Queued / held
        </div>
        {jobs.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No outbound jobs yet. Queue email or SMS from a Contact, Business, or Deal.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>Status</th>
                <th>To</th>
                <th>Subject / body</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{formatDay(job.createdAt)}</td>
                  <td className="uppercase">{job.channel}</td>
                  <td>
                    {job.status}
                    {job.holdReason ? (
                      <span className="ml-1 text-helper text-muted-foreground">{job.holdReason}</span>
                    ) : null}
                  </td>
                  <td>{job.toAddress ?? "—"}</td>
                  <td className="max-w-xs truncate">{job.subject || job.body || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SettingsShell>
  );
}
