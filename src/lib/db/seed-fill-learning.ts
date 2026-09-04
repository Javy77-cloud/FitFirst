import { eq } from "drizzle-orm";
import { db } from "./index";
import { fillLearningLogs } from "./schema";
import {
  ADMIN_NAME,
  ADMIN_USER_ID,
  ELENA_DEAL_ID,
  FILL_LEARNING_IDS,
  TENANT_ID,
} from "../fixtures/ids";

/** Seed HO mapping corrections on Elena. Does not touch Ana or her $321k Cov A. */
export async function seedFillLearning() {
  await db.delete(fillLearningLogs).where(eq(fillLearningLogs.tenantId, TENANT_ID));
  await db.insert(fillLearningLogs).values([
    {
      id: FILL_LEARNING_IDS.roofYear,
      tenantId: TENANT_ID,
      loggedAt: new Date("2026-08-12T15:10:00.000Z"),
      dealId: ELENA_DEAL_ID,
      docType: "wind_mit",
      fieldKey: "roof_year",
      extractedValue: "2014",
      correctedValue: "2019",
      correctedBy: ADMIN_NAME,
      correctedByUserId: ADMIN_USER_ID,
      note: "Wind mit year built bled into roof year. Roof is 2019.",
      shopLine: "home",
    },
    {
      id: FILL_LEARNING_IDS.construction,
      tenantId: TENANT_ID,
      loggedAt: new Date("2026-08-12T15:12:00.000Z"),
      dealId: ELENA_DEAL_ID,
      docType: "dec",
      fieldKey: "construction",
      extractedValue: "CBS",
      correctedValue: "masonry",
      correctedBy: ADMIN_NAME,
      correctedByUserId: ADMIN_USER_ID,
      note: "Dec CBS maps to masonry on the HO master sheet.",
      shopLine: "home",
    },
    {
      id: FILL_LEARNING_IDS.roofCovering,
      tenantId: TENANT_ID,
      loggedAt: new Date("2026-08-18T14:40:00.000Z"),
      dealId: ELENA_DEAL_ID,
      docType: "four_point",
      fieldKey: "roof_covering",
      extractedValue: "comp shingle",
      correctedValue: "architectural shingle",
      correctedBy: ADMIN_NAME,
      correctedByUserId: ADMIN_USER_ID,
      note: "4-point shorthand. Comp shingle is architectural on this book.",
      shopLine: "home",
    },
  ]);
}
