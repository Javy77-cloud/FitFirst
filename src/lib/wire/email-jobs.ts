import { archiveCancelsEmailJobs } from "./pipeline";

export type EmailJobDraft = {
  kind: string;
  hangOff: "won_date" | "policy_expiration";
  delayDays: number;
  scheduledFor: Date;
  status: "queued";
};

export function scheduleWonClientEmails(wonAt: Date): EmailJobDraft[] {
  return [
    {
      kind: "thank_you",
      hangOff: "won_date",
      delayDays: 1,
      scheduledFor: addDays(wonAt, 1),
      status: "queued",
    },
    {
      kind: "google_review",
      hangOff: "won_date",
      delayDays: 4,
      scheduledFor: addDays(wonAt, 4),
      status: "queued",
    },
  ];
}

export function jobsAfterArchive(jobs: Array<{ status: string; hangOff?: string }>) {
  if (archiveCancelsEmailJobs()) {
    return jobs.map((job) => ({ ...job, status: "cancelled" }));
  }
  return jobs.map((job) => ({ ...job, status: job.status === "queued" ? "queued" : job.status }));
}

function addDays(from: Date, days: number) {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(13, 0, 0, 0);
  return next;
}
