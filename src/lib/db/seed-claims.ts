import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./index";
import { claimActivity, claimAttachments, claimNotes, claims, contacts, policies } from "./schema";
import {
  CARRIER_IDS,
  CLAIM_ACTIVITY_IDS,
  CLAIM_ATTACHMENT_IDS,
  CLAIM_IDS,
  CLAIM_NOTE_IDS,
  OPP_CONTACT_IDS,
  OPP_POLICY_IDS,
  TENANT_ID,
} from "../fixtures/ids";

const RUIZ_HO_REPORTED = new Date("2026-08-28T16:30:00.000Z");
const RUIZ_HO_LOSS = new Date("2026-08-26T14:00:00.000Z");

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
      tenureStart: new Date("2022-05-09T16:00:00.000Z"),
      policyCount: 1,
      notes: "In-force HO3. Claims log demo host — not the Ana Dib shop.",
    })
    .onConflictDoNothing();

  await db
    .insert(policies)
    .values({
      id: OPP_POLICY_IDS.ruizHo,
      tenantId: TENANT_ID,
      contactId: OPP_CONTACT_IDS.ruiz,
      carrierId: CARRIER_IDS.americanIntegrity,
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
    .insert(claims)
    .values({
      id: CLAIM_IDS.ruizHoWater,
      tenantId: TENANT_ID,
      policyId: OPP_POLICY_IDS.ruizHo,
      dateReported: RUIZ_HO_REPORTED,
      dateOfLoss: RUIZ_HO_LOSS,
      causeType: "water",
      description: "Kitchen supply-line leak; stain on the first-floor ceiling.",
      reportedHow: "phone",
      carrierClaimNumber: "AI-CLM-19044",
      status: "referred_to_carrier",
      createdAt: RUIZ_HO_REPORTED,
      updatedAt: RUIZ_HO_REPORTED,
    })
    .onConflictDoUpdate({
      target: claims.id,
      set: {
        policyId: OPP_POLICY_IDS.ruizHo,
        dateReported: RUIZ_HO_REPORTED,
        dateOfLoss: RUIZ_HO_LOSS,
        causeType: "water",
        description: "Kitchen supply-line leak; stain on the first-floor ceiling.",
        reportedHow: "phone",
        carrierClaimNumber: "AI-CLM-19044",
        status: "referred_to_carrier",
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
        eventType: "opened",
        body: "Logged water notice on AI-HO-66102. Status: referred to carrier.",
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
    ])
    .onConflictDoNothing();
}
