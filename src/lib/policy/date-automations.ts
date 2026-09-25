/**
 * Pure plan for policy date automations (renewal 60/30 + OEP stay-put).
 * Off-book statuses schedule nothing — a future X-date must not reopen chase work.
 */
import { addUtcDays } from "@/lib/home/as-of";
import { inferLineFamily, isOepLine, type LineFamily } from "@/lib/desk/commission-line";
import { isOffBookStatus } from "@/lib/policy/status";

export type DateAutomationJob = {
  kind: string;
  fireOn: Date;
  title: string;
  body: string;
};

export function planPolicyDateAutomationJobs(input: {
  status: string | null | undefined;
  expirationDate: Date;
  oepStart?: Date | null;
  lineOfBusiness: string;
  commissionFamily?: string | null;
  policySubType?: string | null;
  asOf: Date;
  party: string;
  policyType: string;
  policyNumber: string;
}): DateAutomationJob[] {
  if (isOffBookStatus(input.status)) return [];

  const jobs: DateAutomationJob[] = [];
  const xDate = input.expirationDate;
  for (const days of [30, 60] as const) {
    const window = addUtcDays(input.asOf, days);
    if (xDate > input.asOf && xDate <= window) {
      jobs.push({
        kind: `renewal_${days}`,
        fireOn: addUtcDays(xDate, -days),
        title: `Policy renewal coming up - ${input.party} - ${input.policyType}`,
        body: `${input.policyNumber} X-Date ${xDate.toISOString().slice(0, 10)}. ${days}-day renewal (90-day is off). High. Not Started.`,
      });
    }
  }

  const family = inferLineFamily(
    input.lineOfBusiness,
    input.commissionFamily,
    input.policySubType,
  ) as LineFamily;
  if (input.oepStart && isOepLine(family, input.policySubType)) {
    jobs.push({
      kind: "oep_stay_put",
      fireOn: addUtcDays(input.oepStart, -30),
      title: `OEP stay-put — ${input.party} — ${input.policyType}`,
      body: `Internal stay-put 30 days before OEP start ${input.oepStart.toISOString().slice(0, 10)}. No client email. No new policy.`,
    });
  }

  return jobs;
}
