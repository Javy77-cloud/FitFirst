import {
  isSameLead,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  type LeadIdentity,
} from "@/lib/lifecycle/lead-match";

export type ContactIdentity = LeadIdentity;

export type AccountIdentity = {
  name: string;
  ein?: string | null;
};

export function normalizeEin(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || null;
}

export function isSameContact(existing: ContactIdentity, incoming: ContactIdentity): boolean {
  return isSameLead(existing, incoming);
}

/**
 * Match a Business by EIN/FEIN first, then by exact legal name.
 * Name-only fuzzy match is never enough — that would duplicate shops.
 */
export function isSameAccount(existing: AccountIdentity, incoming: AccountIdentity): boolean {
  const incomingEin = normalizeEin(incoming.ein);
  const existingEin = normalizeEin(existing.ein);
  if (incomingEin && existingEin && incomingEin === existingEin) return true;
  if (incomingEin || existingEin) return false;
  return normalizeName(existing.name) === normalizeName(incoming.name);
}

export function sheetValue(
  values: Record<string, { value?: string } | undefined>,
  key: string,
): string | null {
  const raw = values[key]?.value?.trim();
  return raw || null;
}

/** Copy matching Quote Sheet cells onto a personal Contact so bind does not retype. */
export function contactFieldsFromSheet(
  values: Record<string, { value?: string } | undefined>,
  fallback: ContactIdentity & {
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfBirth?: string | null;
  },
) {
  return {
    firstName: fallback.firstName,
    lastName: fallback.lastName,
    email: fallback.email ?? null,
    phone: fallback.phone ?? null,
    mailingAddress: sheetValue(values, "address1") ?? fallback.mailingAddress ?? null,
    city: sheetValue(values, "city") ?? fallback.city ?? null,
    state: sheetValue(values, "state") ?? fallback.state ?? "FL",
    zip: sheetValue(values, "zip") ?? fallback.zip ?? null,
    dateOfBirth: fallback.dateOfBirth ?? null,
  };
}

/** Copy matching Quote Sheet + commercial cells onto a Business. */
export function accountFieldsFromSheet(
  values: Record<string, { value?: string } | undefined>,
  fallback: AccountIdentity & {
    email?: string | null;
    phone?: string | null;
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    employeeCount?: number | null;
    annualSales?: string | null;
    payrollW2?: string | null;
    payroll1099?: string | null;
    payrollTotal?: string | null;
  },
) {
  const employees =
    sheetValue(values, "employee_count") ??
    sheetValue(values, "employees") ??
    (fallback.employeeCount != null ? String(fallback.employeeCount) : null);
  return {
    name: fallback.name,
    ein: fallback.ein ?? sheetValue(values, "ein") ?? sheetValue(values, "fein"),
    email: fallback.email ?? null,
    phone: fallback.phone ?? null,
    mailingAddress: sheetValue(values, "address1") ?? fallback.mailingAddress ?? null,
    city: sheetValue(values, "city") ?? fallback.city ?? null,
    state: sheetValue(values, "state") ?? fallback.state ?? "FL",
    zip: sheetValue(values, "zip") ?? fallback.zip ?? null,
    employeeCount: employees ? Number(employees) : fallback.employeeCount ?? null,
    annualSales: sheetValue(values, "annual_sales") ?? fallback.annualSales ?? null,
    payrollW2: sheetValue(values, "payroll_w2") ?? fallback.payrollW2 ?? null,
    payroll1099: sheetValue(values, "payroll_1099") ?? fallback.payroll1099 ?? null,
    payrollTotal: sheetValue(values, "payroll_total") ?? fallback.payrollTotal ?? null,
  };
}
