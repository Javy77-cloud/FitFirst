import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { alerts, claimActivity, claimAttachments, claimNotes, claims, contacts, policies } from "./schema";
import {
  AGENT_USER_ID,
  CARRIER_IDS,
  CLAIM_ACTIVITY_IDS,
  CLAIM_ALERT_IDS,
  CLAIM_ATTACHMENT_IDS,
  CLAIM_IDS,
  CLAIM_NOTE_IDS,
  ELENA_CONTACT_ID,
  ELENA_POLICY_ID,
  OPP_CONTACT_IDS,
  OPP_POLICY_IDS,
  TENANT_ID,
} from "../fixtures/ids";

const RUIZ_HO_REPORTED = new Date("2026-08-28T16:30:00.000Z");
const RUIZ_HO_LOSS = new Date("2026-08-26T14:00:00.000Z");
const ELENA_REPORTED = new Date("2026-09-03T15:10:00.000Z");
const ELENA_LOSS = new Date("2026-09-02T18:40:00.000Z");
const HAIL_REPORTED = new Date("2026-04-12T16:00:00.000Z");
const HAIL_LOSS = new Date("2026-04-09T20:15:00.000Z");

const PLACEHOLDER_NAME = "kitchen-ceiling-stain.txt";
const PLACEHOLDER_TEXT = [
  "Placeholder kitchen photo for Camila Ruiz HO3 water claim.",
  "Supply-line leak under the sink; first-floor ceiling stain.",
  "This file lives on the Claim, not the shopping Deal and not the issued Policy.",
  "Desk log only — handle the claim on the American Integrity website.",
].join("\n");

/**
 * Additive book host for the claims log. Ana's 2026-09-02 shop is not touched.
 * Reuses the Opportunities Ruiz HO3 IDs so parallel slices share one contact.
 */
export async function seedClaimsBook() {
  await db
    .insert(contacts)
    .values({
      id: OPP_CONTACT_IDS.ruiz,
      tenantId: TENANT_ID,
      firstName: "Camila",
      lastName: "Ruiz",
      email: "camila.ruiz@example.com",
      phone: "321-555-0266",
      mailingAddress: "880 Croton Rd",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      ownerId: AGENT_USER_ID,
      tenureStart: new Date("2022-05-09T16:00:00.000Z"),
      policyCount: 1,
      notes: "In-force HO3. Claims log demo host — not the Ana Dib shop.",
    })
    .onConflictDoNothing();

  await db
    .update(contacts)
    .set({ ownerId: AGENT_USER_ID })
    .where(eq(contacts.id, OPP_CONTACT_IDS.ruiz));

  await db
    .insert(policies)
    .values({
      id: OPP_POLICY_IDS.ruizHo,
      tenantId: TENANT_ID,
      contactId: OPP_CONTACT_IDS.ruiz,
      carrierId: CARRIER_IDS.americanIntegrity,
      ownerId: AGENT_USER_ID,
      policyNumber: "AI-HO-66102",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2025-10-15T16:00:00.000Z"),
      expirationDate: new Date("2026-10-15T16:00:00.000Z"),
      premium: "3340.00",
      coverageA: 402000,
    })
    .onConflictDoNothing();

  await db
    .update(policies)
    .set({ ownerId: AGENT_USER_ID, contactId: OPP_CONTACT_IDS.ruiz })
    .where(eq(policies.id, OPP_POLICY_IDS.ruizHo));

  await db
    .insert(claims)
    .values({
      id: CLAIM_IDS.ruizHoWater,
      tenantId: TENANT_ID,
      policyId: OPP_POLICY_IDS.ruizHo,
      contactId: OPP_CONTACT_IDS.ruiz,
      dateReported: RUIZ_HO_REPORTED,
      dateOfLoss: RUIZ_HO_LOSS,
      causeType: "water",
      description: "Kitchen supply-line leak; stain on the first-floor ceiling.",
      reportedHow: "phone",
      carrierClaimNumber: "AI-CLM-19044",
      lossLocation: "880 Croton Rd, Melbourne FL 32935",
      reporterName: "Camila Ruiz",
      reporterPhone: "321-555-0266",
      producerId: AGENT_USER_ID,
      producerNotifiedAt: RUIZ_HO_REPORTED,
      status: "referred_to_carrier",
      createdAt: RUIZ_HO_REPORTED,
      updatedAt: RUIZ_HO_REPORTED,
    })
    .onConflictDoUpdate({
      target: claims.id,
      set: {
        policyId: OPP_POLICY_IDS.ruizHo,
        contactId: OPP_CONTACT_IDS.ruiz,
        dateReported: RUIZ_HO_REPORTED,
        dateOfLoss: RUIZ_HO_LOSS,
        causeType: "water",
        description: "Kitchen supply-line leak; stain on the first-floor ceiling.",
        reportedHow: "phone",
        carrierClaimNumber: "AI-CLM-19044",
        lossLocation: "880 Croton Rd, Melbourne FL 32935",
        reporterName: "Camila Ruiz",
        reporterPhone: "321-555-0266",
        producerId: AGENT_USER_ID,
        producerNotifiedAt: RUIZ_HO_REPORTED,
        status: "referred_to_carrier",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(claims)
    .values({
      id: CLAIM_IDS.inquiry,
      tenantId: TENANT_ID,
      policyId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      dateReported: ELENA_REPORTED,
      dateOfLoss: ELENA_LOSS,
      causeType: "wind",
      description: "Screen enclosure bent after an afternoon squall. No carrier number yet — send her to Citizens FNOL.",
      reportedHow: "phone",
      carrierClaimNumber: null,
      lossLocation: "Harbor Isle Dr, Melbourne FL",
      reporterName: "Elena Ruiz",
      reporterPhone: "321-555-0144",
      producerId: AGENT_USER_ID,
      producerNotifiedAt: ELENA_REPORTED,
      status: "inquiry",
      createdAt: ELENA_REPORTED,
      updatedAt: ELENA_REPORTED,
    })
    .onConflictDoUpdate({
      target: claims.id,
      set: {
        policyId: ELENA_POLICY_ID,
        contactId: ELENA_CONTACT_ID,
        dateReported: ELENA_REPORTED,
        dateOfLoss: ELENA_LOSS,
        causeType: "wind",
        description: "Screen enclosure bent after an afternoon squall. No carrier number yet — send her to Citizens FNOL.",
        reportedHow: "phone",
        carrierClaimNumber: null,
        lossLocation: "Harbor Isle Dr, Melbourne FL",
        reporterName: "Elena Ruiz",
        reporterPhone: "321-555-0144",
        producerId: AGENT_USER_ID,
        producerNotifiedAt: ELENA_REPORTED,
        status: "inquiry",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(claims)
    .values({
      id: CLAIM_IDS.closedHail,
      tenantId: TENANT_ID,
      policyId: OPP_POLICY_IDS.ruizHo,
      contactId: OPP_CONTACT_IDS.ruiz,
      dateReported: HAIL_REPORTED,
      dateOfLoss: HAIL_LOSS,
      causeType: "hail",
      description: "Rear-slope granule loss after April hail. Carrier closed it without payment.",
      reportedHow: "email",
      carrierClaimNumber: "AI-CLM-16220",
      lossLocation: "880 Croton Rd, Melbourne FL 32935",
      reporterName: "Camila Ruiz",
      reporterPhone: "321-555-0266",
      producerId: AGENT_USER_ID,
      producerNotifiedAt: HAIL_REPORTED,
      status: "closed",
      createdAt: HAIL_REPORTED,
      updatedAt: HAIL_REPORTED,
    })
    .onConflictDoUpdate({
      target: claims.id,
      set: {
        policyId: OPP_POLICY_IDS.ruizHo,
        contactId: OPP_CONTACT_IDS.ruiz,
        carrierClaimNumber: "AI-CLM-16220",
        status: "closed",
        producerId: AGENT_USER_ID,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(claimNotes)
    .values({
      id: CLAIM_NOTE_IDS.ruizHoWater,
      tenantId: TENANT_ID,
      claimId: CLAIM_IDS.ruizHoWater,
      body: "Camila called after the kitchen leak. Walked her to the American Integrity claims site and logged the carrier claim number she already had. We are not adjusting this.",
      postedBy: "Javy",
      createdAt: RUIZ_HO_REPORTED,
    })
    .onConflictDoUpdate({
      target: claimNotes.id,
      set: {
        body: "Camila called after the kitchen leak. Walked her to the American Integrity claims site and logged the carrier claim number she already had. We are not adjusting this.",
        postedBy: "Javy",
      },
    });

  const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  const storagePath = path.join(
    TENANT_ID,
    "claims",
    CLAIM_IDS.ruizHoWater,
    `${CLAIM_ATTACHMENT_IDS.ruizHoWater}-${PLACEHOLDER_NAME}`,
  );
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, PLACEHOLDER_TEXT, "utf8");

  await db
    .insert(claimAttachments)
    .values({
      id: CLAIM_ATTACHMENT_IDS.ruizHoWater,
      tenantId: TENANT_ID,
      claimId: CLAIM_IDS.ruizHoWater,
      filename: PLACEHOLDER_NAME,
      mimeType: "text/plain",
      storagePath,
      docType: "photo",
      createdAt: RUIZ_HO_REPORTED,
    })
    .onConflictDoUpdate({
      target: claimAttachments.id,
      set: {
        filename: PLACEHOLDER_NAME,
        mimeType: "text/plain",
        storagePath,
        docType: "photo",
      },
    });

  await db
    .insert(claimActivity)
    .values([
      {
        id: CLAIM_ACTIVITY_IDS.ruizOpened,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.ruizHoWater,
        eventType: "fnol_logged",
        body: "FNOL intake: water on AI-HO-66102 · Ruiz, Camila. Status: referred to carrier.",
        actor: "Javy",
        createdAt: RUIZ_HO_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.ruizNote,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.ruizHoWater,
        eventType: "note_added",
        body: "Javy posted a note.",
        actor: "Javy",
        createdAt: RUIZ_HO_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.ruizFile,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.ruizHoWater,
        eventType: "file_added",
        body: `Attached ${PLACEHOLDER_NAME} (photo).`,
        actor: "Javy",
        createdAt: RUIZ_HO_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.ruizNotified,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.ruizHoWater,
        eventType: "producer_notified",
        body: "In-app FNOL ping sent to the producer. FNOL · Ruiz, Camila · AI-HO-66102",
        actor: "Javy",
        createdAt: RUIZ_HO_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.elenaOpened,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.inquiry,
        eventType: "fnol_logged",
        body: "FNOL intake: wind on HO3-ELENA-2026 · Ruiz, Elena. Status: inquiry.",
        actor: "Javy",
        createdAt: ELENA_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.elenaNotified,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.inquiry,
        eventType: "producer_notified",
        body: "In-app FNOL ping sent to the producer. FNOL · Ruiz, Elena · HO3-ELENA-2026",
        actor: "Javy",
        createdAt: ELENA_REPORTED,
      },
      {
        id: CLAIM_ACTIVITY_IDS.hailClosed,
        tenantId: TENANT_ID,
        claimId: CLAIM_IDS.closedHail,
        eventType: "status_changed",
        body: "Status referred to carrier → closed.",
        actor: "Javy",
        createdAt: HAIL_REPORTED,
      },
    ])
    .onConflictDoNothing();

  await db.delete(alerts).where(eq(alerts.id, CLAIM_ALERT_IDS.ruizMaya));
  await db.delete(alerts).where(eq(alerts.id, CLAIM_ALERT_IDS.elenaMaya));
  await db.insert(alerts).values([
    {
      id: CLAIM_ALERT_IDS.ruizMaya,
      tenantId: TENANT_ID,
      kind: "fnol",
      title: "FNOL · Ruiz, Camila · AI-HO-66102",
      body: "Water notice is referred to carrier. Carrier claim AI-CLM-19044. In-desk only — handle FNOL on the carrier site.",
      severity: "info",
      entityType: "claim",
      entityId: CLAIM_IDS.ruizHoWater,
      userId: AGENT_USER_ID,
      recipientUserId: AGENT_USER_ID,
      createdAt: RUIZ_HO_REPORTED,
    },
    {
      id: CLAIM_ALERT_IDS.elenaMaya,
      tenantId: TENANT_ID,
      kind: "fnol",
      title: "FNOL · Ruiz, Elena · HO3-ELENA-2026",
      body: "Wind notice is inquiry. In-desk only — handle FNOL on the carrier site.",
      severity: "warning",
      entityType: "claim",
      entityId: CLAIM_IDS.inquiry,
      userId: AGENT_USER_ID,
      recipientUserId: AGENT_USER_ID,
      createdAt: ELENA_REPORTED,
    },
  ]);
}
