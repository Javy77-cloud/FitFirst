import { eq } from "drizzle-orm";
import { optionalLocalSeedPasswordHash } from "@/lib/auth/seed-password";
import { SEED_TOTP_SECRET } from "@/lib/auth/totp";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { db } from "./index";
import { users } from "./schema";

/** Enroll 2FA on the seeded Admin and Agent. Password hashes come only from local env, never a baked-in password. */
export async function seedMfaDemo() {
  const now = new Date();
  const adminHash = optionalLocalSeedPasswordHash("DEV_ADMIN_PASSWORD");
  const agentHash = optionalLocalSeedPasswordHash("DEV_AGENT_PASSWORD");
  await db
    .update(users)
    .set({
      ...(adminHash ? { passwordHash: adminHash } : {}),
      mfaEnrolled: true,
      mustEnrollMfa: false,
      mfaMethod: "totp",
      totpSecret: SEED_TOTP_SECRET,
      mfaSecret: SEED_TOTP_SECRET,
      mfaDemoBypass: true,
      updatedAt: now,
    })
    .where(eq(users.id, ADMIN_USER_ID));
  await db
    .update(users)
    .set({
      ...(agentHash ? { passwordHash: agentHash } : {}),
      mfaEnrolled: true,
      mustEnrollMfa: false,
      mfaMethod: "email",
      mfaEmail: "maya@fitfirst.local",
      totpSecret: SEED_TOTP_SECRET,
      mfaSecret: SEED_TOTP_SECRET,
      mfaDemoBypass: true,
      updatedAt: now,
    })
    .where(eq(users.id, AGENT_USER_ID));
}
