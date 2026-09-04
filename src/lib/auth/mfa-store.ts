import { and, desc, eq, isNull } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { mfaChallenges } from "@/lib/db/schema";

export async function latestStubChallenge(userId: string) {
  const [row] = await db
    .select()
    .from(mfaChallenges)
    .where(
      and(
        eq(mfaChallenges.tenantId, DEFAULT_TENANT_ID),
        eq(mfaChallenges.userId, userId),
        isNull(mfaChallenges.consumedAt),
      ),
    )
    .orderBy(desc(mfaChallenges.createdAt))
    .limit(1);
  return row ?? null;
}
