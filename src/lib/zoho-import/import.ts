import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  activities,
  carrierAppointments,
  carriers,
  contacts,
  deals,
  leads,
  policies,
} from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { writeEin } from "@/lib/pii/write";
import { defaultImportDir, readModuleRecords, scanImportFolder } from "./jsonl";
import { mapAccount, mapContact, mapDeal, mapLead, mapPolicy, mapTask, mapVendor } from "./maps";
import type {
  ImportError,
  ImportReport,
  ModuleImportCounts,
  UnmatchedField,
  ZohoModule,
} from "./types";
import { normalizeCarrierName, zohoIdOf } from "./values";

function uuidFromZoho(kind: string, key: string): string {
  const hex = createHash("sha256").update(`fitfirst:zoho-import:${kind}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function bumpUnmatched(bag: Map<string, number>, module: ZohoModule, fields: string[]) {
  for (const field of fields) {
    const key = `${module}\t${field}`;
    bag.set(key, (bag.get(key) ?? 0) + 1);
  }
}

function emptyCounts(module: ZohoModule, fitfirst: string): ModuleImportCounts {
  return { module, fitfirst, read: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
}

function lineToken(value: string): string {
  const text = value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  if (/\bAUTO\b/.test(text)) return "AUTO";
  if (/\bFLOOD\b/.test(text)) return "FLOOD";
  if (/\bUMBRELLA\b/.test(text)) return "UMBRELLA";
  if (/\bHO\b|HOME/.test(text)) return "HO";
  return text.slice(0, 16) || "HO";
}

export async function importZohoFolder(dir = defaultImportDir(), tenantId = DEFAULT_TENANT_ID): Promise<ImportReport> {
  const scan = await scanImportFolder(dir);
  if (scan.files.length === 0) {
    throw new Error(`No Zoho JSONL files found in ${dir}. Copy Contacts.jsonl, Accounts.jsonl, Leads.jsonl, Deals.jsonl, Vendors.jsonl, Policies.jsonl, Tasks.jsonl.`);
  }

  const unmatchedBag = new Map<string, number>();
  const errors: ImportError[] = [];
  const counts: ModuleImportCounts[] = [];
  const fileFor = (module: ZohoModule) => scan.files.find((file) => file.module === module);

  const existingCarriers = await db.select().from(carriers).where(eq(carriers.tenantId, tenantId));
  const carrierByNorm = new Map(existingCarriers.map((row) => [normalizeCarrierName(row.name), row]));
  const carrierByZoho = new Map(existingCarriers.filter((row) => row.zohoId).map((row) => [row.zohoId!, row]));
  const carriersKept = existingCarriers.length;
  let carriersAdded = 0;
  let carriersMergedLines = 0;

  const vendorsFile = fileFor("Vendors");
  const vendorCounts = emptyCounts("Vendors", "carriers");
  if (vendorsFile) {
    const rows = await readModuleRecords(vendorsFile.path);
    vendorCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        vendorCounts.skipped += 1;
        errors.push({ module: "Vendors", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapVendor(record, zohoId);
      bumpUnmatched(unmatchedBag, "Vendors", mapped.unmatched);
      const norm = normalizeCarrierName(mapped.name);
      const existing = carrierByZoho.get(zohoId) ?? (norm ? carrierByNorm.get(norm) : undefined);
      if (existing) {
        const written = new Set(existing.writtenLines ?? []);
        let changed = false;
        for (const line of mapped.writtenLines) {
          const token = lineToken(line);
          if (!written.has(token)) {
            written.add(token);
            changed = true;
          }
        }
        if (changed || !existing.zohoId) {
          await db
            .update(carriers)
            .set({
              zohoId: existing.zohoId ?? zohoId,
              sourceId: existing.sourceId ?? zohoId,
              writtenLines: [...written],
              agencyCode: existing.agencyCode ?? mapped.agencyCode,
              portalUrl: existing.portalUrl ?? mapped.portalUrl,
              website: existing.website ?? mapped.website,
              appetiteNotes: existing.appetiteNotes ?? mapped.appetiteNotes,
              dontWriteNotes: existing.dontWriteNotes ?? mapped.dontWriteNotes,
              updatedAt: new Date(),
            })
            .where(eq(carriers.id, existing.id));
          existing.writtenLines = [...written];
          existing.zohoId = existing.zohoId ?? zohoId;
          if (changed) carriersMergedLines += 1;
        }
        carrierByZoho.set(zohoId, existing);
        vendorCounts.skipped += 1;
        continue;
      }
      const id = uuidFromZoho("carrier", zohoId);
      const written = mapped.writtenLines.map(lineToken);
      const [created] = await db
        .insert(carriers)
        .values({
          id,
          tenantId,
          name: mapped.name,
          customerServicePhone: mapped.phone,
          website: mapped.website,
          portalUrl: mapped.portalUrl,
          agentPortalUrl: mapped.portalUrl,
          agencyCode: mapped.agencyCode,
          appetiteNotes: mapped.appetiteNotes,
          dontWriteNotes: mapped.dontWriteNotes,
          carrierInfo: mapped.carrierInfo,
          writtenLines: written,
          active: mapped.appointmentStatus ? !/not.?appointed|inactive/i.test(mapped.appointmentStatus) : true,
          zohoId,
          sourceId: zohoId,
        })
        .returning();
      if (created) {
        carrierByNorm.set(norm, created);
        carrierByZoho.set(zohoId, created);
        for (const line of written) {
          await db
            .insert(carrierAppointments)
            .values({
              tenantId,
              carrierId: created.id,
              writtenLine: line,
              appointed: true,
              sellingAgency: mapped.sellingAgency || "Imported",
              notes: mapped.appointmentStatus,
            })
            .onConflictDoNothing({
              target: [
                carrierAppointments.tenantId,
                carrierAppointments.carrierId,
                carrierAppointments.writtenLine,
              ],
            });
        }
        carriersAdded += 1;
        vendorCounts.created += 1;
      }
    }
  }
  counts.push(vendorCounts);

  const contactByZoho = new Map<string, string>();
  const contactsFile = fileFor("Contacts");
  const contactCounts = emptyCounts("Contacts", "contacts");
  if (contactsFile) {
    const rows = await readModuleRecords(contactsFile.path);
    contactCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        contactCounts.skipped += 1;
        errors.push({ module: "Contacts", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapContact(record, zohoId);
      bumpUnmatched(unmatchedBag, "Contacts", mapped.unmatched);
      const [existing] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tenantId), eq(contacts.zohoId, zohoId)));
      const values = {
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        mailingAddress: mapped.mailingAddress,
        city: mapped.city,
        state: mapped.state,
        zip: mapped.zip,
        dateOfBirth: mapped.dateOfBirth,
        preferredLanguage: mapped.preferredLanguage,
        language: mapped.preferredLanguage,
        maritalStatus: mapped.maritalStatus,
        notes: mapped.notes,
        clientStatus: mapped.clientStatus,
        emailOptOut: mapped.emailOptOut,
        smsOptOut: mapped.smsOptOut,
        tenureStart: mapped.tenureStart,
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(contacts).set(values).where(eq(contacts.id, existing.id));
        contactByZoho.set(zohoId, existing.id);
        contactCounts.updated += 1;
      } else {
        const id = uuidFromZoho("contact", zohoId);
        await db.insert(contacts).values({ id, tenantId, ...values });
        contactByZoho.set(zohoId, id);
        contactCounts.created += 1;
      }
    }
  }
  counts.push(contactCounts);

  const accountByZoho = new Map<string, string>();
  const accountsFile = fileFor("Accounts");
  const accountCounts = emptyCounts("Accounts", "businesses");
  if (accountsFile) {
    const rows = await readModuleRecords(accountsFile.path);
    accountCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        accountCounts.skipped += 1;
        errors.push({ module: "Accounts", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapAccount(record, zohoId);
      bumpUnmatched(unmatchedBag, "Accounts", mapped.unmatched);
      const officerId = mapped.officerZohoId ? (contactByZoho.get(mapped.officerZohoId) ?? null) : null;
      const [existing] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.zohoId, zohoId)));
      const values = {
        name: mapped.name,
        legalName: mapped.legalName,
        dba: mapped.dba,
        email: mapped.email,
        phone: mapped.phone,
        website: mapped.website,
        mailingAddress: mapped.mailingAddress,
        city: mapped.city,
        state: mapped.state,
        zip: mapped.zip,
        primaryAddress1: mapped.primaryAddress1,
        primaryCity: mapped.primaryCity,
        primaryState: mapped.primaryState,
        primaryZip: mapped.primaryZip,
        mailingSameAsPrimary: !mapped.mailingAddress,
        notes: mapped.notes,
        employeeCount: mapped.employeeCount,
        annualSales: mapped.annualSales,
        payrollTotal: mapped.payrollTotal,
        yearsInBusiness: mapped.yearsInBusiness,
        wcClassCode: mapped.wcClassCode,
        operations: mapped.operations,
        operationsDescription: mapped.operations,
        officerContactId: officerId,
        clientSince: mapped.clientSince,
        ...writeEin(mapped.fein),
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      const id = existing?.id ?? uuidFromZoho("account", zohoId);
      if (existing) {
        await db.update(accounts).set(values).where(eq(accounts.id, existing.id));
        accountCounts.updated += 1;
      } else {
        await db.insert(accounts).values({ id, tenantId, ...values });
        accountCounts.created += 1;
      }
      accountByZoho.set(zohoId, id);
      if (officerId) {
        await db.update(contacts).set({ accountId: id, updatedAt: new Date() }).where(eq(contacts.id, officerId));
      }
    }
  }
  counts.push(accountCounts);

  const existingContacts = await db
    .select({ id: contacts.id, zohoId: contacts.zohoId, accountId: contacts.accountId })
    .from(contacts)
    .where(eq(contacts.tenantId, tenantId));
  for (const row of existingContacts) {
    if (row.zohoId) contactByZoho.set(row.zohoId, row.id);
  }

  const leadByZoho = new Map<string, string>();
  const leadsFile = fileFor("Leads");
  const leadCounts = emptyCounts("Leads", "leads");
  if (leadsFile) {
    const rows = await readModuleRecords(leadsFile.path);
    leadCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        leadCounts.skipped += 1;
        errors.push({ module: "Leads", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapLead(record, zohoId);
      bumpUnmatched(unmatchedBag, "Leads", mapped.unmatched);
      const [existing] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.tenantId, tenantId), eq(leads.zohoId, zohoId)));
      const values = {
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        middleName: mapped.middleName,
        email: mapped.email,
        phone: mapped.phone,
        source: mapped.source,
        status: mapped.status,
        notes: mapped.notes,
        mailingAddress: mapped.mailingAddress,
        city: mapped.city,
        state: mapped.state,
        zip: mapped.zip,
        dateOfBirth: mapped.dateOfBirth,
        insuranceTypeDesired: mapped.insuranceTypeDesired,
        preferredLanguage: mapped.preferredLanguage,
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      const id = existing?.id ?? uuidFromZoho("lead", zohoId);
      if (existing) {
        await db.update(leads).set(values).where(eq(leads.id, existing.id));
        leadCounts.updated += 1;
      } else {
        await db.insert(leads).values({ id, tenantId, ...values });
        leadCounts.created += 1;
      }
      leadByZoho.set(zohoId, id);
    }
  }
  counts.push(leadCounts);

  const dealByZoho = new Map<string, string>();
  const dealsFile = fileFor("Deals");
  const dealCounts = emptyCounts("Deals", "deals");
  if (dealsFile) {
    const rows = await readModuleRecords(dealsFile.path);
    dealCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        dealCounts.skipped += 1;
        errors.push({ module: "Deals", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapDeal(record, zohoId);
      bumpUnmatched(unmatchedBag, "Deals", mapped.unmatched);
      const [existing] = await db
        .select({ id: deals.id })
        .from(deals)
        .where(and(eq(deals.tenantId, tenantId), eq(deals.zohoId, zohoId)));
      const values = {
        title: mapped.title,
        pipelineStage: mapped.pipelineStage,
        lineOfBusiness: mapped.lineOfBusiness,
        accountKind: mapped.accountKind,
        bindTarget: mapped.bindTarget,
        state: mapped.state,
        notes: mapped.notes,
        quoteResultsNote: mapped.quoteResultsNote,
        coverageAmount: mapped.coverageAmount != null ? Math.round(mapped.coverageAmount) : null,
        currentCarrier: mapped.currentCarrier,
        contactId: mapped.contactZohoId ? (contactByZoho.get(mapped.contactZohoId) ?? null) : null,
        accountId: mapped.accountZohoId ? (accountByZoho.get(mapped.accountZohoId) ?? null) : null,
        wonAt: mapped.wonAt,
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      const id = existing?.id ?? uuidFromZoho("deal", zohoId);
      if (existing) {
        await db.update(deals).set(values).where(eq(deals.id, existing.id));
        dealCounts.updated += 1;
      } else {
        await db.insert(deals).values({ id, tenantId, ...values });
        dealCounts.created += 1;
      }
      dealByZoho.set(zohoId, id);
    }
  }
  counts.push(dealCounts);

  if (leadsFile) {
    const rows = await readModuleRecords(leadsFile.path);
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) continue;
      const mapped = mapLead(record, zohoId);
      const leadId = leadByZoho.get(zohoId);
      const dealId = mapped.convertedDealZohoId ? dealByZoho.get(mapped.convertedDealZohoId) : undefined;
      if (leadId && dealId) {
        await db
          .update(leads)
          .set({ convertedDealId: dealId, status: "converted", updatedAt: new Date() })
          .where(eq(leads.id, leadId));
        await db.update(deals).set({ leadId, updatedAt: new Date() }).where(eq(deals.id, dealId));
      }
    }
  }

  const policyByZoho = new Map<string, string>();
  const policiesFile = fileFor("Policies");
  const policyCounts = emptyCounts("Policies", "policies");
  if (policiesFile) {
    const rows = await readModuleRecords(policiesFile.path);
    policyCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        policyCounts.skipped += 1;
        errors.push({ module: "Policies", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapPolicy(record, zohoId);
      if ("skip" in mapped) {
        bumpUnmatched(unmatchedBag, "Policies", mapped.unmatched);
        policyCounts.skipped += 1;
        errors.push({ module: "Policies", zohoId, message: mapped.skip });
        continue;
      }
      bumpUnmatched(unmatchedBag, "Policies", mapped.unmatched);
      const carrier =
        (mapped.carrierZohoId ? carrierByZoho.get(mapped.carrierZohoId) : undefined) ??
        (mapped.carrierName ? carrierByNorm.get(normalizeCarrierName(mapped.carrierName)) : undefined);
      const [existing] = await db
        .select({ id: policies.id })
        .from(policies)
        .where(and(eq(policies.tenantId, tenantId), eq(policies.zohoId, zohoId)));
      const values = {
        policyNumber: mapped.policyNumber,
        lineOfBusiness: mapped.lineOfBusiness,
        formType: mapped.formType,
        policyType: mapped.policyType,
        policySubType: mapped.policySubType,
        insuranceType: mapped.insuranceType,
        status: mapped.status,
        effectiveDate: mapped.effectiveDate,
        expirationDate: mapped.expirationDate,
        premium: mapped.premium,
        gwp: mapped.gwp,
        billingFrequency: mapped.billingFrequency,
        premiumFrequency: mapped.premiumFrequency,
        termMonths: mapped.termMonths,
        sellingAgency: mapped.sellingAgency,
        producer: mapped.producer,
        contactId: mapped.contactZohoId ? (contactByZoho.get(mapped.contactZohoId) ?? null) : null,
        accountId: mapped.accountZohoId ? (accountByZoho.get(mapped.accountZohoId) ?? null) : null,
        dealId: mapped.dealZohoId ? (dealByZoho.get(mapped.dealZohoId) ?? null) : null,
        carrierId: carrier?.id ?? null,
        commission4Pct: mapped.commission4Pct,
        numberOfInsured: mapped.numberOfInsured,
        oepStart: mapped.oepStart,
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      const id = existing?.id ?? uuidFromZoho("policy", zohoId);
      if (existing) {
        await db.update(policies).set(values).where(eq(policies.id, existing.id));
        policyCounts.updated += 1;
      } else {
        await db.insert(policies).values({ id, tenantId, ...values });
        policyCounts.created += 1;
      }
      policyByZoho.set(zohoId, id);
    }
  }
  counts.push(policyCounts);

  const tasksFile = fileFor("Tasks");
  const taskCounts = emptyCounts("Tasks", "tasks");
  if (tasksFile) {
    const rows = await readModuleRecords(tasksFile.path);
    taskCounts.read = rows.length;
    for (const record of rows) {
      const zohoId = zohoIdOf(record);
      if (!zohoId) {
        taskCounts.skipped += 1;
        errors.push({ module: "Tasks", zohoId: null, message: "Missing Zoho id." });
        continue;
      }
      const mapped = mapTask(record, zohoId);
      bumpUnmatched(unmatchedBag, "Tasks", mapped.unmatched);
      const [existing] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(and(eq(activities.tenantId, tenantId), eq(activities.zohoId, zohoId)));
      const relatedId = mapped.relatedZohoId;
      const values = {
        kind: "task" as const,
        title: mapped.title,
        notes: mapped.notes,
        status: mapped.status,
        dueAt: mapped.dueAt,
        contactId: mapped.contactZohoId ? (contactByZoho.get(mapped.contactZohoId) ?? null) : null,
        accountId: relatedId ? (accountByZoho.get(relatedId) ?? null) : null,
        dealId: relatedId ? (dealByZoho.get(relatedId) ?? null) : null,
        policyId: relatedId ? (policyByZoho.get(relatedId) ?? null) : null,
        zohoId,
        sourceId: zohoId,
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(activities).set(values).where(eq(activities.id, existing.id));
        taskCounts.updated += 1;
      } else {
        await db.insert(activities).values({
          id: uuidFromZoho("task", zohoId),
          tenantId,
          ...values,
        });
        taskCounts.created += 1;
      }
    }
  }
  counts.push(taskCounts);

  await recomputePolicyCounts(tenantId, [...contactByZoho.values()], [...accountByZoho.values()]);

  const unmatched: UnmatchedField[] = [...unmatchedBag.entries()]
    .map(([key, count]) => {
      const [module, field] = key.split("\t") as [ZohoModule, string];
      return { module, field, count };
    })
    .sort((a, b) => b.count - a.count || a.module.localeCompare(b.module) || a.field.localeCompare(b.field));

  return {
    folder: dir,
    counts,
    unmatched,
    errors,
    carriersKept,
    carriersAdded,
    carriersMergedLines,
  };
}

async function recomputePolicyCounts(tenantId: string, contactIds: string[], accountIds: string[]) {
  const uniqueContacts = [...new Set(contactIds)];
  const uniqueAccounts = [...new Set(accountIds)];
  if (uniqueContacts.length) {
    const rows = await db
      .select({
        contactId: policies.contactId,
        lifetime: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${policies.status} in ('active','bound','pending'))`,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, tenantId), inArray(policies.contactId, uniqueContacts)))
      .groupBy(policies.contactId);
    const byId = new Map(rows.map((row) => [row.contactId, row]));
    for (const id of uniqueContacts) {
      const counts = byId.get(id);
      const lifetime = Number(counts?.lifetime ?? 0);
      const active = Number(counts?.active ?? 0);
      await db
        .update(contacts)
        .set({
          policyCount: lifetime,
          lifetimePolicyCount: lifetime,
          activePolicyCount: active,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id));
    }
  }
  if (uniqueAccounts.length) {
    const rows = await db
      .select({
        accountId: policies.accountId,
        lifetime: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${policies.status} in ('active','bound'))`,
        pending: sql<number>`count(*) filter (where ${policies.status} = 'pending')`,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, tenantId), inArray(policies.accountId, uniqueAccounts)))
      .groupBy(policies.accountId);
    const byId = new Map(rows.map((row) => [row.accountId, row]));
    for (const id of uniqueAccounts) {
      const counts = byId.get(id);
      const lifetime = Number(counts?.lifetime ?? 0);
      const active = Number(counts?.active ?? 0);
      const pending = Number(counts?.pending ?? 0);
      await db
        .update(accounts)
        .set({
          lifetimePolicyCount: lifetime,
          activePolicyCount: active,
          boundPolicyCount: active,
          pendingPolicyCount: pending,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, id));
    }
  }
}

export function formatImportReport(report: ImportReport): string {
  const lines = [
    `Zoho JSONL import from ${report.folder}`,
    `  carriers kept=${report.carriersKept} added=${report.carriersAdded} lines_merged=${report.carriersMergedLines}`,
    "  counts:",
  ];
  for (const row of report.counts) {
    lines.push(
      `    ${row.module} → ${row.fitfirst}: read=${row.read} created=${row.created} updated=${row.updated} skipped=${row.skipped} errors=${row.errors}`,
    );
  }
  if (report.errors.length) {
    lines.push("  row errors:");
    for (const err of report.errors.slice(0, 40)) {
      lines.push(`    ${err.module} ${err.zohoId ?? "-"}: ${err.message}`);
    }
    if (report.errors.length > 40) lines.push(`    … ${report.errors.length - 40} more`);
  }
  lines.push("  unmatched Zoho fields (present, not mapped):");
  if (report.unmatched.length === 0) {
    lines.push("    none");
  } else {
    const byModule = new Map<string, UnmatchedField[]>();
    for (const item of report.unmatched) {
      const list = byModule.get(item.module) ?? [];
      list.push(item);
      byModule.set(item.module, list);
    }
    for (const module of [...byModule.keys()].sort()) {
      const fields = (byModule.get(module) ?? [])
        .map((item) => `${item.field}×${item.count}`)
        .join(", ");
      lines.push(`    ${module}: ${fields}`);
    }
  }
  return lines.join("\n");
}
