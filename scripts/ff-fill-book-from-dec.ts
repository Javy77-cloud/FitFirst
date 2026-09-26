/**
 * Book Fill-from-DEC for every trained family.
 * Dry-run is the default. --apply calls the desk fill (overwrite, no cancel).
 *
 *   npx tsx --env-file=.env scripts/ff-fill-book-from-dec.ts
 *   npx tsx --env-file=.env scripts/ff-fill-book-from-dec.ts --family ho3|auto|dp|flood|commercial|all
 *   npx tsx --env-file=.env scripts/ff-fill-book-from-dec.ts --apply
 *   npx tsx --env-file=.env scripts/ff-fill-book-from-dec.ts --policy <uuid>
 *
 * In force (active, bound, pending) plus a Current term-role declaration,
 * or the best declaration the desk would open. A previous fill is not a skip.
 * Needs DATABASE_URL. --apply also needs GEMINI_API_KEY and blob read access.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { carriers, contacts, policies, policyFillAudit, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  BOOK_FILL_ACTOR,
  BOOK_FILL_REASON,
  classifyBookFillPolicy,
  decideBookFill,
  parseBookFillFamily,
  type BookFillFamilyFilter,
} from "@/lib/policy/book-fill";
import { loadFillDecDocument } from "@/lib/policy/fill-dec-document";
import { formatFillServerTime } from "@/lib/policy/fill-from-dec";
import { HO3_BOOK_FILL_REASON } from "@/lib/policy/ho3-book";

type PolicyRow = {
  id: string;
  policyNumber: string;
  status: string;
  formType: string | null;
  policySubType: string | null;
  policyType: string | null;
  insuranceType: string | null;
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
      insuranceType: policies.insuranceType,
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
    insuranceType: row.insuranceType,
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
      and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.active, true), eq(users.name, BOOK_FILL_ACTOR)),
    )
    .limit(1);
  if (!user) return null;
  return { userId: user.id, name: user.name };
}

function line(cells: string[]): string {
  return cells.join("\t");
}

function familyFilter(): BookFillFamilyFilter {
  const requested = argValue("--family");
  if (!requested) return "all";
  return parseBookFillFamily(requested) ?? "all";
}

export async function main() {
  const requested = argValue("--family");
  if (requested && !parseBookFillFamily(requested)) {
    console.error(`Unknown --family ${requested}. Use ho3, auto, dp, flood, commercial, or all.`);
    await shutdown(1);
  }
  const filter = familyFilter();
  const apply = process.argv.includes("--apply");
  const onlyPolicy = argValue("--policy");
  const book = await loadPolicies();
  const scoped = onlyPolicy ? book.filter((row) => row.id === onlyPolicy) : book;
  if (onlyPolicy && !scoped.length) {
    console.error(`Refusing ${onlyPolicy}: policy not in this book.`);
    await shutdown(1);
  }
  if (onlyPolicy && scoped[0]) {
    const blocked = classifyBookFillPolicy(scoped[0], filter).exclude;
    if (blocked) {
      console.error(`Refusing ${onlyPolicy}: ${blocked}. This pass does not fill it.`);
      await shutdown(1);
    }
  }

  const candidates = scoped.filter((row) => classifyBookFillPolicy(row, filter).exclude == null);
  const fills = await latestFills(candidates.map((row) => row.id));
  const eligible: Array<PolicyRow & { family: string; documentId: string; filename: string; note: string }> = [];
  const excluded: Array<PolicyRow & { family: string; note: string }> = [];

  for (const row of scoped.sort((a, b) => a.policyNumber.localeCompare(b.policyNumber))) {
    const classified = classifyBookFillPolicy(row, filter);
    if (classified.exclude) {
      excluded.push({ ...row, family: classified.family ?? "", note: classified.exclude });
      continue;
    }
    const dec = await loadFillDecDocument({ policyId: row.id, preferCurrent: true });
    const decision = decideBookFill({
      policy: row,
      filter,
      dec: dec.ok ? { ok: true } : { ok: false, error: dec.error },
    });
    if (!dec.ok || decision.decision === "exclude") {
      excluded.push({ ...row, family: decision.family, note: decision.note });
      continue;
    }
    const prior = fills.get(row.id);
    const note = prior
      ? `overwrite; last fill ${formatFillServerTime(new Date(prior.at))} by ${prior.agent}`
      : "no prior fill; overwrite allowed";
    eligible.push({
      ...row,
      family: classified.family ?? "",
      documentId: dec.doc.id,
      filename: dec.doc.filename ?? "",
      note,
    });
  }

  console.log(apply ? "Book Fill-from-DEC APPLY" : "Book Fill-from-DEC dry-run");
  console.log(`Family: ${filter}`);
  console.log(`Policies: ${scoped.length}`);
  console.log(`Fill: ${eligible.length}`);
  console.log(`Excluded: ${excluded.length}`);
  console.log("Already filled is not a skip. Apply overwrites.");
  console.log("");
  console.log(line(["decision", "policyNumber", "insured", "carrier", "family", "policyId", "dec", "note"]));

  for (const row of eligible) {
    console.log(
      line(["fill", row.policyNumber, row.insured, row.carrierName ?? "—", row.family, row.id, row.filename, row.note]),
    );
  }
  for (const row of excluded.sort(
    (a, b) => a.note.localeCompare(b.note) || a.policyNumber.localeCompare(b.policyNumber),
  )) {
    console.log(
      line(["exclude", row.policyNumber, row.insured, row.carrierName ?? "—", row.family, row.id, "", row.note]),
    );
  }

  if (!apply) {
    console.log("");
    console.log("Dry-run only. Re-run with --apply to fill the DEC rows above.");
    await shutdown(0);
  }

  const acting = await actor();
  if (!acting) {
    console.error(`Refusing apply: no active user named ${BOOK_FILL_ACTOR}.`);
    await shutdown(1);
  }

  process.env.FF_OPS_FILL = "1";
  const { fillPolicyFromDec } = await import("@/app/actions/policy-fill-from-dec");
  const reason = filter === "ho3" ? HO3_BOOK_FILL_REASON : BOOK_FILL_REASON;
  let succeeded = 0;
  let failed = 0;
  for (const row of eligible) {
    const result = await fillPolicyFromDec({
      policyId: row.id,
      documentId: row.documentId,
      reason,
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
          row.family,
          row.id,
          row.filename,
          `filled ${result.filled.length}; overwritten ${result.overwritten.length}; unchanged ${result.skipped.length}; audit ${result.auditId}`,
        ]),
      );
    } else {
      failed += 1;
      console.log(
        line(["fail", row.policyNumber, row.insured, row.carrierName ?? "—", row.family, row.id, row.filename, result.error]),
      );
    }
  }

  console.log("");
  console.log(`attempted ${eligible.length}`);
  console.log(`succeeded ${succeeded}`);
  console.log(`failed ${failed}`);
  console.log(`excluded ${excluded.length}`);
  await shutdown(failed > 0 ? 1 : 0);
}

export function run(): void {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    void shutdown(1);
  });
}

function runningAsBookScript(): boolean {
  const entry = process.argv[1]?.replace(/\\/g, "/") ?? "";
  return entry.endsWith("ff-fill-book-from-dec.ts") || entry.endsWith("ff-fill-book-from-dec.js");
}

if (runningAsBookScript()) run();
