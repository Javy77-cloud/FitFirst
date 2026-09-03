import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  alerts,
  appetiteRules,
  carriers,
  activities,
  activityLogs,
  contacts,
  deals,
  documentFolders,
  documents,
  emailCampaigns,
  leads,
  quoteAttemptLogs,
  quotes,
  reviewTasks,
  risks,
  tenants,
} from "./schema";
import fixture from "../fixtures/ana-dib-ho3-2026-09-02.json";
import {
  ACTIVITY_CALL_ID,
  ACTIVITY_MEETING_ID,
  ACTIVITY_TASK_ID,
  CAMPAIGN_ID,
  CARRIER_IDS,
  CONTACT_ID,
  DEAL_ID,
  DOC_ACORD_80_ID,
  DOC_FLYER_ID,
  DOC_HURRICANE_ID,
  FOLDER_ACORD_ID,
  FOLDER_DIB_ACCOUNT_ID,
  FOLDER_DIB_DEAL_ID,
  FOLDER_FLYERS_ID,
  FOLDER_MARKETING_ID,
  LEAD_ID,
  RISK_ID,
  TENANT_ID,
} from "../fixtures/ids";

const SHOP_AT = new Date(`${fixture.shopDate}T16:00:00.000Z`);

type CarrierKey = keyof typeof CARRIER_IDS;

export async function seedIfEmpty() {
  await seed();
  return { seeded: true };
}

export async function seed() {
  await db
    .insert(tenants)
    .values({
      id: TENANT_ID,
      tenantId: TENANT_ID,
      name: fixture.tenant.name,
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { name: fixture.tenant.name, tenantId: TENANT_ID },
    });

  await db
    .insert(leads)
    .values({
      id: LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Ana",
      lastName: "Dib",
      source: "book",
      status: "converted",
      notes: `HO3 shop ${fixture.shopDate}. ${fixture.risk.coverageANote} ${fixture.insured.namedInsuredNote}`,
      convertedDealId: DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Ana",
        lastName: "Dib",
        status: "converted",
        convertedDealId: DEAL_ID,
        notes: `HO3 shop ${fixture.shopDate}. ${fixture.risk.coverageANote} ${fixture.insured.namedInsuredNote}`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: CONTACT_ID,
      tenantId: TENANT_ID,
      firstName: "Ana",
      lastName: "Dib",
      mailingAddress: fixture.risk.address1,
      city: fixture.risk.city,
      state: fixture.risk.state,
      zip: fixture.risk.zip,
      phone: "321-555-0148",
      policyCount: 0,
      tags: ["ho3", "palm-bay"],
      notes: `Primary named insured. Secondary: ${fixture.insured.namedInsured}. ${fixture.insured.namedInsuredNote} Contact exists for the shop; no policy was created from these quotes.`,
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Ana",
        lastName: "Dib",
        mailingAddress: fixture.risk.address1,
        city: fixture.risk.city,
        state: fixture.risk.state,
        zip: fixture.risk.zip,
        phone: "321-555-0148",
        policyCount: 0,
        tags: ["ho3", "palm-bay"],
        notes: `Primary named insured. Secondary: ${fixture.insured.namedInsured}. ${fixture.insured.namedInsuredNote} Contact exists for the shop; no policy was created from these quotes.`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: DEAL_ID,
      tenantId: TENANT_ID,
      leadId: LEAD_ID,
      contactId: CONTACT_ID,
      title: "Dib · Palm Bay HO3",
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: fixture.insured.primary,
      secondaryNamedInsured: fixture.insured.namedInsured,
      notes: `${fixture.shopDate} shop: ${fixture.outcome.marketsRun} markets, ${fixture.outcome.bindableAt321k} bindable at $${fixture.risk.coverageA.toLocaleString("en-US")}. ${fixture.risk.occupancyNote}. Construction ${fixture.risk.constructionNote}. ${fixture.risk.roofCoveringNote}. ${fixture.risk.coverageANote} No policy from these quotes.`,
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: LEAD_ID,
        contactId: CONTACT_ID,
        title: "Dib · Palm Bay HO3",
        pipelineStage: "shopping",
        lineOfBusiness: "HO",
        primaryNamedInsured: fixture.insured.primary,
        secondaryNamedInsured: fixture.insured.namedInsured,
        notes: `${fixture.shopDate} shop: ${fixture.outcome.marketsRun} markets, ${fixture.outcome.bindableAt321k} bindable at $${fixture.risk.coverageA.toLocaleString("en-US")}. ${fixture.risk.occupancyNote}. Construction ${fixture.risk.constructionNote}. ${fixture.risk.roofCoveringNote}. ${fixture.risk.coverageANote} No policy from these quotes.`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: RISK_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      contactId: CONTACT_ID,
      riskType: "property",
      address1: fixture.risk.address1,
      city: fixture.risk.city,
      county: fixture.risk.county,
      state: fixture.risk.state,
      zip: fixture.risk.zip,
      yearBuilt: fixture.risk.yearBuilt,
      construction: fixture.risk.construction,
      occupancy: fixture.risk.occupancy,
      stories: fixture.risk.stories,
      coverageA: fixture.risk.coverageA,
      roofYear: fixture.risk.roofYear,
      roofCovering: fixture.risk.roofCovering,
      openingProtection: fixture.risk.openingProtection,
      pool: fixture.risk.pool,
      protectionClass: fixture.risk.protectionClass,
      milesToCoast: fixture.risk.milesToCoast,
      mobileHome: false,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: DEAL_ID,
        contactId: CONTACT_ID,
        address1: fixture.risk.address1,
        city: fixture.risk.city,
        county: fixture.risk.county,
        state: fixture.risk.state,
        zip: fixture.risk.zip,
        yearBuilt: fixture.risk.yearBuilt,
        construction: fixture.risk.construction,
        occupancy: fixture.risk.occupancy,
        stories: fixture.risk.stories,
        coverageA: fixture.risk.coverageA,
        roofYear: fixture.risk.roofYear,
        roofCovering: fixture.risk.roofCovering,
        openingProtection: fixture.risk.openingProtection,
        pool: fixture.risk.pool,
        protectionClass: fixture.risk.protectionClass,
        milesToCoast: fixture.risk.milesToCoast,
        mobileHome: false,
        squareFeet: null,
        replacementCostEstimate: null,
        updatedAt: new Date(),
      },
    });

  for (const carrier of fixture.carriers) {
    const id = CARRIER_IDS[carrier.key as CarrierKey];
    await db
      .insert(carriers)
      .values({
        id,
        tenantId: TENANT_ID,
        name: carrier.name,
        writtenLines: carrier.writtenLines,
        dontWriteNotes: carrier.dontWriteNotes,
        portalStatus: carrier.portalStatus,
        fixtureTag: "fl-ho3-2026-09-02",
        active: true,
      })
      .onConflictDoUpdate({
        target: carriers.id,
        set: {
          name: carrier.name,
          writtenLines: carrier.writtenLines,
          dontWriteNotes: carrier.dontWriteNotes,
          portalStatus: carrier.portalStatus,
          fixtureTag: "fl-ho3-2026-09-02",
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  await db.delete(appetiteRules).where(eq(appetiteRules.tenantId, TENANT_ID));
  await db.insert(appetiteRules).values(
    fixture.carriers.map((carrier) => ({
      tenantId: TENANT_ID,
      carrierId: CARRIER_IDS[carrier.key as CarrierKey],
      lineOfBusiness: carrier.rule.lineOfBusiness,
      minCovA: "minCovA" in carrier.rule ? (carrier.rule.minCovA as number) : null,
      maxCovA: null,
      minYearBuilt: null,
      maxRoofAge: "maxRoofAge" in carrier.rule ? (carrier.rule.maxRoofAge as number) : null,
      allowedRoofCoverings:
        "allowedRoofCoverings" in carrier.rule
          ? (carrier.rule.allowedRoofCoverings as string[])
          : null,
      coastalAllowed: true,
      minMilesToCoast:
        "minMilesToCoast" in carrier.rule ? (carrier.rule.minMilesToCoast as number) : null,
      maxMilesToCoast: null,
      mobileAllowed: false,
      requiresOpeningProtection: false,
      allowedConstruction:
        "allowedConstruction" in carrier.rule
          ? (carrier.rule.allowedConstruction as string[])
          : null,
      countyMinCovA:
        "countyMinCovA" in carrier.rule
          ? (carrier.rule.countyMinCovA as Record<string, number>)
          : null,
      requireReplacementCost: false,
      rceFloorRatio: null,
      notes: carrier.rule.notes,
    })),
  );

  const snap = {
    snapYearBuilt: fixture.risk.yearBuilt,
    snapRoofYear: fixture.risk.roofYear,
    snapRoofCovering: fixture.risk.roofCovering,
    snapConstruction: fixture.risk.construction,
    snapOpeningProtection: fixture.risk.openingProtection,
    snapOccupancy: fixture.risk.occupancy,
    snapStories: fixture.risk.stories,
    snapPool: fixture.risk.pool,
    snapProtectionClass: fixture.risk.protectionClass,
    snapMilesToCoast: fixture.risk.milesToCoast,
    snapCity: fixture.risk.city,
    snapCounty: fixture.risk.county,
    snapCoverageA: fixture.risk.coverageA,
  };

  await db.delete(quotes).where(eq(quotes.dealId, DEAL_ID));
  await db.delete(quoteAttemptLogs).where(eq(quoteAttemptLogs.dealId, DEAL_ID));
  await db.insert(quoteAttemptLogs).values(
    fixture.attempts.map((attempt) => ({
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      riskId: RISK_ID,
      carrierId: CARRIER_IDS[attempt.carrierKey as CarrierKey],
      attemptedAt: SHOP_AT,
      lineOfBusiness: attempt.lineOfBusiness,
      result: attempt.result,
      bindable: attempt.bindable,
      quoteNumber: attempt.quoteNumber,
      premium: attempt.premium == null ? null : String(attempt.premium),
      covATried: attempt.covATried,
      covAForced: attempt.covAForced,
      why: attempt.why,
      ...snap,
    })),
  );

  await db.delete(alerts).where(eq(alerts.tenantId, TENANT_ID));
  await db.insert(alerts).values([
    {
      tenantId: TENANT_ID,
      kind: "appetite_warning",
      title: "Ana Dib HO3 · 8 markets, 0 bindable at $321,000",
      body: "2026-09-02 Palm Bay shop. Filter-first skips QBE (frame within 20 mi of coast), Benchmark/Hadron (37yr clay), HOC (no NB), VYRD (takeout + Brevard $350k), and the house RCE/MSB floors (Tailrow, VAVE, GeoVera, SageSure). American Integrity quoted $321k but is not bindable (roof age + RCS). Floors are attempts, not wins. No policy from these quotes.",
      severity: "warning",
      entityType: "deal",
      entityId: DEAL_ID,
    },
    {
      tenantId: TENANT_ID,
      kind: "extraction_flag",
      title: "Wind mit handwriting needs a 30-second glance",
      body: "Use the sample handwritten wind mit on the Dib deal. Fields under 80% confidence stay off the master record until you accept them.",
      severity: "info",
      entityType: "deal",
      entityId: DEAL_ID,
    },
  ]);

  await db
    .delete(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, TENANT_ID), eq(reviewTasks.dealId, DEAL_ID)));
  await db.insert(reviewTasks).values({
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    dealId: DEAL_ID,
    kind: "30_day",
    title: "30-day shop follow-up · Dib Palm Bay HO3",
    dueDate: new Date("2026-10-02T16:00:00.000Z"),
    status: "open",
  });

  await db
    .insert(activities)
    .values({
      id: ACTIVITY_TASK_ID,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Chase wind mit · Ana Dib HO3",
      notes: "Need a clean wind mit before any market will bind at $321k.",
        status: "incomplete",
        dueAt: new Date("2026-09-02T15:00:00.000Z"),
      assignee: "Desk",
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: "Chase wind mit · Ana Dib HO3",
        notes: "Need a clean wind mit before any market will bind at $321k.",
        status: "incomplete",
        dueAt: new Date("2026-09-02T15:00:00.000Z"),
        contactId: CONTACT_ID,
        dealId: DEAL_ID,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: ACTIVITY_MEETING_ID,
      tenantId: TENANT_ID,
      kind: "meeting",
      title: "Market review with Ana Dib",
      notes: "Walk the eight-market filter-first result. No bindable quote yet.",
        status: "incomplete",
        startAt: new Date("2026-09-02T18:00:00.000Z"),
      endAt: new Date("2026-09-02T18:45:00.000Z"),
      assignee: "Desk",
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: "Market review with Ana Dib",
        notes: "Walk the eight-market filter-first result. No bindable quote yet.",
        status: "incomplete",
        startAt: new Date("2026-09-02T18:00:00.000Z"),
        endAt: new Date("2026-09-02T18:45:00.000Z"),
        contactId: CONTACT_ID,
        dealId: DEAL_ID,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: ACTIVITY_CALL_ID,
      tenantId: TENANT_ID,
      kind: "call",
      title: "Follow-up call · Ana Dib HO3",
      notes: "In-app due call. Phone button uses tel: — no Twilio.",
      status: "incomplete",
      startAt: new Date("2026-09-02T16:00:00.000Z"),
      endAt: new Date("2026-09-02T16:15:00.000Z"),
      assignee: "Desk",
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        title: "Follow-up call · Ana Dib HO3",
        status: "incomplete",
        startAt: new Date("2026-09-02T16:00:00.000Z"),
        contactId: CONTACT_ID,
        dealId: DEAL_ID,
        updatedAt: new Date(),
      },
    });

  await db.delete(activityLogs).where(eq(activityLogs.tenantId, TENANT_ID));
  await db.insert(activityLogs).values([
    {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_TASK_ID,
      eventType: "created",
      body: "Created task \"Chase wind mit · Ana Dib HO3\" on contact Dib, Ana",
      toStatus: "incomplete",
    },
    {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_MEETING_ID,
      eventType: "created",
      body: "Created meeting \"Market review with Ana Dib\" on contact Dib, Ana",
      toStatus: "incomplete",
    },
    {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_CALL_ID,
      eventType: "created",
      body: "Created call \"Follow-up call · Ana Dib HO3\" on contact Dib, Ana",
      toStatus: "incomplete",
    },
    {
      tenantId: TENANT_ID,
      activityId: ACTIVITY_CALL_ID,
      eventType: "call_logged",
      body: "Call logged (180s). In-app only — no Twilio.",
      durationSeconds: 180,
      toStatus: "incomplete",
    },
  ]);

  await db
    .insert(emailCampaigns)
    .values({
      id: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      name: "Wind mit chase",
      subject: "Need your wind mitigation inspection",
      body: "Please send the wind mit so we can finish shopping the Palm Bay HO3. Sends from this screen are logged only — no SMTP.",
      audienceType: "tag",
      audienceValue: "ho3",
      status: "draft",
    })
    .onConflictDoUpdate({
      target: emailCampaigns.id,
      set: {
        name: "Wind mit chase",
        subject: "Need your wind mitigation inspection",
        audienceType: "tag",
        audienceValue: "ho3",
        updatedAt: new Date(),
      },
    });

  await seedDocumentManager();
}

async function seedDocumentManager() {
  const folders = [
    {
      id: FOLDER_ACORD_ID,
      name: "ACORD",
      kind: "agency_library",
      slug: "acord",
      description: "Blank ACORD applications for the desk. Demo forms only.",
      sortOrder: 0,
    },
    {
      id: FOLDER_FLYERS_ID,
      name: "Carrier flyers",
      kind: "agency_library",
      slug: "carrier-flyers",
      description: "In-appetite market one-pagers. No live carrier login.",
      sortOrder: 1,
    },
    {
      id: FOLDER_MARKETING_ID,
      name: "Marketing",
      kind: "agency_library",
      slug: "marketing",
      description: "Seasonal checklists and agency handouts.",
      sortOrder: 2,
    },
    {
      id: FOLDER_DIB_ACCOUNT_ID,
      name: "Dib, Ana",
      kind: "account",
      slug: "dib-ana",
      description: "Demo account folder for the Palm Bay shop. Seed name only.",
      contactId: CONTACT_ID,
      sortOrder: 0,
    },
    {
      id: FOLDER_DIB_DEAL_ID,
      name: "Dib · Palm Bay HO3",
      kind: "deal",
      slug: "dib-palm-bay-ho3",
      description: "Per-deal files for the 2026-09-02 shop.",
      contactId: CONTACT_ID,
      dealId: DEAL_ID,
      sortOrder: 0,
    },
  ] as const;

  for (const folder of folders) {
    await db
      .insert(documentFolders)
      .values({ tenantId: TENANT_ID, ...folder })
      .onConflictDoUpdate({
        target: documentFolders.id,
        set: {
          name: folder.name,
          kind: folder.kind,
          description: folder.description,
          updatedAt: new Date(),
        },
      });
  }

  const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  const files = [
    {
      id: DOC_ACORD_80_ID,
      folderId: FOLDER_ACORD_ID,
      filename: "ACORD 80 homeowners application.pdf",
      docType: "acord",
      tags: ["acord", "ho"],
      body: "FitFirst demo ACORD 80 — blank homeowners application. Not a real insured record.",
    },
    {
      id: DOC_FLYER_ID,
      folderId: FOLDER_FLYERS_ID,
      filename: "American Integrity HO3 flyer.pdf",
      docType: "flyer",
      tags: ["flyer", "american-integrity"],
      body: "Demo carrier flyer. American Integrity HO3 talking points. No live quote.",
    },
    {
      id: DOC_HURRICANE_ID,
      folderId: FOLDER_MARKETING_ID,
      filename: "Hurricane season checklist.pdf",
      docType: "marketing",
      tags: ["marketing", "hurricane"],
      body: "Demo marketing handout. Review deductibles and opening protection before storm season.",
    },
  ];

  for (const file of files) {
    const storagePath = path.join(TENANT_ID, "library", `${file.id}-${file.filename}`);
    const abs = path.join(uploadRoot, storagePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, file.body, "utf8");
    await db
      .insert(documents)
      .values({
        id: file.id,
        tenantId: TENANT_ID,
        folderId: file.folderId,
        filename: file.filename,
        mimeType: "application/pdf",
        storagePath,
        docType: file.docType,
        status: "uploaded",
        tags: file.tags,
      })
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          folderId: file.folderId,
          filename: file.filename,
          docType: file.docType,
          tags: file.tags,
        },
      });
  }
}
