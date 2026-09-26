/**
 * Book HO3 Fill-from-DEC.
 * Dry-run is the default. --apply calls the desk fill (overwrite, no cancel).
 * HO3 only. Does not fill Auto, flood, DP, HO6, or HO3 Wind Only.
 *
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts --apply
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts --policy <uuid>
 *
 * A previous fill is not a skip. Re-run overwrites, same as Confirm on the desk.
 * Needs DATABASE_URL. --apply also needs GEMINI_API_KEY and blob read access.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { carriers, contacts, policies, policyFillAudit, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { loadFillDecDocument } from "@/lib/policy/fill-dec-document";
import { formatFillServerTime } from "@/lib/policy/fill-from-dec";
import {
  HO3_BOOK_FILL_ACTOR,
  HO3_BOOK_FILL_REASON,
  ho3BookExclusionReason,
  isBookHo3Policy,
} from "@/lib/policy/ho3-book";

type PolicyRow = {
  id: string;
  policyNumber: string;
  status: string;
  formType: string | null;
  policySubType: string | null;
  policyType: string | null;
  lineOfBusiness: string;
  carrierName: string | null;
  insured: string;
};

async function shutdown(code: number): Promise<never> {
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* pool already closed */
  }
  process.exit(code);
}

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1]?.trim() ?? "";
  return value && !value.startsWith("--") ? value : null;
}

function personName(first: string | null, last: string | null): string {
  const name = [first, last]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return name || "—";
}

async function loadPolicies(): Promise<PolicyRow[]> {
  const rows = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      status: policies.status,
      formType: policies.formType,
      policySubType: policies.policySubType,
      policyType: policies.policyType,
      lineOfBusiness: policies.lineOfBusiness,
      carrierName: carriers.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(policies)
    .leftJoin(carriers, eq(carriers.id, policies.carrierId))
    .leftJoin(contacts, eq(contacts.id, policies.contactId))
    .where(eq(policies.tenantId, DEFAULT_TENANT_ID));
  return rows.map((row) => ({
    id: row.id,
    policyNumber: row.policyNumber,
    status: row.status,
    formType: row.formType,
    policySubType: row.policySubType,
    policyType: row.policyType,
    lineOfBusiness: row.lineOfBusiness,
    carrierName: row.carrierName,
    insured: personName(row.firstName, row.lastName),
  }));
}

async function latestFills(policyIds: string[]) {
  const map = new Map<string, { at: string; agent: string; file: string }>();
  if (!policyIds.length) return map;
  const audits = await db
    .select({
      policyId: policyFillAudit.policyId,
      createdAt: policyFillAudit.createdAt,
      agentName: policyFillAudit.agentName,
      documentFilename: policyFillAudit.documentFilename,
    })
    .from(policyFillAudit)
    .where(
      and(eq(policyFillAudit.tenantId, DEFAULT_TENANT_ID), inArray(policyFillAudit.policyId, policyIds)),
    );
  for (const audit of audits) {
    const at = audit.createdAt.toISOString();
    const prev = map.get(audit.policyId);
    if (prev && prev.at >= at) continue;
    map.set(audit.policyId, {
      at,
      agent: audit.agentName,
      file: audit.documentFilename ?? "",
    });
  }
  return map;
}

async function actor(): Promise<{ userId: string; name: string } | null> {
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.tenantId, DEFAULT_TENANT_ID),
        eq(users.active, true),
        eq(users.name, HO3_BOOK_FILL_ACTOR),
      ),
    )
    .limit(1);
  if (!user) return null;
  return { userId: user.id, name: user.name };
}

function line(cells: string[]): string {
  return cells.join("\t");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const onlyPolicy = argValue("--policy");
  const book = await loadPolicies();
  const ho3 = book.filter((row) => isBookHo3Policy(row));
  const scoped = onlyPolicy ? ho3.filter((row) => row.id === onlyPolicy) : ho3;
  if (onlyPolicy && !scoped.length) {
    const found = book.find((row) => row.id === onlyPolicy);
    const why = found ? ho3BookExclusionReason(found) : "policy not in this book";
    console.error(`Refusing ${onlyPolicy}: ${why ?? "not HO3"}. This pass does not fill it.`);
    await shutdown(1);
  }

  const fills = await latestFills(scoped.map((row) => row.id));
  const eligible: Array<PolicyRow & { documentId: string; filename: string }> = [];
  const skipped: Array<PolicyRow & { reason: string }> = [];

  for (const row of scoped.sort((a, b) => a.policyNumber.localeCompare(b.policyNumber))) {
    const dec = await loadFillDecDocument({ policyId: row.id });
    if (!dec.ok) {
      skipped.push({ ...row, reason: dec.error });
      continue;
    }
    eligible.push({ ...row, documentId: dec.doc.id, filename: dec.doc.filename ?? "" });
  }

  const excluded = book
    .filter((row) => !isBookHo3Policy(row))
    .filter((row) => {
      const reason = ho3BookExclusionReason(row);
      return reason !== "not HO3";
    })
    .sort((a, b) => (ho3BookExclusionReason(a) ?? "").localeCompare(ho3BookExclusionReason(b) ?? "") || a.policyNumber.localeCompare(b.policyNumber));

  console.log(apply ? "HO3 book Fill-from-DEC APPLY" : "HO3 book Fill-from-DEC dry-run");
  console.log(`HO3 policies: ${ho3.length}`);
  console.log(`With DEC (attempt): ${eligible.length}`);
  console.log(`HO3 skipped: ${skipped.length}`);
  console.log(`Excluded from this pass: ${excluded.length}`);
  console.log("Already filled is not a skip. Apply overwrites.");
  console.log("");
  console.log(line(["decision", "policyNumber", "insured", "carrier", "policyId", "dec", "note"]));

  for (const row of eligible) {
    const prior = fills.get(row.id);
    const note = prior
      ? `overwrite; last fill ${formatFillServerTime(new Date(prior.at))} by ${prior.agent}`
      : "no prior fill; overwrite allowed";
    console.log(line(["fill", row.policyNumber, row.insured, row.carrierName ?? "—", row.id, row.filename, note]));
  }
  for (const row of skipped) {
    console.log(
      line(["skip", row.policyNumber, row.insured, row.carrierName ?? "—", row.id, "", row.reason]),
    );
  }
  console.log("");
  console.log("Excluded (not attempted)");
  for (const row of excluded) {
    console.log(
      line([
        "exclude",
        row.policyNumber,
        row.insured,
        row.carrierName ?? "—",
        row.id,
        row.formType ?? "",
        ho3BookExclusionReason(row) ?? "not HO3",
      ]),
    );
  }

  if (!apply) {
    console.log("");
    console.log("Dry-run only. Re-run with --apply to fill the DEC rows above.");
    await shutdown(0);
  }

  const acting = await actor();
  if (!acting) {
    console.error(`Refusing apply: no active user named ${HO3_BOOK_FILL_ACTOR}.`);
    await shutdown(1);
  }

  process.env.FF_OPS_FILL = "1";
  const { fillPolicyFromDec } = await import("@/app/actions/policy-fill-from-dec");
  let succeeded = 0;
  let failed = 0;
  for (const row of eligible) {
    const result = await fillPolicyFromDec({
      policyId: row.id,
      documentId: row.documentId,
      reason: HO3_BOOK_FILL_REASON,
      source: "manual",
      confirmOverwrite: true,
      opsActor: acting,
    });
    if (result.ok) {
      succeeded += 1;
      console.log(
        line([
          "ok",
          row.policyNumber,
          row.insured,
          row.carrierName ?? "—",
          row.id,
          row.filename,
          `filled ${result.filled.length}; overwritten ${result.overwritten.length}; unchanged ${result.skipped.length}; audit ${result.auditId}`,
        ]),
      );
    } else {
      failed += 1;
      console.log(line(["fail", row.policyNumber, row.insured, row.carrierName ?? "—", row.id, row.filename, result.error]));
    }
  }

  console.log("");
  console.log(`attempted ${eligible.length}`);
  console.log(`succeeded ${succeeded}`);
  console.log(`failed ${failed}`);
  console.log(`skipped ${skipped.length}`);
  console.log(`excluded ${excluded.length}`);
  await shutdown(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  void shutdown(1);
});
