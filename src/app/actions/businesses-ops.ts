"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { replaceEin } from "@/lib/pii/write";

function keepInt(next: string, existing: number | null): number | null {
  if (!next.trim()) return null;
  const n = Number(next.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : existing;
}

function keepMoney(next: string, existing: string | null): string | null {
  if (!next.trim()) return null;
  const cleaned = next.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? cleaned : existing;
}

const FIELD_MAP = {
  ein: "ein",
  entity_type: "entityType",
  industry: "naics",
  naics: "naics",
  annual_sales: "annualSales",
  employee_count: "employeeCount",
  payroll: "payrollW2",
  payroll_w2: "payrollW2",
  years_in_business: "yearsInBusiness",
  phone: "phone",
  email: "email",
  name: "name",
  dba: "dba",
} as const;

type FieldKey = keyof typeof FIELD_MAP;

export async function updateAccountField(input: {
  accountId: string;
  fieldKey: string;
  value: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const accountId = (input.accountId ?? "").trim();
  const fieldKey = (input.fieldKey ?? "").trim() as FieldKey;
  if (!accountId || !(fieldKey in FIELD_MAP)) {
    return { ok: false, error: "Unknown Field." };
  }
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, accountId)));
  if (!existing) return { ok: false, error: "Business Not Found." };

  const raw = input.value ?? "";
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (fieldKey === "ein") {
    Object.assign(
      patch,
      replaceEin(raw, {
        ein: null,
        einEnc: existing.einEnc,
        einIv: existing.einIv,
        einLast4: existing.einLast4,
        einLookup: existing.einLookup,
      }),
    );
  } else if (fieldKey === "annual_sales" || fieldKey === "payroll" || fieldKey === "payroll_w2") {
    patch[FIELD_MAP[fieldKey]] = keepMoney(raw, existing[FIELD_MAP[fieldKey] as "annualSales"]);
  } else if (fieldKey === "employee_count" || fieldKey === "years_in_business") {
    patch[FIELD_MAP[fieldKey]] = keepInt(raw, existing[FIELD_MAP[fieldKey] as "employeeCount"]);
  } else if (fieldKey === "name") {
    const next = raw.trim();
    if (!next) return { ok: false, error: "Name Is Required." };
    patch.name = next;
  } else {
    patch[FIELD_MAP[fieldKey]] = raw.trim() || null;
  }

  await db.update(accounts).set(patch).where(eq(accounts.id, accountId));
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/businesses/${accountId}`);
  return { ok: true };
}
