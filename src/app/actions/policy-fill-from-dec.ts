"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { appointmentLine } from "@/lib/domain-ams";
import { shopLineFromLob } from "@/lib/deals/shop-flow";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  contacts,
  documents,
  drivers,
  extractedFields,
  policies,
  policyAdditionalInterests,
  policyFillAudit,
  policyTerms,
  risks,
  vehicles,
} from "@/lib/db/schema";
import { extractWithGeminiPdf } from "@/lib/extraction/gemini";
import { loadGeminiApiKey } from "@/lib/extraction/gemini/key";
import { readStoredFile } from "@/lib/files/object-store";
import { isUuid } from "@/lib/ids";
import { issuedPolicyDocType } from "@/lib/policy/issued-upload";
import {
  loadGeminiRows,
  shouldForceAutoDecReread,
  type GeminiMintRow,
} from "@/lib/policy/load-gemini-rows";
import { parsePropertyProtectionSnapshot } from "@/lib/policy/property-protection";
import { writeLicense } from "@/lib/pii/write";
import { termRoleFromTags } from "@/lib/documents/document-labels";
import {
  issueFillShouldPromoteCurrent,
  promoteArrivingCurrentDec,
} from "@/lib/policy/promote-current-dec";
import { riskIdForExtractedFieldsCache } from "@/lib/renewal/fill-compare-from-decs";
import {
  buildPolicyFillAuditInsert,
  classifyFillFields,
  countFillOverwrites,
  driverIdentity,
  fillFamilyForPolicy,
  fillOverwriteWarning,
  formatFillServerTime,
  groupAppliedFill,
  manualFillReasonError,
  pickPolicyDecDocument,
  proposeFillFromDec,
  snapshotFillTargets,
  vehicleIdentity,
  type AppliedDriver,
  type DecDocLike,
  type FillSource,
} from "@/lib/policy/fill-from-dec";

export type FillPolicyFromDecResult =
  | {
      ok: true;
      filled: string[];
      overwritten: string[];
      skipped: string[];
      auditId: string;
    }
  | {
      ok: false;
      error: string;
      overwriteCount?: number;
      overwritten?: string[];
    };

function shopLineForPolicy(lineOfBusiness: string | null | undefined): string | null {
  const lob = appointmentLine(lineOfBusiness ?? "");
  return shopLineFromLob(lob) ?? (lob === "HO" ? "home" : lob === "AUTO" ? "auto" : null);
}

async function readCachedExtract(docId: string): Promise<{ rows: GeminiMintRow[]; newestAt: Date | null }> {
  const existing = await db
    .select()
    .from(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  let newestAt: Date | null = null;
  const rows = existing.map((row) => {
    if (row.createdAt && (!newestAt || row.createdAt > newestAt)) newestAt = row.createdAt;
    return {
      fieldKey: row.fieldKey,
      normalizedValue: row.normalizedValue,
      rawValue: row.rawValue,
      confidence: Number(row.confidence ?? 0),
      flagged: row.flagged,
    };
  });
  return { rows, newestAt };
}

async function persistExtractRows(docId: string, rows: GeminiMintRow[], policyRiskId?: string | null) {
  try {
    const [doc] = await db
      .select({ riskId: documents.riskId })
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, docId)));
    const riskId = riskIdForExtractedFieldsCache(doc?.riskId, policyRiskId);
    if (!riskId) return;
    const values = rows.flatMap((field) => {
      const normalized = field.normalizedValue?.trim() || "";
      const raw = field.rawValue?.trim() || normalized;
      if (!normalized && !raw) return [];
      return [
        {
          tenantId: DEFAULT_TENANT_ID,
          documentId: docId,
          riskId,
          fieldKey: field.fieldKey,
          rawValue: raw,
          normalizedValue: normalized || raw,
          confidence: field.confidence.toFixed(3),
          flagged: field.flagged,
          appliedToRisk: false,
        },
      ];
    });
    await db
      .delete(extractedFields)
      .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
    if (values.length > 0) await db.insert(extractedFields).values(values);
  } catch (error) {
    console.error("fillPolicyFromDec: extracted_fields cache failed", {
      documentId: docId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

type PreparedFill = {
  policy: typeof policies.$inferSelect;
  doc: DecDocLike & { storagePath?: string | null };
  proposed: Record<string, string>;
  existing: Record<string, string>;
  classified: ReturnType<typeof classifyFillFields>;
};

async function prepareFill(input: {
  policyId: string;
  documentId?: string | null;
  /** Manual auto Fill re-reads a hollow DEC cache. A cached extract from before the PAP field map drops deductibles and premiums. */
  forceExtract?: boolean;
  /** Confirm step: the preview click already read the DEC. Do not call Gemini again. */
  reuseFreshAutoExtract?: boolean;
}): Promise<{ ok: true; prepared: PreparedFill } | { ok: false; error: string }> {
  if (!isUuid(input.policyId)) return { ok: false, error: "Policy required." };
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.policyId)));
  if (!policy) return { ok: false, error: "Policy not found." };

  const docs = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      storagePath: documents.storagePath,
      mimeType: documents.mimeType,
      docType: documents.docType,
      slot: documents.slot,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, DEFAULT_TENANT_ID),
        eq(documents.policyId, policy.id),
        notHiddenDocument(),
      ),
    );

  let pool = docs;
  if (policy.sourceDocumentId && !pool.some((doc) => doc.id === policy.sourceDocumentId)) {
    const [source] = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        storagePath: documents.storagePath,
        mimeType: documents.mimeType,
        docType: documents.docType,
        slot: documents.slot,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, policy.sourceDocumentId)));
    if (source) pool = [...pool, source];
  }

  if (input.documentId && !pool.some((doc) => doc.id === input.documentId)) {
    return { ok: false, error: "Declaration not on this policy." };
  }
  const doc = pickPolicyDecDocument(pool, {
    documentId: input.documentId,
    sourceDocumentId: policy.sourceDocumentId,
  });
  if (!doc) return { ok: false, error: "No declaration page on this policy." };

  const shopLine = shopLineForPolicy(policy.lineOfBusiness);
  const familyForExtract = fillFamilyForPolicy(policy);
  const cached = await readCachedExtract(doc.id);
  const force = shouldForceAutoDecReread({
    manualAuto: Boolean(input.forceExtract) && familyForExtract === "auto",
    rows: cached.rows,
    newestAt: cached.newestAt,
    now: new Date(),
    reuseFresh: Boolean(input.reuseFreshAutoExtract),
  });
  const gemini = await loadGeminiRows(
    {
      docId: doc.id,
      storagePath: doc.storagePath,
      mimeType: doc.mimeType,
      filename: doc.filename,
      shopLine,
      docType: doc.docType || issuedPolicyDocType(shopLine),
      force,
      extractPurpose: "fill",
    },
    {
      readStoredFile,
      loadCachedRows: async () => cached.rows,
      loadGeminiApiKey,
      extractWithGeminiPdf,
      persistRows: (id, rows) => persistExtractRows(id, rows, policy.riskId),
    },
  );
  if (!gemini.ok) return { ok: false, error: gemini.message };

  const family = fillFamilyForPolicy(policy);
  const proposed = proposeFillFromDec({ family, rows: gemini.rows });

  const [risk, contact, mortgagees, terms, vehicleRows, driverRows] = await Promise.all([
    policy.riskId
      ? db
          .select()
          .from(risks)
          .where(and(eq(risks.tenantId, DEFAULT_TENANT_ID), eq(risks.id, policy.riskId)))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    policy.contactId
      ? db
          .select({
            mailingAddress: contacts.mailingAddress,
            city: contacts.city,
            state: contacts.state,
            zip: contacts.zip,
          })
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, policy.contactId)))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        name: policyAdditionalInterests.name,
        loanNumber: policyAdditionalInterests.loanNumber,
      })
      .from(policyAdditionalInterests)
      .where(
        and(
          eq(policyAdditionalInterests.tenantId, DEFAULT_TENANT_ID),
          eq(policyAdditionalInterests.policyId, policy.id),
          eq(policyAdditionalInterests.kind, "mortgagee"),
        ),
      ),
    db
      .select()
      .from(policyTerms)
      .where(
        and(
          eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
          eq(policyTerms.policyId, policy.id),
          eq(policyTerms.role, "current"),
        ),
      ),
    db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, DEFAULT_TENANT_ID), eq(vehicles.policyId, policy.id))),
    db
      .select()
      .from(drivers)
      .where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.policyId, policy.id))),
  ]);

  const protection = parsePropertyProtectionSnapshot(policy.propertyProtection);
  const existing = snapshotFillTargets({
    policy,
    risk,
    protection: protection?.values ?? null,
    contact,
    mortgagee: mortgagees[0] ?? null,
    term: terms[0] ?? null,
    vehicles: vehicleRows,
    drivers: driverRows.map((driver) => ({
      firstName: driver.firstName,
      lastName: driver.lastName,
      dateOfBirth: driver.dateOfBirth,
      licenseLast4: driver.licenseNumberLast4,
      licenseState: driver.licenseState,
    })),
  });
  const classified = classifyFillFields(existing, proposed);
  return { ok: true, prepared: { policy, doc, proposed, existing, classified } };
}

export async function previewFillPolicyFromDec(policyId: string): Promise<
  | {
      ok: true;
      agentName: string;
      serverNow: string;
      overwriteCount: number;
      documentId: string;
      filename: string;
      policyNumber: string;
    }
  | { ok: false; error: string }
> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in required." };
  const prepared = await prepareFill({ policyId, forceExtract: true });
  if (!prepared.ok) return prepared;
  return {
    ok: true,
    agentName: session.name?.trim() || session.email || "Agent",
    serverNow: formatFillServerTime(new Date()),
    overwriteCount: countFillOverwrites(prepared.prepared.classified),
    documentId: prepared.prepared.doc.id,
    filename: prepared.prepared.doc.filename ?? "",
    policyNumber: prepared.prepared.policy.policyNumber,
  };
}

async function sealDriverLicense(driver: AppliedDriver): Promise<ReturnType<typeof writeLicense> | null> {
  if (!driver.licenseNumber) return null;
  try {
    return writeLicense(driver.licenseNumber);
  } catch (error) {
    console.error("fillPolicyFromDec: license vault failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function fillPolicyFromDec(input: {
  policyId: string;
  documentId?: string | null;
  reason?: string | null;
  source: FillSource;
  confirmOverwrite?: boolean;
}): Promise<FillPolicyFromDecResult> {
  const reasonError = manualFillReasonError(input.source, input.reason);
  if (reasonError) return { ok: false, error: reasonError };

  const session = await currentDeskSession();
  if (input.source === "manual" && !session.signedIn) {
    return { ok: false, error: "Sign in required." };
  }

  const prepared = await prepareFill({
    policyId: input.policyId,
    documentId: input.documentId,
    forceExtract: input.source === "manual",
    reuseFreshAutoExtract: input.source === "manual",
  });
  if (!prepared.ok) return prepared;
  const { policy, doc, proposed, classified } = prepared.prepared;
  const overwriteCount = countFillOverwrites(classified);
  const applyOverwrites = input.source === "issue" || input.confirmOverwrite === true;
  if (input.source === "manual" && overwriteCount > 0 && !applyOverwrites) {
    return {
      ok: false,
      error: fillOverwriteWarning(overwriteCount),
      overwriteCount,
      overwritten: classified.overwritten,
    };
  }

  const allowed = [...classified.filled, ...(applyOverwrites ? classified.overwritten : [])];
  const patch = groupAppliedFill(proposed, allowed);
  const dropped = new Set<string>();
  const agentName = session.signedIn
    ? session.name?.trim() || session.email || "Agent"
    : "System";
  const agentId = session.signedIn ? session.userId : null;

  let auditId: string;
  try {
    auditId = await db.transaction(async (tx) => {
    const policySet: Record<string, unknown> = {};
    if (patch.policy.premisesAddress) policySet.premisesAddress = patch.policy.premisesAddress;
    if (patch.policy.premisesCity) policySet.premisesCity = patch.policy.premisesCity;
    if (patch.policy.premisesState) policySet.premisesState = patch.policy.premisesState;
    if (patch.policy.premisesZip) policySet.premisesZip = patch.policy.premisesZip;
    if (patch.policy.coverageA != null) policySet.coverageA = patch.policy.coverageA;
    if (patch.policy.formType) policySet.formType = patch.policy.formType;
    if (patch.policy.premium) policySet.premium = patch.policy.premium;
    if (patch.policy.effectiveDate) policySet.effectiveDate = patch.policy.effectiveDate;
    if (patch.policy.expirationDate) policySet.expirationDate = patch.policy.expirationDate;
    if (patch.policy.termMonths != null) policySet.termMonths = patch.policy.termMonths;
    if (Object.keys(patch.coverageLimits).length > 0) {
      policySet.coverageLimits = { ...(policy.coverageLimits ?? {}), ...patch.coverageLimits };
    }
    if (Object.keys(patch.protection).length > 0) {
      const existing = parsePropertyProtectionSnapshot(policy.propertyProtection);
      policySet.propertyProtection = {
        values: { ...(existing?.values ?? {}), ...patch.protection },
        updatedAt: new Date().toISOString(),
        source: "gemini" as const,
      };
    }

    const riskKeys = Object.keys(patch.risk);
    if (riskKeys.length > 0) {
      if (policy.riskId) {
        await tx
          .update(risks)
          .set({ ...patch.risk, updatedAt: new Date() })
          .where(and(eq(risks.tenantId, DEFAULT_TENANT_ID), eq(risks.id, policy.riskId)));
      } else if (policy.dealId) {
        const [created] = await tx
          .insert(risks)
          .values({
            tenantId: DEFAULT_TENANT_ID,
            dealId: policy.dealId,
            contactId: policy.contactId,
            address1: patch.risk.address1 ?? null,
            city: patch.risk.city ?? null,
            state: patch.risk.state ?? null,
            zip: patch.risk.zip ?? null,
            yearBuilt: patch.risk.yearBuilt ?? null,
            construction: patch.risk.construction ?? null,
            occupancy: patch.risk.occupancy ?? null,
            county: patch.risk.county ?? null,
            protectionClass: patch.risk.protectionClass ?? null,
            roofYear: patch.risk.roofYear ?? null,
            roofCovering: patch.risk.roofCovering ?? null,
            coverageA: patch.risk.coverageA ?? null,
          })
          .returning({ id: risks.id });
        if (created) policySet.riskId = created.id;
      }
    }

    if (Object.keys(policySet).length > 0) {
      await tx
        .update(policies)
        .set({ ...policySet, updatedAt: new Date() })
        .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policy.id)));
    }

    if (policy.contactId && Object.keys(patch.contact).length > 0) {
      await tx
        .update(contacts)
        .set({ ...patch.contact, updatedAt: new Date() })
        .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, policy.contactId)));
    }

    if (patch.mortgagee.name || patch.mortgagee.loanNumber) {
      const [interest] = await tx
        .select()
        .from(policyAdditionalInterests)
        .where(
          and(
            eq(policyAdditionalInterests.tenantId, DEFAULT_TENANT_ID),
            eq(policyAdditionalInterests.policyId, policy.id),
            eq(policyAdditionalInterests.kind, "mortgagee"),
          ),
        )
        .limit(1);
      if (interest) {
        await tx
          .update(policyAdditionalInterests)
          .set({
            ...(patch.mortgagee.name ? { name: patch.mortgagee.name } : {}),
            ...(patch.mortgagee.loanNumber ? { loanNumber: patch.mortgagee.loanNumber } : {}),
            updatedAt: new Date(),
          })
          .where(eq(policyAdditionalInterests.id, interest.id));
      } else if (patch.mortgagee.name) {
        await tx.insert(policyAdditionalInterests).values({
          tenantId: DEFAULT_TENANT_ID,
          policyId: policy.id,
          kind: "mortgagee",
          name: patch.mortgagee.name,
          loanNumber: patch.mortgagee.loanNumber ?? null,
        });
      }
    }

    if (Object.keys(patch.term).length > 0) {
      const currents = await tx
        .select()
        .from(policyTerms)
        .where(
          and(
            eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
            eq(policyTerms.policyId, policy.id),
            eq(policyTerms.role, "current"),
          ),
        );
      if (currents.length === 0) {
        await tx.insert(policyTerms).values({
          tenantId: DEFAULT_TENANT_ID,
          policyId: policy.id,
          role: "current",
          termEffective: policy.effectiveDate,
          termExpiration: policy.expirationDate,
          source: "dec_fill",
          ...patch.term,
        });
      } else {
        for (const term of currents) {
          await tx.update(policyTerms).set(patch.term).where(eq(policyTerms.id, term.id));
        }
      }
    }

    if (patch.vehicles.length > 0) {
      const existingVehicles = await tx
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, DEFAULT_TENANT_ID), eq(vehicles.policyId, policy.id)));
      const byIdentity = new Map<string, (typeof existingVehicles)[number]>();
      for (const row of existingVehicles) {
        const identity = vehicleIdentity(row);
        if (identity) byIdentity.set(identity, row);
      }
      let nextSort =
        existingVehicles.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), -1) + 1;
      for (const vehicle of patch.vehicles) {
        const found = byIdentity.get(vehicle.identity);
        if (!found) {
          await tx.insert(vehicles).values({
            tenantId: DEFAULT_TENANT_ID,
            policyId: policy.id,
            dealId: policy.dealId,
            riskId: policy.riskId,
            year: vehicle.year ?? null,
            make: vehicle.make ?? null,
            model: vehicle.model ?? null,
            vin: vehicle.vin ?? null,
            usage: vehicle.usage ?? null,
            garagingZip: vehicle.garagingZip ?? null,
            garagingAddress: vehicle.garagingAddress ?? null,
            annualMiles: vehicle.annualMiles ?? null,
            lienholder: vehicle.lienholder ?? null,
            premium: vehicle.premium ?? null,
            comprehensiveDeductible: vehicle.comprehensiveDeductible ?? null,
            collisionDeductible: vehicle.collisionDeductible ?? null,
            sortOrder: nextSort,
          });
          nextSort += 1;
        } else {
          const set: {
            year?: number | null;
            make?: string | null;
            model?: string | null;
            vin?: string | null;
            usage?: string | null;
            garagingZip?: string | null;
            garagingAddress?: string | null;
            annualMiles?: string | null;
            lienholder?: string | null;
            premium?: string | null;
            comprehensiveDeductible?: string | null;
            collisionDeductible?: string | null;
            updatedAt: Date;
          } = { updatedAt: new Date() };
          for (const field of vehicle.write) {
            if (field === "year") set.year = vehicle.year ?? null;
            if (field === "vin") set.vin = vehicle.vin ?? null;
            if (field === "make") set.make = vehicle.make ?? null;
            if (field === "model") set.model = vehicle.model ?? null;
            if (field === "usage") set.usage = vehicle.usage ?? null;
            if (field === "garagingZip") set.garagingZip = vehicle.garagingZip ?? null;
            if (field === "garagingAddress") set.garagingAddress = vehicle.garagingAddress ?? null;
            if (field === "annualMiles") set.annualMiles = vehicle.annualMiles ?? null;
            if (field === "lienholder") set.lienholder = vehicle.lienholder ?? null;
            if (field === "premium") set.premium = vehicle.premium ?? null;
            if (field === "comprehensiveDeductible") set.comprehensiveDeductible = vehicle.comprehensiveDeductible ?? null;
            if (field === "collisionDeductible") set.collisionDeductible = vehicle.collisionDeductible ?? null;
          }
          await tx
            .update(vehicles)
            .set(set)
            .where(and(eq(vehicles.tenantId, DEFAULT_TENANT_ID), eq(vehicles.id, found.id)));
        }
      }
    }

    if (patch.drivers.length > 0) {
      const existingDrivers = await tx
        .select()
        .from(drivers)
        .where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.policyId, policy.id)));
      const byIdentity = new Map<string, (typeof existingDrivers)[number]>();
      for (const row of existingDrivers) {
        const identity = driverIdentity(`${row.firstName} ${row.lastName}`);
        if (identity) byIdentity.set(identity, row);
      }
      let nextSort =
        existingDrivers.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), -1) + 1;
      for (const driver of patch.drivers) {
        const found = byIdentity.get(driver.identity);
        const sealed = driver.licenseNumber ? await sealDriverLicense(driver) : null;
        if (driver.licenseNumber && !sealed) dropped.add(`driver:${driver.identity}.license`);
        if (!found) {
          await tx.insert(drivers).values({
            tenantId: DEFAULT_TENANT_ID,
            policyId: policy.id,
            dealId: policy.dealId,
            riskId: policy.riskId,
            contactId: policy.contactId,
            firstName: driver.firstName,
            lastName: driver.lastName,
            dateOfBirth: driver.dateOfBirth ?? null,
            licenseState: driver.licenseState ?? null,
            ...(sealed ?? {}),
            sortOrder: nextSort,
          });
          nextSort += 1;
        } else {
          await tx
            .update(drivers)
            .set({
              ...(driver.dateOfBirth ? { dateOfBirth: driver.dateOfBirth } : {}),
              ...(driver.licenseState ? { licenseState: driver.licenseState } : {}),
              ...(sealed ?? {}),
              updatedAt: new Date(),
            })
            .where(and(eq(drivers.tenantId, DEFAULT_TENANT_ID), eq(drivers.id, found.id)));
        }
      }
    }

    const fieldsWritten = classified.filled.filter((key) => !dropped.has(key));
    const fieldsOverwritten = classified.overwritten.filter((key) => !dropped.has(key));
    const audit = buildPolicyFillAuditInsert({
      tenantId: DEFAULT_TENANT_ID,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      source: input.source,
      agentId,
      agentName,
      reason: input.reason ?? null,
      documentId: doc.id,
      documentFilename: doc.filename ?? null,
      fieldsWritten,
      fieldsOverwritten,
    });
    const [row] = await tx
      .insert(policyFillAudit)
      .values(audit)
      .returning({ id: policyFillAudit.id });
    if (!row) throw new Error("Could not record fill audit.");
    return row.id;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fill from the declaration.";
    return { ok: false, error: message };
  }

  if (input.source === "manual") {
    const marked = await promoteArrivingCurrentDec({
      policyId: policy.id,
      documentId: doc.id,
      advanceTerm: false,
    });
    if (!marked.ok) return marked;
  }

  revalidatePath(`/policies/${policy.id}`);
  revalidatePath("/policies");
  return {
    ok: true,
    filled: classified.filled.filter((key) => !dropped.has(key)),
    overwritten: applyOverwrites ? classified.overwritten.filter((key) => !dropped.has(key)) : [],
    skipped: classified.skipped,
    auditId,
  };
}

/** Issue hook: DEC already attached. No prompt. Failures do not undo mint. */
export async function fillPolicyFromDecOnIssue(input: {
  policyId: string;
  documentId?: string | null;
}): Promise<FillPolicyFromDecResult> {
  try {
    const documentId = input.documentId?.trim() ?? "";
    if (documentId) {
      const [row] = await db
        .select({ tags: documents.tags })
        .from(documents)
        .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
      if (issueFillShouldPromoteCurrent(termRoleFromTags(row?.tags))) {
        const marked = await promoteArrivingCurrentDec({
          policyId: input.policyId,
          documentId,
          advanceTerm: false,
        });
        if (!marked.ok) {
          console.error("promote current declaration at issue", {
            policyId: input.policyId,
            documentId,
            error: marked.error,
          });
        }
      }
    }
    const result = await fillPolicyFromDec({
      policyId: input.policyId,
      documentId: input.documentId,
      source: "issue",
      confirmOverwrite: true,
    });
    if (!result.ok) {
      console.error("fillPolicyFromDec at issue", {
        policyId: input.policyId,
        documentId: input.documentId ?? null,
        error: result.error,
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fill from declaration failed.";
    console.error("fillPolicyFromDec at issue threw", {
      policyId: input.policyId,
      message,
    });
    return { ok: false, error: message };
  }
}
