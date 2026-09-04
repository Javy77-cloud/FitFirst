import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { SEED_TOTP_SECRET } from "@/lib/auth/totp";
import { ADMIN_USER_ID, AGENT_USER_ID } from "@/lib/fixtures/ids";
import { db } from "./index";
import { users } from "./schema";

/** Javy + Maya: password hash + 2FA already enrolled so Mac desk-test is not gated. */
export async function seedMfaDemo() {
  const now = new Date();
  await db
    .update(users)
    .set({
      passwordHash: hashPassword("javy"),
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
      passwordHash: hashPassword("maya"),
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
