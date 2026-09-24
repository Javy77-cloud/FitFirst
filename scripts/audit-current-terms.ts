/**
 * Read-only current-term audit. Does not update policies.
 *
 *   npx tsx scripts/audit-current-terms.ts
 *     Sample rows only. No database connection. Prints the report format.
 *
 *   npx tsx scripts/audit-current-terms.ts --live
 *     Reads DATABASE_URL and prints findings. Refuses to run when
 *     DATABASE_URL is unset. Do not point this at production from a cloud
 *     agent — Javy runs it against Neon when he is ready.
 *
 * Output format: see formatAuditReport in src/lib/policies/current-term-audit.ts.
 * Exit code is always 0. Findings are a report, not a failing gate.
 */
import { formatAuditReport, sampleAuditRows, auditCurrentTerms, type AuditPolicyRow } from "@/lib/policies/current-term-audit";
import type { TermCandidate } from "@/lib/policies/current-term";

async function loadLiveRows(): Promise<AuditPolicyRow[]> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for --live. Refusing to guess a database.");
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, {
    max: 1,
    ssl: url.includes("sslmode=require") ? "require" : undefined,
  });
  try {
    const policies = await sql<
      {
        id: string;
        policy_number: string;
        status: string;
        line_of_business: string;
        source_product: string | null;
        premium: string | null;
        effective_date: Date;
        expiration_date: Date;
        renewal_date: Date | null;
        source_document_id: string | null;
        deal_id: string | null;
        first_name: string | null;
        last_name: string | null;
        account_name: string | null;
        carrier_name: string | null;
      }[]
    >`
      SELECT p.id, p.policy_number, p.status, p.line_of_business, p.source_product,
             p.premium, p.effective_date, p.expiration_date, p.renewal_date,
             p.source_document_id, p.deal_id,
             c.first_name, c.last_name, a.name AS account_name, car.name AS carrier_name
      FROM policies p
      LEFT JOIN contacts c ON c.id = p.contact_id
      LEFT JOIN accounts a ON a.id = p.account_id
      LEFT JOIN carriers car ON car.id = p.carrier_id
    `;
    const terms = await sql<
      {
        id: string;
        policy_id: string;
        role: string;
        term_effective: Date;
        term_expiration: Date;
        premium: string | null;
        source: string | null;
      }[]
    >`
      SELECT id, policy_id, role, term_effective, term_expiration, premium, source
      FROM policy_terms
    `;
    const byPolicy = new Map<string, TermCandidate[]>();
    for (const term of terms) {
      const list = byPolicy.get(term.policy_id) ?? [];
      list.push({
        id: term.id,
        role: term.role,
        effective: term.term_effective,
        expiration: term.term_expiration,
        premium: term.premium,
        source: term.source,
      });
      byPolicy.set(term.policy_id, list);
    }
    return policies.map((policy) => {
      const person = [policy.first_name, policy.last_name].filter(Boolean).join(" ").trim();
      return {
        id: policy.id,
        policyNumber: policy.policy_number,
        status: policy.status,
        lineOfBusiness: policy.line_of_business,
        sourceProduct: policy.source_product,
        premium: policy.premium,
        effectiveDate: policy.effective_date,
        expirationDate: policy.expiration_date,
        renewalDate: policy.renewal_date,
        sourceDocumentId: policy.source_document_id,
        dealId: policy.deal_id,
        carrierName: policy.carrier_name,
        namedInsured: person || policy.account_name,
        terms: byPolicy.get(policy.id) ?? [],
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const live = process.argv.includes("--live");
  if (live) {
    const rows = await loadLiveRows();
    process.stdout.write(formatAuditReport(auditCurrentTerms(rows), "live"));
    return;
  }
  const rows = sampleAuditRows();
  process.stdout.write(formatAuditReport(auditCurrentTerms(rows), "sample"));
  process.stdout.write(
    "\nSample mode does not read a database. Run with --live and DATABASE_URL when Javy wants the Neon report.\n",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
