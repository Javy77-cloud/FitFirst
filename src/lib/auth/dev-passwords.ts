import { isFitFirstProduction } from "@/lib/auth/production";

/**
 * Local desk passwords for machines that are not production.
 * NODE_ENV=production and VERCEL_ENV=production ignore this map entirely.
 * A stored password hash is the only login path in production.
 */
const LOCAL_TEST_PASSWORDS: Record<string, string> = {
  "javy@fitfirst.local": "javy",
  "maya@fitfirst.local": "maya",
  "javier@fitfirst.local": "javier",
  "logan@fitfirst.local": "logan",
};

export function localTestPasswordMatches(email: string, password: string): boolean {
  if (isFitFirstProduction()) return false;
  if (!password) return false;
  const expected = LOCAL_TEST_PASSWORDS[email.trim().toLowerCase()];
  if (!expected) return false;
  return password === expected;
}
