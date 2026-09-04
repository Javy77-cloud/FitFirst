import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { SEED_TOTP_SECRET } from "@/lib/auth/totp";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { db } from "./index";
import { users } from "./schema";

const MFA_SEED = {
  mfaEnrolled: true,
  mfaMethod: "totp",
  mfaSecret: SEED_TOTP_SECRET,
  mfaDemoBypass: true,
} as const;

/** Javy + Maya: password hash + 2FA already enrolled so Mac desk-test is not gated. */
export async function seedMfaDemo() {
  const now = new Date();
  await db
    .update(users)
    .set({
      passwordHash: hashPassword("javy"),
      ...MFA_SEED,
      updatedAt: now,
    })
    .where(eq(users.id, ADMIN_USER_ID));
  await db
    .update(users)
    .set({
      passwordHash: hashPassword("maya"),
      ...MFA_SEED,
      updatedAt: now,
    })
    .where(eq(users.id, AGENT_USER_ID));
}
