import { describe, expect, it } from "vitest";
import { jobsAfterArchive, scheduleWonClientEmails } from "./email-jobs";
import { archiveCancelsEmailJobs } from "./pipeline";

describe("won emails vs ARCHIVE", () => {
  it("hangs jobs on won date and keeps them queued after ARCHIVE", () => {
    const wonAt = new Date("2026-09-01T15:00:00.000Z");
    const jobs = scheduleWonClientEmails(wonAt);
    expect(jobs.every((job) => job.hangOff === "won_date")).toBe(true);
    expect(archiveCancelsEmailJobs()).toBe(false);
    const after = jobsAfterArchive(jobs);
    expect(after.every((job) => job.status === "queued")).toBe(true);
  });
});
