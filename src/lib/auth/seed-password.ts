import { hashPassword } from "@/lib/auth/password";
import { isFitFirstProduction } from "@/lib/auth/production";

/**
 * Optional local seed hash from an env var. Production seeds never write a password.
 * Unset env leaves the column alone so a live book is not given a known password.
 */
export function optionalLocalSeedPasswordHash(envKey: string): string | null {
  if (isFitFirstProduction()) return null;
  const raw = process.env[envKey]?.trim();
  if (!raw) return null;
  return hashPassword(raw);
}
