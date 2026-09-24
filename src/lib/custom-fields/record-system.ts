import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, carriers, contacts, deals, leads, policies, reviewTasks } from "@/lib/db/schema";
import type { FieldLayoutModule } from "./modules";
import type { CustomFieldDef } from "./types";
import { replaceEin, replaceLicense } from "@/lib/pii/write";
import { formatPhoneStandard } from "@/lib/phone/format";
import { normalizeTags } from "@/lib/tags/module-tags";

function str(values: Record<string, string>, ...keys: Array<string | null | undefined>) {
  for (const key of keys) {
    if (!key) continue;
    const fromKey = (values[key] ?? "").trim();
    if (fromKey) return fromKey;
  }
  return "";
}

function keep<T>(next: string, existing: T): T | string {
  return next || existing;
}

function keepInt(next: string, existing: number | null): number | null {
  if (!next) return existing;
  const n = Number(next.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : existing;
}

function keepMoney(next: string, existing: string | null): string | null {
  if (!next) return existing;
  const cleaned = next.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? cleaned : existing;
}

function asDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function fieldMap(fields: readonly CustomFieldDef[]) {
  return Object.fromEntries(fields.map((field) => [field.systemKey || field.key, field]));
}

export async function applyModuleSystemValues(
  module: FieldLayoutModule,
  recordId: string,
  values: Record<string, string>,
  fields: readonly CustomFieldDef[],
) {
  const bySystem = fieldMap(fields);
  void bySystem;
  if (module === "leads") {
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, recordId)));
    if (!existing) return;
    await db
      .update(leads)
      .set({
        firstName: keep(str(values, "first_name", "firstName"), existing.firstName) as string,
        lastName: keep(str(values, "last_name", "lastName"), existing.lastName) as string,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        phone: keep(formatPhoneStandard(str(values, "phone")) || str(values, "phone") || null, existing.phone) as typeof existing.phone,
        source: keep(str(values, "source"), existing.source) as typeof existing.source,
        notes: keep(str(values, "notes"), existing.notes) as typeof existing.notes,
        middleName: keep(str(values, "middle_name", "middleName"), existing.middleName) as typeof existing.middleName,
        dateOfBirth: keep(str(values, "date_of_birth", "dateOfBirth"), existing.dateOfBirth) as typeof existing.dateOfBirth,
        mailingAddress: keep(
          str(values, "mailing_address", "mailingAddress"),
          existing.mailingAddress,
        ) as typeof existing.mailingAddress,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        zip: keep(str(values, "zip"), existing.zip) as typeof existing.zip,
        preferredLanguage: keep(
          str(values, "preferred_language", "preferredLanguage"),
          existing.preferredLanguage,
        ) as typeof existing.preferredLanguage,
        insuranceTypeDesired: keep(
          str(values, "insurance_type_desired", "insuranceTypeDesired"),
          existing.insuranceTypeDesired,
        ) as typeof existing.insuranceTypeDesired,
        status: keep(str(values, "status"), existing.status) as typeof existing.status,
        temperature: keep(str(values, "temperature"), existing.temperature) as typeof existing.temperature,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, recordId));
    return;
  }
  if (module === "contacts") {
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, recordId)));
    if (!existing) return;
    await db
      .update(contacts)
      .set({
        firstName: keep(str(values, "first_name", "firstName"), existing.firstName) as string,
        lastName: keep(str(values, "last_name", "lastName"), existing.lastName) as string,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        phone: keep(formatPhoneStandard(str(values, "phone")) || str(values, "phone") || null, existing.phone) as typeof existing.phone,
        mailingAddress: keep(
          str(values, "mailing_address", "mailingAddress"),
          existing.mailingAddress,
        ) as typeof existing.mailingAddress,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        zip: keep(str(values, "zip"), existing.zip) as typeof existing.zip,
        dateOfBirth: keep(
          str(values, "date_of_birth", "dateOfBirth"),
          existing.dateOfBirth,
        ) as typeof existing.dateOfBirth,
        maritalStatus: keep(
          str(values, "marital_status", "maritalStatus"),
          existing.maritalStatus,
        ) as typeof existing.maritalStatus,
        preferredLanguage: keep(
          str(values, "preferred_language", "preferredLanguage"),
          existing.preferredLanguage,
        ) as typeof existing.preferredLanguage,
        nickname: keep(str(values, "nickname"), existing.nickname) as typeof existing.nickname,
        secondaryPhone: keep(
          formatPhoneStandard(str(values, "secondary_phone", "secondaryPhone")) ||
            str(values, "secondary_phone", "secondaryPhone") ||
            null,
          existing.secondaryPhone,
        ) as typeof existing.secondaryPhone,
        gender: keep(str(values, "gender"), existing.gender) as typeof existing.gender,
        spouseName: keep(str(values, "spouse_name", "spouseName"), existing.spouseName) as typeof existing.spouseName,
        spouseDob: keep(str(values, "spouse_dob", "spouseDob"), existing.spouseDob) as typeof existing.spouseDob,
        dlState: keep(str(values, "dl_state", "dlState"), existing.dlState) as typeof existing.dlState,
        licenseExpiration: keep(
          str(values, "dl_expiration", "licenseExpiration"),
          existing.licenseExpiration,
        ) as typeof existing.licenseExpiration,
        dependents: (() => {
          const raw = str(values, "dependents");
          if (!raw) return existing.dependents;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : existing.dependents;
          } catch {
            return existing.dependents;
          }
        })(),
        ...(() => {
          const incoming = str(values, "drivers_license_number");
          const next = replaceLicense(incoming, {
            licenseNumber: null,
            licenseNumberEnc: existing.licenseNumberEnc,
            licenseNumberIv: existing.licenseNumberIv,
            licenseNumberLast4: existing.licenseNumberLast4,
          });
          return {
            licenseNumberEnc: next.licenseNumberEnc,
            licenseNumberIv: next.licenseNumberIv,
            licenseNumberLast4: next.licenseNumberLast4,
          };
        })(),
        notes: keep(str(values, "notes"), existing.notes) as typeof existing.notes,
        lifeNotes: keep(str(values, "life_notes", "lifeNotes"), existing.lifeNotes) as typeof existing.lifeNotes,
        healthNotes: keep(
          str(values, "health_notes", "healthNotes"),
          existing.healthNotes,
        ) as typeof existing.healthNotes,
        source: keep(str(values, "source"), existing.source) as typeof existing.source,
        clientStatus: keep(
          str(values, "client_status", "clientStatus"),
          existing.clientStatus,
        ) as typeof existing.clientStatus,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, recordId));
    return;
  }
  if (module === "businesses") {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, DEFAULT_TENANT_ID), eq(accounts.id, recordId)));
    if (!existing) return;
    await db
      .update(accounts)
      .set({
        name: keep(str(values, "business_name", "name"), existing.name) as string,
        dba: keep(str(values, "dba"), existing.dba) as typeof existing.dba,
        legalName: keep(str(values, "legal_name", "legalName"), existing.legalName) as typeof existing.legalName,
        phone: keep(formatPhoneStandard(str(values, "phone")) || str(values, "phone") || null, existing.phone) as typeof existing.phone,
        email: keep(str(values, "email"), existing.email) as typeof existing.email,
        mailingAddress: keep(
          str(values, "mailing_address", "mailingAddress"),
          existing.mailingAddress,
        ) as typeof existing.mailingAddress,
        city: keep(str(values, "city"), existing.city) as typeof existing.city,
        state: keep(str(values, "state"), existing.state) as typeof existing.state,
        zip: keep(str(values, "zip"), existing.zip) as typeof existing.zip,
        ...replaceEin(str(values, "ein"), {
          ein: null,
          einEnc: existing.einEnc,
          einIv: existing.einIv,
          einLast4: existing.einLast4,
          einLookup: existing.einLookup,
        }),
        entityType: keep(str(values, "entity_type", "entityType"), existing.entityType) as typeof existing.entityType,
        employeeCount: keepInt(str(values, "employee_count", "employeeCount"), existing.employeeCount),
        annualSales: keepMoney(str(values, "annual_sales", "annualSales"), existing.annualSales),
        payrollW2: keepMoney(str(values, "payroll_w2", "payrollW2"), existing.payrollW2),
        payroll1099: keepMoney(str(values, "payroll_1099", "payroll1099"), existing.payroll1099),
        yearsInBusiness: keepInt(
          str(values, "years_in_business", "yearsInBusiness"),
          existing.yearsInBusiness,
        ),
        naics: keep(str(values, "naics"), existing.naics) as typeof existing.naics,
        industry: keep(str(values, "industry"), existing.industry) as typeof existing.industry,
        website: keep(str(values, "website"), existing.website) as typeof existing.website,
        source: keep(str(values, "source"), existing.source) as typeof existing.source,
        referral: keep(str(values, "referral"), existing.referral) as typeof existing.referral,
        operationsDescription: keep(
          str(values, "operations", "operationsDescription"),
          existing.operationsDescription,
        ) as typeof existing.operationsDescription,
        lifeNotes: keep(str(values, "life_notes", "lifeNotes"), existing.lifeNotes) as typeof existing.lifeNotes,
        healthNotes: keep(
          str(values, "health_notes", "healthNotes"),
          existing.healthNotes,
        ) as typeof existing.healthNotes,
        pcNotes: keep(str(values, "pc_notes", "pcNotes"), existing.pcNotes) as typeof existing.pcNotes,
        notes: keep(str(values, "notes"), existing.notes) as typeof existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, recordId));
    return;
  }
  if (module === "policies") {
    const [existing] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, recordId)));
    if (!existing) return;
    const effective = asDate(str(values, "effective_date", "effectiveDate"));
    const expiration = asDate(str(values, "expiration_date", "expirationDate"));
    await db
      .update(policies)
      .set({
        policyNumber: keep(str(values, "policy_number", "policyNumber"), existing.policyNumber) as string,
        status: keep(str(values, "status"), existing.status) as string,
        premium: keep(str(values, "premium"), existing.premium) as typeof existing.premium,
        effectiveDate: effective ?? existing.effectiveDate,
        expirationDate: expiration ?? existing.expirationDate,
        updatedAt: new Date(),
      })
      .where(eq(policies.id, recordId));
    return;
  }
  if (module === "carriers") {
    const [existing] = await db
      .select()
      .from(carriers)
      .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, recordId)));
    if (!existing) return;
    const writtenRaw = str(values, "written_lines", "writtenLines");
    const writtenLines =
      writtenRaw === ""
        ? existing.writtenLines
        : writtenRaw.split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
    await db
      .update(carriers)
      .set({
        name: keep(str(values, "name"), existing.name) as string,
        naic: keep(str(values, "naic"), existing.naic) as typeof existing.naic,
        territory: keep(str(values, "territory"), existing.territory) as typeof existing.territory,
        amBestRating: keep(str(values, "am_best_rating", "amBestRating"), existing.amBestRating) as typeof existing.amBestRating,
        writtenLines,
        preferredSubmission: keep(str(values, "preferred_submission", "preferredSubmission"), existing.preferredSubmission) as typeof existing.preferredSubmission,
        bindingAuthority: keep(str(values, "binding_authority", "bindingAuthority"), existing.bindingAuthority) as typeof existing.bindingAuthority,
        appetiteNotes: keep(str(values, "appetite_notes", "appetiteNotes"), existing.appetiteNotes) as typeof existing.appetiteNotes,
        dontWriteNotes: keep(str(values, "dont_write_notes", "dontWriteNotes"), existing.dontWriteNotes) as typeof existing.dontWriteNotes,
        newBusinessCommPct: keep(str(values, "new_business_comm_pct", "newBusinessCommPct"), existing.newBusinessCommPct) as typeof existing.newBusinessCommPct,
        renewalCommPct: keep(str(values, "renewal_comm_pct", "renewalCommPct"), existing.renewalCommPct) as typeof existing.renewalCommPct,
        underwriterName: keep(str(values, "underwriter_name", "underwriterName"), existing.underwriterName) as typeof existing.underwriterName,
        underwriterEmail: keep(
          str(values, "underwriter_email", "underwriterEmail", "email"),
          existing.underwriterEmail,
        ) as typeof existing.underwriterEmail,
        underwriterPhone: keep(str(values, "underwriter_phone", "underwriterPhone"), existing.underwriterPhone) as typeof existing.underwriterPhone,
        accountManagerName: keep(str(values, "account_manager_name", "accountManagerName"), existing.accountManagerName) as typeof existing.accountManagerName,
        accountManagerEmail: keep(str(values, "account_manager_email", "accountManagerEmail"), existing.accountManagerEmail) as typeof existing.accountManagerEmail,
        accountManagerPhone: keep(str(values, "account_manager_phone", "accountManagerPhone"), existing.accountManagerPhone) as typeof existing.accountManagerPhone,
        customerServicePhone: keep(
          str(values, "customer_service_phone", "customerServicePhone", "phone"),
          existing.customerServicePhone,
        ) as typeof existing.customerServicePhone,
        agentPhone: keep(str(values, "agent_phone", "agentPhone"), existing.agentPhone) as typeof existing.agentPhone,
        claimsPhone: keep(str(values, "claims_phone", "claimsPhone"), existing.claimsPhone) as typeof existing.claimsPhone,
        billingPhone: keep(str(values, "billing_phone", "billingPhone"), existing.billingPhone) as typeof existing.billingPhone,
        portalUrl: keep(str(values, "portal_url", "portalUrl"), existing.portalUrl) as typeof existing.portalUrl,
        agencyCode: keep(str(values, "agency_code", "agencyCode"), existing.agencyCode) as typeof existing.agencyCode,
        portalLogin: keep(str(values, "portal_login", "portalLogin"), existing.portalLogin) as typeof existing.portalLogin,
        website: keep(str(values, "website"), existing.website) as typeof existing.website,
        agentPortalUrl: keep(str(values, "agent_portal_url", "agentPortalUrl"), existing.agentPortalUrl) as typeof existing.agentPortalUrl,
        carrierInfo: keep(str(values, "carrier_info", "carrierInfo"), existing.carrierInfo) as typeof existing.carrierInfo,
        portalStatus: keep(str(values, "portal_status", "portalStatus"), existing.portalStatus) as typeof existing.portalStatus,
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, recordId));
    return;
  }
  if (module === "deals") {
    const [existing] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, recordId)));
    if (!existing) return;
    const named = str(values, "named_insured", "primaryNamedInsured");
    const notes = values.notes;
    const state = str(values, "state");
    await db
      .update(deals)
      .set({
        primaryNamedInsured: named || existing.primaryNamedInsured,
        notes: notes ?? existing.notes,
        state: state || existing.state,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, recordId));
    return;
  }
  if (module === "tasks") {
    const [existing] = await db
      .select()
      .from(reviewTasks)
      .where(and(eq(reviewTasks.tenantId, DEFAULT_TENANT_ID), eq(reviewTasks.id, recordId)));
    if (!existing) return;
    const nextTitle = str(values, "title");
    const nextKind = str(values, "kind", "task_type");
    const nextStatus = str(values, "status");
    const nextAssignee = str(values, "assigneeId", "assignee");
    const dueRaw = str(values, "dueDate", "due_date");
    const nextDue = asDate(dueRaw);
    const patch: {
      title?: string;
      kind?: string;
      status?: string;
      assigneeId?: string | null;
      dueDate?: Date;
      completedAt?: Date | null;
      tags?: string[];
    } = {};
    if (nextTitle) patch.title = nextTitle;
    if (nextKind) patch.kind = nextKind;
    if (nextStatus) {
      patch.status = nextStatus;
      if (nextStatus === "done" && !existing.completedAt) patch.completedAt = new Date();
      if (nextStatus !== "done") patch.completedAt = null;
    }
    if (nextAssignee) patch.assigneeId = nextAssignee;
    if (nextDue) patch.dueDate = nextDue;
    if (values.tags != null) patch.tags = normalizeTags(values.tags);
    if (Object.keys(patch).length === 0) return;
    await db.update(reviewTasks).set(patch).where(eq(reviewTasks.id, recordId));
  }
}
