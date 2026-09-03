import type { EmailLocale } from "@/lib/domain";

/** Spanish → ES. English, Haitian Creole, or blank → EN. */
export function pickEmailLocale(preferredLanguage: string | null | undefined): EmailLocale {
  const raw = (preferredLanguage ?? "").trim().toLowerCase();
  if (!raw) return "en";
  if (raw === "es" || raw.startsWith("spanish") || raw.startsWith("español") || raw.startsWith("espanol")) {
    return "es";
  }
  return "en";
}

export function isProtectedAnaContact(input: {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): boolean {
  const first = (input.firstName ?? "").trim().toLowerCase();
  const last = (input.lastName ?? "").trim().toLowerCase();
  if (first === "ana" && last === "dib") return true;
  const email = (input.email ?? "").trim().toLowerCase();
  if (email.includes("ana.dib") || email.includes("ana-dib")) return true;
  return false;
}
