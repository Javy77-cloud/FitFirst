"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import {
  assertSiteDeveloperSession,
  SignInRequiredError,
} from "@/lib/developer/site-developer";
import {
  ensurePartition,
  findFlHoPartitionId,
  scorePartition,
} from "@/lib/appetite/engine";
import { flashAction } from "@/lib/flash-action";

const ENGINE_HREF = "/settings/developer/appetite-engine";

async function requireSiteDeveloper() {
  const session = await currentDeskSession();
  assertSiteDeveloperSession(session);
  return session;
}

function denyEngineMutate(error: unknown): never {
  const message = error instanceof SignInRequiredError ? error.message : "Site developer only.";
  flashAction(ENGINE_HREF, message, "error");
}

/** Developer Hub: ensure FL/HO partition + seed Standing rules. */
export async function ensureFlHoPartitionAction() {
  try {
    await requireSiteDeveloper();
  } catch (error) {
    denyEngineMutate(error);
  }
  const partition = await ensurePartition("FL", "HO");
  revalidatePath(ENGINE_HREF);
  flashAction(
    ENGINE_HREF,
    `FL/HO partition ready (${partition.status}).`,
  );
}

/** Developer Hub button: Run shadow accuracy for FL/HO (no auto-cron). */
export async function runFlHoShadowAccuracyAction() {
  try {
    await requireSiteDeveloper();
  } catch (error) {
    denyEngineMutate(error);
  }

  const partitionId = await findFlHoPartitionId();
  const result = await scorePartition(partitionId);
  revalidatePath(ENGINE_HREF);

  if (result.graduated) {
    flashAction(
      ENGINE_HREF,
      `FL/HO graduated to live — accuracy ${pct(result.accuracyPct)} over ${result.scoredShops} scored shops.`,
    );
  }

  flashAction(
    ENGINE_HREF,
    `Shadow accuracy: ${pct(result.accuracyPct)} (${result.scoredShops} scored, +${result.considered} this run, ${result.skipped} skipped).`,
  );
}

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
