/**
 * Read-only current-term audit. Reports only — never updates a policy.
 *
 * Output is plain text:
 *   FitFirst current-term audit
 *   asOf: YYYY-MM-DD ET
 *   mode: sample | live
 *   policies: N
 *   findings: N
 *   by code: CODE=N, ...
 *
 *   POLICY <policyNumber> <id>
 *     insured: ...
 *     line: ...  status: ...  band: ...
 *     - CODE: message
 */

import { etDateKey } from "@/lib/time/et";
import {
  businessDateKey,
  namedInsuredOrderChanged,
  normalizeNamedInsured,
  resolveCurrentTerm,
  type CurrentTermInput,
  type TermCandidate,
} from "@/lib/policies/current-term";
import { lineFamily } from "@/lib/policies/issue-term";

export type AuditPolicyRow = CurrentTermInput & {
  id: string;
  dealId?: string | null;
  sourceProduct?: string | null;
};

export type AuditFinding = {
  policyId: string;
  policyNumber: string;
  code:
    | "NO_CURRENT_TERM"
    | "SEVERAL_CURRENT_TERMS"
    | "ROLE_CURRENT_NOT_IN_WINDOW"
    | "POLICY_ROW_DATES_DISAGREE"
    | "NAME_ORDER"
    | "MISSING_PREMIUM"
    | "MISSING_DATES"
    | "MIXED_LINE"
    | "SHARED_DEC";
  message: string;
};

export type AuditReport = {
  asOf: string;
  findings: AuditFinding[];
  policyCount: number;
};

const IN_FORCE_STATUS = new Set(["active", "bound", "pending"]);

export function auditCurrentTerms(rows: readonly AuditPolicyRow[], asOf: Date = new Date()): AuditReport {
  const findings: AuditFinding[] = [];
  const decOwners = new Map<string, string[]>();

  for (const row of rows) {
    const docId = (row.sourceDocumentId ?? "").trim();
    if (docId) {
      const list = decOwners.get(docId) ?? [];
      list.push(row.id);
      decOwners.set(docId, list);
    }
  }

  for (const row of rows) {
    const number = row.policyNumber?.trim() || row.id;
    const resolved = resolveCurrentTerm(row, asOf);
    const status = (row.status ?? "").trim().toLowerCase();
    const effective = businessDateKey(row.effectiveDate);
    const expiration = businessDateKey(row.expirationDate);

    if (!effective || !expiration) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "MISSING_DATES",
        message: "Policy row is missing an effective or expiration date.",
      });
    }

    if (IN_FORCE_STATUS.has(status) && !resolved.current) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "NO_CURRENT_TERM",
        message: `Status is ${status} but no term covers today ET (${resolved.band}).`,
      });
    }

    if (resolved.ambiguous) {
      const windows = resolved.currentCandidates
        .map((term) => `${term.effective}→${term.expiration}`)
        .join(", ");
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "SEVERAL_CURRENT_TERMS",
        message: `More than one term covers today: ${windows}.`,
      });
    }

    for (const term of row.terms ?? []) {
      if (term.role !== "current") continue;
      const termEffective = businessDateKey(term.effective);
      const termExpiration = businessDateKey(term.expiration);
      const matches =
        resolved.current &&
        termEffective === resolved.current.effective &&
        termExpiration === resolved.current.expiration;
      if (!matches) {
        findings.push({
          policyId: row.id,
          policyNumber: number,
          code: "ROLE_CURRENT_NOT_IN_WINDOW",
          message: `policy_terms role=current is ${termEffective ?? "?"}→${termExpiration ?? "?"}, resolved current is ${resolved.current ? `${resolved.current.effective}→${resolved.current.expiration}` : "none"}.`,
        });
      }
    }

    if (
      resolved.current &&
      effective &&
      expiration &&
      (effective !== resolved.current.effective || expiration !== resolved.current.expiration)
    ) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "POLICY_ROW_DATES_DISAGREE",
        message: `Policy row ${effective}→${expiration} disagrees with current term ${resolved.current.effective}→${resolved.current.expiration}.`,
      });
    }

    if (namedInsuredOrderChanged(row.namedInsured) || isAllCapsName(row.namedInsured)) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "NAME_ORDER",
        message: `Named insured "${row.namedInsured}" normalizes to "${normalizeNamedInsured(row.namedInsured)}".`,
      });
    }

    if (resolved.current && !resolved.current.premium && !text(row.premium)) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "MISSING_PREMIUM",
        message: "Current term has no premium on the term or the policy row.",
      });
    }

    const productFamily = lineFamily(row.sourceProduct);
    const line = lineFamily(row.lineOfBusiness);
    if (productFamily && line && productFamily !== line) {
      findings.push({
        policyId: row.id,
        policyNumber: number,
        code: "MIXED_LINE",
        message: `source product ${row.sourceProduct} (${productFamily}) does not match line ${row.lineOfBusiness} (${line}).`,
      });
    }
  }

  for (const [docId, owners] of decOwners) {
    const unique = [...new Set(owners)];
    if (unique.length < 2) continue;
    for (const policyId of unique) {
      const row = rows.find((item) => item.id === policyId);
      findings.push({
        policyId,
        policyNumber: row?.policyNumber?.trim() || policyId,
        code: "SHARED_DEC",
        message: `DEC ${docId} is the source document on ${unique.length} policies.`,
      });
    }
  }

  return { asOf: etDateKey(asOf), findings, policyCount: rows.length };
}

function text(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  return raw || null;
}

function isAllCapsName(raw: string | null | undefined): boolean {
  const textValue = (raw ?? "").trim();
  if (!textValue) return false;
  const letters = textValue.replace(/[^A-Za-z]/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
}

export function formatAuditReport(report: AuditReport, mode: "sample" | "live"): string {
  const counts = new Map<string, number>();
  for (const finding of report.findings) {
    counts.set(finding.code, (counts.get(finding.code) ?? 0) + 1);
  }
  const byCode =
    [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, count]) => `${code}=${count}`)
      .join(", ") || "none";

  const lines = [
    "FitFirst current-term audit",
    `asOf: ${report.asOf} ET`,
    `mode: ${mode}`,
    `policies: ${report.policyCount}`,
    `findings: ${report.findings.length}`,
    `by code: ${byCode}`,
    "",
  ];

  const byPolicy = new Map<string, AuditFinding[]>();
  for (const finding of report.findings) {
    const list = byPolicy.get(finding.policyId) ?? [];
    list.push(finding);
    byPolicy.set(finding.policyId, list);
  }
  for (const [policyId, list] of byPolicy) {
    lines.push(`POLICY ${list[0]?.policyNumber ?? policyId} ${policyId}`);
    for (const finding of list) lines.push(`  - ${finding.code}: ${finding.message}`);
  }
  if (report.findings.length === 0) lines.push("No findings.");
  return `${lines.join("\n")}\n`;
}

/** Synthetic rows so the script can run with no database. Not production data. */
export function sampleAuditRows(asOf: Date = new Date()): AuditPolicyRow[] {
  const today = etDateKey(asOf);
  const year = Number(today.slice(0, 4));
  return [
    {
      id: "sample-zoila",
      policyNumber: "10641239",
      namedInsured: "Zoila Sample",
      status: "active",
      lineOfBusiness: "HO3",
      sourceProduct: "homeowners",
      premium: "1800",
      effectiveDate: `${year - 1}-07-30`,
      expirationDate: `${year}-07-30`,
      terms: [
        term("zoila-old", "current", `${year - 1}-07-30`, `${year}-07-30`, "1600"),
        term("zoila-new", "prior", `${year}-07-30`, `${year + 1}-07-29`, "1800"),
      ],
    },
    {
      id: "sample-robert",
      policyNumber: "ROBERT-LAPSED",
      namedInsured: "Robert Sample",
      status: "active",
      lineOfBusiness: "HO3",
      effectiveDate: `${year - 2}-01-01`,
      expirationDate: `${year - 1}-01-01`,
      premium: "900",
      terms: [term("robert-1", "current", `${year - 2}-01-01`, `${year - 1}-01-01`, "900")],
    },
    {
      id: "sample-iori",
      policyNumber: "IORI-AUTO",
      namedInsured: "IORI DOMENIC",
      status: "active",
      lineOfBusiness: "AUTO",
      sourceProduct: "auto",
      carrierName: "Travelers",
      effectiveDate: `${year}-03-01`,
      expirationDate: `${year + 1}-03-01`,
      premium: null,
      terms: [],
    },
    {
      id: "sample-rosa-ho3",
      policyNumber: "ROSA-HO3",
      namedInsured: "Rosa Castellanos",
      status: "active",
      lineOfBusiness: "HO3",
      sourceProduct: "homeowners",
      sourceDocumentId: "dec-shared",
      dealId: "rosa",
      effectiveDate: `${year}-01-01`,
      expirationDate: `${year + 1}-01-01`,
      premium: "4000",
      terms: [term("rosa-ho", "current", `${year}-01-01`, `${year + 1}-01-01`, "4000")],
    },
    {
      id: "sample-rosa-flood",
      policyNumber: "ROSA-FLOOD",
      namedInsured: "Rosa Castellanos",
      status: "active",
      lineOfBusiness: "FLOOD",
      sourceProduct: "flood",
      sourceDocumentId: "dec-shared",
      dealId: "rosa",
      effectiveDate: `${year}-11-02`,
      expirationDate: `${year + 1}-11-02`,
      premium: "1892",
      terms: [term("rosa-fl", "current", `${year}-11-02`, `${year + 1}-11-02`, "1892")],
    },
  ];
}

function term(
  id: string,
  role: string,
  effective: string,
  expiration: string,
  premium: string,
): TermCandidate {
  return { id, role, effective, expiration, premium };
}
