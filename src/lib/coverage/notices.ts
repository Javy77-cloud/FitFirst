import { CONTACT_ID } from "@/lib/fixtures/ids";
import { LOST_STAGES, WON_STAGES } from "@/lib/home/aggregate";
import { OPEN_DEAL_STAGES } from "@/lib/home/kpis";
import { isAnaLockedId, isAnaName } from "@/lib/merge/lock";
import {
  applyInForceCarrierLock,
  classifyDeclaredCoverageType,
  type DeclaredCoverageLine,
} from "./declared-coverage";
import {
  analyzeCoverageGaps,
  classifyCoverageLine,
  gapLineLabel,
  inForceGapPolicies,
  type CoverageGapFinding,
  type CoverageLine,
  type GapPolicyInput,
} from "./gaps";

export const COVERAGE_GAP_ALERT_KIND = "coverage_gap";
export const OPPORTUNITY_ALERT_KIND = "opportunity";

export const COVERAGE_NOTICE_KINDS = [COVERAGE_GAP_ALERT_KIND, OPPORTUNITY_ALERT_KIND] as const;

export type CoverageNoticeKind = (typeof COVERAGE_NOTICE_KINDS)[number];

export type PlannedCoverageNotice = {
  kind: CoverageNoticeKind;
  key: string;
  title: string;
  body: string;
  contactId: string;
  relatedType: "policy" | "deal" | null;
  relatedId: string | null;
  href: string;
  severity: "info" | "warning";
};

export type NoticeDealInput = {
  id: string;
  title: string;
  pipelineStage: string;
  lineOfBusiness?: string | null;
};

const NOTICE_KEY_RE = /^key:([^\n]+)$/m;
const RELATED_RE = /^related:(policy|deal):([0-9a-f-]{36})$/im;

export function isCoverageNoticeKind(kind: string | null | undefined): kind is CoverageNoticeKind {
  return kind === COVERAGE_GAP_ALERT_KIND || kind === OPPORTUNITY_ALERT_KIND;
}

export function isOpenDealStage(stage: string | null | undefined): boolean {
  const raw = String(stage ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  const underscored = raw.replace(/[\s-]+/g, "_");
  if (WON_STAGES.has(raw) || WON_STAGES.has(underscored)) return false;
  if (LOST_STAGES.has(raw) || LOST_STAGES.has(underscored)) return false;
  if (raw === "bound" || underscored === "policy_issued" || raw === "archived") return false;
  if (OPEN_DEAL_STAGES.has(raw) || OPEN_DEAL_STAGES.has(underscored)) return true;
  return !raw.includes("closed");
}

/** Map picklist / deal labels onto gap lines (Home, Renters, Condo → HO). */
export function classifyOpportunityLine(raw: string | null | undefined): CoverageLine {
  return classifyDeclaredCoverageType(raw);
}

export function householdInForceLines(policies: GapPolicyInput[]): Set<CoverageLine> {
  const lines = new Set<CoverageLine>();
  for (const policy of inForceGapPolicies(policies)) {
    lines.add(classifyCoverageLine(policy.lineOfBusiness));
  }
  return lines;
}

/** In-force plus declared us/other — used so “missing” is not a false gap. */
export function householdCoveredLines(
  policies: GapPolicyInput[],
  declared?: readonly DeclaredCoverageLine[] | null,
): Set<CoverageLine> {
  const lines = householdInForceLines(policies);
  for (const row of applyInForceCarrierLock(declared ?? [], lines)) {
    if (row.line !== "OTHER") lines.add(row.line);
  }
  return lines;
}

export function coverageNoticeHref(input: {
  contactId: string;
  hash: "coverage" | "opportunities";
  policyId?: string | null;
  dealId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("section", input.hash);
  if (input.policyId) params.set("focusPolicy", input.policyId);
  if (input.dealId) params.set("focusDeal", input.dealId);
  const query = params.toString();
  return `/contacts/${input.contactId}${query ? `?${query}` : ""}#${input.hash}`;
}

export function encodeNoticeBody(input: {
  key: string;
  relatedType?: "policy" | "deal" | null;
  relatedId?: string | null;
  plain: string;
}): string {
  const related =
    input.relatedType && input.relatedId ? `related:${input.relatedType}:${input.relatedId}` : "related:";
  return [`key:${input.key}`, related, "", input.plain.trim()].join("\n");
}

export function parseNoticeKey(body: string): string | null {
  const match = body.match(NOTICE_KEY_RE);
  return match?.[1]?.trim() || null;
}

export function parseNoticeRelated(body: string): { type: "policy" | "deal"; id: string } | null {
  const match = body.match(RELATED_RE);
  if (!match) return null;
  return { type: match[1] as "policy" | "deal", id: match[2] };
}

export function noticeHrefFromAlert(alert: {
  kind: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
}): string | null {
  if (!isCoverageNoticeKind(alert.kind)) return null;
  const contactId = alert.entityType === "contact" ? alert.entityId : null;
  if (!contactId) return null;
  const related = parseNoticeRelated(alert.body);
  return coverageNoticeHref({
    contactId,
    hash: alert.kind === OPPORTUNITY_ALERT_KIND ? "opportunities" : "coverage",
    policyId: related?.type === "policy" ? related.id : null,
    dealId: related?.type === "deal" ? related.id : null,
  });
}

export function isAnaCoverageParty(input: {
  contactId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isAna?: boolean;
}): boolean {
  if (input.isAna) return true;
  if (isAnaLockedId(input.contactId)) return true;
  if (input.contactId === CONTACT_ID) return true;
  if (input.firstName && input.lastName && isAnaName(input.firstName, input.lastName)) return true;
  return false;
}

function relatedInForcePolicy(
  finding: CoverageGapFinding,
  policies: GapPolicyInput[],
): GapPolicyInput | null {
  const inForce = inForceGapPolicies(policies);
  return (
    inForce.find((policy) => finding.has.includes(classifyCoverageLine(policy.lineOfBusiness))) ??
    inForce[0] ??
    null
  );
}

function openDealForLine(deals: NoticeDealInput[], line: CoverageLine): NoticeDealInput | null {
  return (
    deals.find(
      (deal) => isOpenDealStage(deal.pipelineStage) && classifyOpportunityLine(deal.lineOfBusiness) === line,
    ) ?? null
  );
}

export function planContactNotices(input: {
  contactId: string;
  partyName: string;
  firstName?: string | null;
  lastName?: string | null;
  isAna?: boolean;
  policies: GapPolicyInput[];
  deals: NoticeDealInput[];
  taggedCrossSell?: string | null;
  quoteCount?: number;
  declaredCoverage?: DeclaredCoverageLine[];
}): PlannedCoverageNotice[] {
  if (isAnaCoverageParty(input)) return [];

  const report = analyzeCoverageGaps({
    policies: input.policies,
    partyName: input.partyName,
    quoteCount: input.quoteCount,
    declaredCoverage: input.declaredCoverage,
  });
  const inForceLines = householdCoveredLines(input.policies, input.declaredCoverage);
  const planned: PlannedCoverageNotice[] = [];

  for (const finding of report.findings) {
    const relatedPolicy = relatedInForcePolicy(finding, input.policies);
    planned.push({
      kind: COVERAGE_GAP_ALERT_KIND,
      key: finding.id,
      title: `Coverage gap · ${finding.title}`,
      body: encodeNoticeBody({
        key: finding.id,
        relatedType: relatedPolicy ? "policy" : null,
        relatedId: relatedPolicy?.id ?? null,
        plain: finding.plainEnglish,
      }),
      contactId: input.contactId,
      relatedType: relatedPolicy ? "policy" : null,
      relatedId: relatedPolicy?.id ?? null,
      href: coverageNoticeHref({
        contactId: input.contactId,
        hash: "coverage",
        policyId: relatedPolicy?.id ?? null,
      }),
      severity: finding.severity === "talk" ? "warning" : "info",
    });

    for (const missing of finding.missing) {
      const deal = openDealForLine(input.deals, missing);
      if (!deal) continue;
      const key = `deal:${deal.id}`;
      planned.push({
        kind: OPPORTUNITY_ALERT_KIND,
        key,
        title: `Opportunity · ${gapLineLabel(missing)} deal still open`,
        body: encodeNoticeBody({
          key,
          relatedType: "deal",
          relatedId: deal.id,
          plain: `${deal.title || "Open deal"} is still shopping ${gapLineLabel(missing)} for ${input.partyName}. Household is missing that in-force line.`,
        }),
        contactId: input.contactId,
        relatedType: "deal",
        relatedId: deal.id,
        href: coverageNoticeHref({
          contactId: input.contactId,
          hash: "opportunities",
          dealId: deal.id,
        }),
        severity: "info",
      });
    }
  }

  const tagged = String(input.taggedCrossSell ?? "").trim();
  if (tagged) {
    const line = classifyOpportunityLine(tagged);
    const alreadyInForce = inForceLines.has(line);
    const openDeal = line === "OTHER" ? null : openDealForLine(input.deals, line);
    if (!alreadyInForce && !openDeal && line !== "OTHER") {
      const key = `tagged:${tagged}`;
      planned.push({
        kind: OPPORTUNITY_ALERT_KIND,
        key,
        title: `Opportunity · ${tagged} tagged for cross-sell`,
        body: encodeNoticeBody({
          key,
          relatedType: null,
          relatedId: null,
          plain: `${input.partyName} is tagged for ${tagged}. No in-force ${gapLineLabel(line)} and no open deal for that line.`,
        }),
        contactId: input.contactId,
        relatedType: null,
        relatedId: null,
        href: coverageNoticeHref({
          contactId: input.contactId,
          hash: "opportunities",
        }),
        severity: "info",
      });
    }
  }

  const seen = new Set<string>();
  return planned.filter((notice) => {
    const id = `${notice.kind}:${notice.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function displayNoticeBody(body: string): string {
  const parts = body.split(/\n\n/);
  return (parts.length > 1 ? parts.slice(1).join("\n\n") : body).trim();
}
