import { COMMISSION_RECON_IDS, DEMO_COMMISSION, EARNINGS_COMMISSION, TENANT_ID } from "../fixtures/ids";
import { deriveReconStatus, money2, reconVariance } from "../commissions/reconcile";
import { db } from "./index";
import { commissionReconciliations, commissions } from "./schema";

/**
 * Manual expected-vs-received catch on the existing book.
 * No carrier download. Ana is not in this set — she stays $0 / unbound.
 */
const SHORTFALLS = [
  {
    id: COMMISSION_RECON_IDS.shahHo,
    commissionId: DEMO_COMMISSION.shahHo,
    received: 180,
    explicit: "short" as const,
    note: "American Traditions statement came in $35.60 light on Shah HO. Catch by hand — no carrier download.",
  },
  {
    id: COMMISSION_RECON_IDS.haleHo,
    commissionId: DEMO_COMMISSION.haleHo,
    received: 198,
    explicit: "short" as const,
    note: "People's Trust paid $198 against $262.08 on Hale HO. Manual short.",
  },
  {
    id: COMMISSION_RECON_IDS.harborGl,
    commissionId: EARNINGS_COMMISSION.harborGl,
    received: 250,
    explicit: "short" as const,
    note: "Agentero GL remittance $250 against $318.12. Short $68.12.",
  },
  {
    id: COMMISSION_RECON_IDS.ruizHo,
    commissionId: EARNINGS_COMMISSION.ruizHo,
    received: 0,
    explicit: "disputed" as const,
    note: "AFA August statement missing Elena Ruiz HO. Disputed until the carrier resends. Not Ana — Ana stays $0 / unbound.",
  },
] as const;

const MATCHED_PAID = new Set<string>([
  DEMO_COMMISSION.bellAuto,
  DEMO_COMMISSION.javyQ2,
  DEMO_COMMISSION.reedAuto,
  EARNINGS_COMMISSION.ruizAuto,
  EARNINGS_COMMISSION.harborBop,
]);

const STABLE_IDS: Record<string, string> = {
  [DEMO_COMMISSION.haleHo]: COMMISSION_RECON_IDS.haleHo,
  [DEMO_COMMISSION.bellAuto]: COMMISSION_RECON_IDS.bellAuto,
  [DEMO_COMMISSION.bellFlood]: COMMISSION_RECON_IDS.bellFlood,
  [DEMO_COMMISSION.javyQ2]: COMMISSION_RECON_IDS.javyQ2,
  [DEMO_COMMISSION.shahHo]: COMMISSION_RECON_IDS.shahHo,
  [DEMO_COMMISSION.reedAuto]: COMMISSION_RECON_IDS.reedAuto,
  [DEMO_COMMISSION.reedFlood]: COMMISSION_RECON_IDS.reedFlood,
  [EARNINGS_COMMISSION.ruizHo]: COMMISSION_RECON_IDS.ruizHo,
  [EARNINGS_COMMISSION.ruizAuto]: COMMISSION_RECON_IDS.ruizAuto,
  [EARNINGS_COMMISSION.harborGl]: COMMISSION_RECON_IDS.harborGl,
  [EARNINGS_COMMISSION.harborBop]: COMMISSION_RECON_IDS.harborBop,
};

export async function seedCommissionReconciliations() {
  const rows = await db
    .select({
      id: commissions.id,
      agentId: commissions.agentId,
      policyId: commissions.policyId,
      amount: commissions.amount,
      status: commissions.status,
    })
    .from(commissions);

  const overrideByCommission = new Map(SHORTFALLS.map((row) => [row.commissionId, row]));

  for (const commission of rows) {
    const expected = money2(Number(commission.amount ?? 0));
    const override = overrideByCommission.get(commission.id);
    const received = override ? override.received : MATCHED_PAID.has(commission.id) ? expected : 0;
    const paid = commission.status === "paid";
    const status = deriveReconStatus({
      expected,
      received,
      explicit: override?.explicit ?? (paid && received >= expected ? "earned" : null),
      paid,
    });
    const variance = reconVariance(expected, received);
    const id = STABLE_IDS[commission.id];
    const values = {
      tenantId: TENANT_ID,
      commissionId: commission.id,
      policyId: commission.policyId,
      agentId: commission.agentId,
      expectedAmount: expected.toFixed(2),
      receivedAmount: received.toFixed(2),
      variance: variance.toFixed(2),
      status,
      note: override?.note ?? null,
      markedBy: override ? commission.agentId : null,
      markedAt: override ? new Date("2026-09-02T16:00:00.000Z") : null,
      updatedAt: new Date(),
    };

    if (id) {
      await db
        .insert(commissionReconciliations)
        .values({ id, ...values })
        .onConflictDoUpdate({
          target: commissionReconciliations.id,
          set: values,
        });
    } else {
      await db
        .insert(commissionReconciliations)
        .values(values)
        .onConflictDoUpdate({
          target: [commissionReconciliations.tenantId, commissionReconciliations.commissionId],
          set: values,
        });
    }
  }
}
