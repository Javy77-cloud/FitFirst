import { eq } from "drizzle-orm";
import { appointmentLine, DEFAULT_TENANT_ID, type PriorAttempt } from "@/lib/domain";
import { db } from "@/lib/db";
import { appointedByCarrierLine } from "@/lib/db/queries";
import { appetiteRules, carriers, quoteAttemptLogs } from "@/lib/db/schema";
import { matchCarrier, rankFits, riskFromRecord, type CarrierMatch } from "./match";
import { toAppetiteInput } from "./rule-input";
import type { Risk } from "@/lib/db/schema";

export async function evaluateDealMarkets(risk: Risk): Promise<CarrierMatch[]> {
  const rules = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .innerJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID));

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID));

  const appointedMap = await appointedByCarrierLine();

  const prior: PriorAttempt[] = logs.map((log) => ({
    carrierId: log.carrierId,
    result: log.result as PriorAttempt["result"],
    why: log.why,
    bindable: log.bindable,
    snapYearBuilt: log.snapYearBuilt,
    snapRoofYear: log.snapRoofYear,
    snapRoofCovering: log.snapRoofCovering,
    snapConstruction: log.snapConstruction,
    snapCounty: log.snapCounty,
    snapMilesToCoast: log.snapMilesToCoast,
    snapCoverageA: log.snapCoverageA,
  }));

  return rankFits(
    rules.map(({ rule, carrier }) => {
      const line = appointmentLine(rule.lineOfBusiness);
      const key = `${carrier.id}:${line}`;
      const appointed = appointedMap.has(key) ? appointedMap.get(key)! : null;
      return matchCarrier(riskFromRecord(risk), toAppetiteInput(carrier, rule, appointed), prior);
    }),
  );
}
