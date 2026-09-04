import { eq } from "drizzle-orm";
import { db } from "./index";
import { fillFeedbackLogs } from "./schema";
import { CARRIER_IDS, ELENA_DEAL_ID, FILL_FEEDBACK_IDS, TENANT_ID } from "@/lib/fixtures/ids";

/** Two demo correction rows — appetite-style, not a trained model. */
export async function seedFillFeedback() {
  await db.delete(fillFeedbackLogs).where(eq(fillFeedbackLogs.tenantId, TENANT_ID));
  await db.insert(fillFeedbackLogs).values([
    {
      id: FILL_FEEDBACK_IDS.roofCovering,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      docType: "wind_mit",
      fieldKey: "roof_covering",
      wrongValue: "shingle",
      correctedValue: "architectural shingle",
      reason: "agent_edit",
      line: "home",
      createdBy: "Maya Chen",
    },
    {
      id: FILL_FEEDBACK_IDS.hurricaneDed,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      docType: "dec",
      fieldKey: "hurricane_deductible",
      wrongValue: "2",
      correctedValue: "2%",
      reason: "paste_wrong",
      line: "home",
      createdBy: "Javy Rivera",
    },
  ]);
}
