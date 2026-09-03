// @ts-nocheck — leftover commercial book uses a businesses table the desk folded into accounts.
// Do not call this seeder: Harbor Key Marine LLC is seeded in seed-wire.ts.
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  alerts,
  businesses,
  carriers,
  contacts,
  issuedCertificates,
  policies,
  type CoverageLimits,
} from "./schema";
import {
  BUSINESS_IDS,
  COMMERCIAL_CARRIER_IDS,
  COMMERCIAL_CONTACT_IDS,
  COMMERCIAL_POLICY_IDS,
  SEEDED_CERTIFICATE_IDS,
  TENANT_ID,
} from "../fixtures/ids";
import { buildCertificateDraft, nextCertificateNumber } from "../certificates/issue";

const GL_LIMITS: CoverageLimits = {
  eachOccurrence: "1000000",
  damageToRented: "100000",
  medicalExpense: "5000",
  personalAdvertising: "1000000",
  generalAggregate: "2000000",
  productsCompletedOps: "2000000",
};

const WC_LIMITS: CoverageLimits = {
  wcStatutory: "statutory",
  elEachAccident: "1000000",
  elDiseaseEachEmployee: "1000000",
  elDiseasePolicyLimit: "1000000",
};

const COMMERCIAL_CARRIERS = [
  {
    id: COMMERCIAL_CARRIER_IDS.amerisure,
    name: "Amerisure",
    naic: "19488",
    writtenLines: ["GL"],
  },
  {
    id: COMMERCIAL_CARRIER_IDS.southernOwners,
    name: "Southern-Owners",
    naic: "10190",
    writtenLines: ["GL"],
  },
  {
    id: COMMERCIAL_CARRIER_IDS.ffva,
    name: "FFVA Mutual",
    naic: "10385",
    writtenLines: ["WC"],
  },
  {
    id: COMMERCIAL_CARRIER_IDS.amtrust,
    name: "AmTrust",
    naic: "42376",
    writtenLines: ["GL", "WC"],
  },
] as const;

type CommercialBusiness = {
  id: string;
  contactId: string;
  name: string;
  dba: string | null;
  industry: string;
  address1: string;
  city: string;
  zip: string;
  phone: string;
  principalFirst: string;
  principalLast: string;
  notes: string;
  policyCount: number;
};

const BOOK: CommercialBusiness[] = [
  {
    id: BUSINESS_IDS.harborKey,
    contactId: COMMERCIAL_CONTACT_IDS.harborKey,
    name: "Harbor Key Marine Services LLC",
    dba: "Harbor Key",
    industry: "Marina / marine services",
    address1: "4120 Overseas Highway",
    city: "Marathon",
    zip: "33050",
    phone: "305-555-0142",
    principalFirst: "Elena",
    principalLast: "Vargas",
    notes: "Active GL only. Issue a COI stub for slip, dock, or vendor holders.",
    policyCount: 1,
  },
  {
    id: BUSINESS_IDS.ruizTile,
    contactId: COMMERCIAL_CONTACT_IDS.ruizTile,
    name: "Ruiz Tile LLC",
    dba: "Ruiz Tile",
    industry: "Tile contractor",
    address1: "1884 Lipscomb Street",
    city: "Melbourne",
    zip: "32901",
    phone: "321-555-0188",
    principalFirst: "Marco",
    principalLast: "Ruiz",
    notes: "Active GL + WC. Typical GC / school-board certificate requests.",
    policyCount: 2,
  },
  {
    id: BUSINESS_IDS.vpPainting,
    contactId: COMMERCIAL_CONTACT_IDS.vpPainting,
    name: "VP Painting Inc",
    dba: "VP Painting",
    industry: "Painting contractor",
    address1: "755 Eau Gallie Boulevard",
    city: "Indian Harbour Beach",
    zip: "32937",
    phone: "321-555-0175",
    principalFirst: "Vanessa",
    principalLast: "Perez",
    notes: "Active GL + WC. Expired business auto stays off the certificate.",
    policyCount: 2,
  },
];

export async function seedCommercialBook() {
  for (const carrier of COMMERCIAL_CARRIERS) {
    await db
      .insert(carriers)
      .values({
        id: carrier.id,
        tenantId: TENANT_ID,
        name: carrier.name,
        naic: carrier.naic,
        writtenLines: [...carrier.writtenLines],
        portalStatus: "open",
        fixtureTag: "fl-commercial-coi-2026",
        active: true,
      })
      .onConflictDoUpdate({
        target: carriers.id,
        set: {
          name: carrier.name,
          naic: carrier.naic,
          writtenLines: [...carrier.writtenLines],
          fixtureTag: "fl-commercial-coi-2026",
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const row of BOOK) {
    await db
      .insert(contacts)
      .values({
        id: row.contactId,
        tenantId: TENANT_ID,
        firstName: row.principalFirst,
        lastName: row.principalLast,
        phone: row.phone,
        mailingAddress: row.address1,
        city: row.city,
        state: "FL",
        zip: row.zip,
        tenureStart: new Date("2024-01-15T12:00:00.000Z"),
        policyCount: row.policyCount,
        notes: `Principal for ${row.name}. Commercial book — not the Ana Dib HO3 shop.`,
      })
      .onConflictDoUpdate({
        target: contacts.id,
        set: {
          firstName: row.principalFirst,
          lastName: row.principalLast,
          phone: row.phone,
          mailingAddress: row.address1,
          city: row.city,
          state: "FL",
          zip: row.zip,
          policyCount: row.policyCount,
          notes: `Principal for ${row.name}. Commercial book — not the Ana Dib HO3 shop.`,
          updatedAt: new Date(),
        },
      });

    await db
      .insert(businesses)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        name: row.name,
        dba: row.dba,
        industry: row.industry,
        address1: row.address1,
        city: row.city,
        state: "FL",
        zip: row.zip,
        phone: row.phone,
        notes: row.notes,
        principalContactId: row.contactId,
      })
      .onConflictDoUpdate({
        target: businesses.id,
        set: {
          name: row.name,
          dba: row.dba,
          industry: row.industry,
          address1: row.address1,
          city: row.city,
          state: "FL",
          zip: row.zip,
          phone: row.phone,
          notes: row.notes,
          principalContactId: row.contactId,
          updatedAt: new Date(),
        },
      });
  }

  const policyRows = [
    {
      id: COMMERCIAL_POLICY_IDS.harborGl,
      contactId: COMMERCIAL_CONTACT_IDS.harborKey,
      businessId: BUSINESS_IDS.harborKey,
      carrierId: COMMERCIAL_CARRIER_IDS.amerisure,
      policyNumber: "AMS-GL-88421",
      lineOfBusiness: "GL",
      status: "active",
      effectiveDate: new Date("2026-03-01T05:00:00.000Z"),
      expirationDate: new Date("2027-03-01T05:00:00.000Z"),
      premium: "8420.00",
      coverageLimits: GL_LIMITS,
    },
    {
      id: COMMERCIAL_POLICY_IDS.ruizGl,
      contactId: COMMERCIAL_CONTACT_IDS.ruizTile,
      businessId: BUSINESS_IDS.ruizTile,
      carrierId: COMMERCIAL_CARRIER_IDS.southernOwners,
      policyNumber: "SO-CGL-44190",
      lineOfBusiness: "GL",
      status: "active",
      effectiveDate: new Date("2026-01-01T05:00:00.000Z"),
      expirationDate: new Date("2027-01-01T05:00:00.000Z"),
      premium: "6150.00",
      coverageLimits: GL_LIMITS,
    },
    {
      id: COMMERCIAL_POLICY_IDS.ruizWc,
      contactId: COMMERCIAL_CONTACT_IDS.ruizTile,
      businessId: BUSINESS_IDS.ruizTile,
      carrierId: COMMERCIAL_CARRIER_IDS.ffva,
      policyNumber: "FFVA-WC-22911",
      lineOfBusiness: "WC",
      status: "active",
      effectiveDate: new Date("2026-01-01T05:00:00.000Z"),
      expirationDate: new Date("2027-01-01T05:00:00.000Z"),
      premium: "4280.00",
      coverageLimits: WC_LIMITS,
    },
    {
      id: COMMERCIAL_POLICY_IDS.vpGl,
      contactId: COMMERCIAL_CONTACT_IDS.vpPainting,
      businessId: BUSINESS_IDS.vpPainting,
      carrierId: COMMERCIAL_CARRIER_IDS.amtrust,
      policyNumber: "AMT-GL-11028",
      lineOfBusiness: "GL",
      status: "active",
      effectiveDate: new Date("2026-04-15T04:00:00.000Z"),
      expirationDate: new Date("2027-04-15T04:00:00.000Z"),
      premium: "3890.00",
      coverageLimits: GL_LIMITS,
    },
    {
      id: COMMERCIAL_POLICY_IDS.vpWc,
      contactId: COMMERCIAL_CONTACT_IDS.vpPainting,
      businessId: BUSINESS_IDS.vpPainting,
      carrierId: COMMERCIAL_CARRIER_IDS.amtrust,
      policyNumber: "AMT-WC-11029",
      lineOfBusiness: "WC",
      status: "active",
      effectiveDate: new Date("2026-04-15T04:00:00.000Z"),
      expirationDate: new Date("2027-04-15T04:00:00.000Z"),
      premium: "2710.00",
      coverageLimits: WC_LIMITS,
    },
    {
      id: COMMERCIAL_POLICY_IDS.vpAutoExpired,
      contactId: COMMERCIAL_CONTACT_IDS.vpPainting,
      businessId: BUSINESS_IDS.vpPainting,
      carrierId: COMMERCIAL_CARRIER_IDS.amtrust,
      policyNumber: "PRG-BA-90811",
      lineOfBusiness: "AUTO",
      status: "expired",
      effectiveDate: new Date("2025-04-15T04:00:00.000Z"),
      expirationDate: new Date("2026-04-15T04:00:00.000Z"),
      premium: "1840.00",
      coverageLimits: null,
    },
  ];

  for (const row of policyRows) {
    await db
      .insert(policies)
      .values({
        ...row,
        tenantId: TENANT_ID,
      })
      .onConflictDoUpdate({
        target: policies.id,
        set: {
          contactId: row.contactId,
          businessId: row.businessId,
          carrierId: row.carrierId,
          policyNumber: row.policyNumber,
          lineOfBusiness: row.lineOfBusiness,
          status: row.status,
          effectiveDate: row.effectiveDate,
          expirationDate: row.expirationDate,
          premium: row.premium,
          coverageLimits: row.coverageLimits,
          updatedAt: new Date(),
        },
      });
  }

  const ruizDraft = buildCertificateDraft(
    [
      {
        id: COMMERCIAL_POLICY_IDS.ruizGl,
        lineOfBusiness: "GL",
        status: "active",
        policyNumber: "SO-CGL-44190",
        carrierName: "Southern-Owners",
        effectiveDate: new Date("2026-01-01T05:00:00.000Z"),
        expirationDate: new Date("2027-01-01T05:00:00.000Z"),
        coverageLimits: GL_LIMITS,
      },
      {
        id: COMMERCIAL_POLICY_IDS.ruizWc,
        lineOfBusiness: "WC",
        status: "active",
        policyNumber: "FFVA-WC-22911",
        carrierName: "FFVA Mutual",
        effectiveDate: new Date("2026-01-01T05:00:00.000Z"),
        expirationDate: new Date("2027-01-01T05:00:00.000Z"),
        coverageLimits: WC_LIMITS,
      },
    ],
    {
      holderName: "Brevard County School Board",
      holderAddress: "2700 Judge Fran Jamieson Way, Viera, FL 32940",
      jobLocation: "Palm Bay Elementary restroom tile remodel",
    },
    new Date("2026-08-12T15:00:00.000Z"),
  );
  if (!ruizDraft.ok) {
    throw new Error(`Commercial seed COI draft failed: ${ruizDraft.error}`);
  }

  await db
    .insert(issuedCertificates)
    .values({
      id: SEEDED_CERTIFICATE_IDS.ruizSchoolBoard,
      tenantId: TENANT_ID,
      businessId: BUSINESS_IDS.ruizTile,
      certificateNumber: nextCertificateNumber(0, new Date("2026-08-12T15:00:00.000Z")),
      holderName: ruizDraft.draft.holderName,
      holderAddress: ruizDraft.draft.holderAddress,
      jobLocation: ruizDraft.draft.jobLocation,
      lines: ruizDraft.draft.lines,
      producerName: "Garcia Personal Lines (demo)",
      issuedAt: new Date("2026-08-12T15:00:00.000Z"),
      status: "issued",
    })
    .onConflictDoUpdate({
      target: issuedCertificates.id,
      set: {
        certificateNumber: nextCertificateNumber(0, new Date("2026-08-12T15:00:00.000Z")),
        holderName: ruizDraft.draft.holderName,
        holderAddress: ruizDraft.draft.holderAddress,
        jobLocation: ruizDraft.draft.jobLocation,
        lines: ruizDraft.draft.lines,
        producerName: "Garcia Personal Lines (demo)",
        issuedAt: new Date("2026-08-12T15:00:00.000Z"),
        status: "issued",
      },
    });

  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(eq(alerts.entityId, BUSINESS_IDS.ruizTile));
  if (!existing) {
    await db.insert(alerts).values({
      tenantId: TENANT_ID,
      kind: "commercial_coi",
      title: "Commercial book · issue a COI stub",
      body: "Harbor Key (GL), Ruiz Tile (GL+WC), and VP Painting (GL+WC) are on the book. Open a Business and generate a certificate stub — not an ACORD form, no e-sign, no email.",
      severity: "info",
      entityType: "business",
      entityId: BUSINESS_IDS.ruizTile,
    });
  }
}
