import type { HealthSherpaParsedPayload } from "./payload";

/**
 * HealthSherpa docs / webhook-setup samples and FitFirst probe payloads that
 * previously minted real Policies list rows in production. Never write these
 * to Policies/contacts unless HEALTHSHERPA_ALLOW_TEST_PAYLOADS=1 and the
 * runtime is not Vercel production.
 */

const BLOCKED_NAME_PAIRS = new Set([
  "test|enrollment",
  "test|webhook",
  "probe|user",
  "sample|payload",
]);

const BLOCKED_EMAILS = new Set([
  "test.enrollment@example.com",
  "test.webhook@example.com",
  "sample.payload@example.com",
  "a@b.com",
]);

const BLOCKED_APPLICATION_IDS = new Set([
  "ccf19b98-375f-4467-87f4-a47c977359ee", // docs.medicare.healthsherpa.com sample
  "3de33a7a-b8d7-4f22-94d4-9984065eafcf",
  "hs-test-app-001",
  "sample-app-crm",
  "probe",
  "app-2",
]);

const BLOCKED_CONFIRMATIONS = new Set(["a92946987696546m", "conf123", "conf999", "p1", "c2"]);

const BLOCKED_HS_CONTACT_IDS = new Set([
  "8b420678-2c58-4f56-9c0b-9ccb605e5e85", // docs sample contact id
  "hs-test-contact-001",
  "hs-contact-sample",
  "651a009d-424c-4ec7-a1a1-5dc2e7a2fb7e",
  "2c16d772-b4b8-45c1-b9fe-23ce670f43fa",
]);

const BLOCKED_MEDICARE_NUMBERS = new Set(["1eg4te5mk73"]);

function norm(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function nameKey(first: string, last: string): string {
  return `${norm(first)}|${norm(last)}`;
}

/** True when env explicitly allows writing demo/test HealthSherpa payloads (never on Vercel prod). */
export function allowHealthSherpaTestPayloadWrites(): boolean {
  if (process.env.HEALTHSHERPA_ALLOW_TEST_PAYLOADS !== "1") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

/**
 * Detect HealthSherpa docs samples, webhook-setup probes, and known FitFirst
 * test names that must not land on the main Policies list.
 */
export function isHealthSherpaTestOrSamplePayload(parsed: HealthSherpaParsedPayload): boolean {
  const first = parsed.contact.firstName;
  const last = parsed.contact.lastName;
  const email = norm(parsed.contact.email);
  const appId = norm(parsed.applicationId);
  const conf = norm(parsed.confirmationNumber);
  const hsContactId = norm(parsed.contact.hsContactId);
  const medicare = norm(parsed.contact.medicareNumber);

  if (BLOCKED_NAME_PAIRS.has(nameKey(first, last))) return true;
  if (email && BLOCKED_EMAILS.has(email)) return true;
  if (appId && BLOCKED_APPLICATION_IDS.has(appId)) return true;
  if (hsContactId && BLOCKED_HS_CONTACT_IDS.has(hsContactId)) return true;
  if (medicare && BLOCKED_MEDICARE_NUMBERS.has(medicare)) return true;

  // "A B" alone is too short — require another known probe marker.
  if (nameKey(first, last) === "a|b") {
    if (email === "a@b.com" || appId === "app-2" || conf === "c2") return true;
  }

  if (conf && BLOCKED_CONFIRMATIONS.has(conf)) {
    // Short confirmations (P1/C2) only when name/email/app also look like probes.
    if (conf === "p1" || conf === "c2") {
      const probeName =
        nameKey(first, last) === "probe|user" ||
        nameKey(first, last) === "a|b" ||
        email === "a@b.com" ||
        appId === "probe" ||
        appId === "app-2";
      if (probeName) return true;
    } else {
      return true;
    }
  }

  // Docs sample external_id paired with Test Enrollment / sample email.
  if (norm(parsed.contact.externalId) === "crm789012") {
    if (
      BLOCKED_NAME_PAIRS.has(nameKey(first, last)) ||
      email === "test.enrollment@example.com" ||
      email === "sample.payload@example.com"
    ) {
      return true;
    }
  }

  return false;
}
