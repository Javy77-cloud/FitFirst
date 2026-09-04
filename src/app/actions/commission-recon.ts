"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import {
  deriveReconStatus,
  isReconStatus,
  parseReceivedAmount,
  reconVariance,
} from "@/lib/commissions/reconcile";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionEvents, commissionReconciliations, commissions } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function writeRecon(opts: {
  reconId: string;
  actorId: string;
  received?: number;
  status?: string;
  note?: string;
}) {
  const [current] = await db
    .select({
      recon: commissionReconciliations,
      payoutStatus: commissions.status,
    })
    .from(commissionReconciliations)
    .innerJoin(commissions, eq(commissionReconciliations.commissionId, commissions.id))
    .where(
      and(
        eq(commissionReconciliations.id, opts.reconId),
        eq(commissionReconciliations.tenantId, DEFAULT_TENANT_ID),
      ),
    );
  if (!current) return { error: "Reconciliation row not found." };

  const expected = Number(current.recon.expectedAmount ?? 0);
  const received = opts.received ?? Number(current.recon.receivedAmount ?? 0);
  const explicit = opts.status ?? current.recon.status;
  const status = deriveReconStatus({
    expected,
    received,
    explicit,
    paid: current.payoutStatus === "paid",
  });
  const variance = reconVariance(expected, received);
  const now = new Date();

  await db
    .update(commissionReconciliations)
    .set({
      receivedAmount: received.toFixed(2),
      variance: variance.toFixed(2),
      status,
      note: opts.note !== undefined ? opts.note : current.recon.note,
      markedBy: opts.actorId,
      markedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(commissionReconciliations.id, opts.reconId),
        eq(commissionReconciliations.tenantId, DEFAULT_TENANT_ID),
      ),
    );

  await db.insert(commissionEvents).values({
    tenantId: DEFAULT_TENANT_ID,
    commissionId: current.recon.commissionId,
    actorId: opts.actorId,
    fromStatus: current.recon.status,
    toStatus: status,
    note:
      opts.note ||
      `Recon ${current.recon.status} → ${status}. Expected ${expected.toFixed(2)}, received ${received.toFixed(2)}.`,
  });

  revalidatePath("/commissions");
  revalidatePath("/");
  return { ok: true as const, status };
}

export async function recordReconReceived(formData: FormData) {
  const session = await requireAdminAction("Only Admin can record a remittance.");
  const reconId = str(formData, "reconId");
  const received = parseReceivedAmount(str(formData, "received"));
  if (!reconId || received == null) return { error: "Enter a received amount of $0 or more." };
  const note = str(formData, "note");
  return writeRecon({
    reconId,
    actorId: session.userId ?? "",
    received,
    note: note || undefined,
    status: received === 0 ? "pending" : undefined,
  });
}

export async function markReconStatus(formData: FormData) {
  const session = await requireAdminAction("Only Admin can mark short or disputed.");
  const reconId = str(formData, "reconId");
  const status = str(formData, "status");
  if (!reconId || !isReconStatus(status)) return { error: "Pick a reconciliation status." };
  const note = str(formData, "note");
  const receivedRaw = str(formData, "received");
  const received = receivedRaw === "" ? undefined : parseReceivedAmount(receivedRaw);
  if (receivedRaw !== "" && received == null) return { error: "Enter a received amount of $0 or more." };

  let nextReceived = received;
  if (status === "matched" || status === "earned") {
    const [row] = await db
      .select({ expected: commissionReconciliations.expectedAmount })
      .from(commissionReconciliations)
      .where(
        and(
          eq(commissionReconciliations.id, reconId),
          eq(commissionReconciliations.tenantId, DEFAULT_TENANT_ID),
        ),
      );
    if (row && nextReceived == null) nextReceived = Number(row.expected ?? 0);
  }

  return writeRecon({
    reconId,
    actorId: session.userId ?? "",
    received: nextReceived,
    status,
    note: note || undefined,
  });
}
