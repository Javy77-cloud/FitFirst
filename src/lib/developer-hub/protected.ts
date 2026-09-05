import { CONTACT_ID, DEAL_ID, LEAD_ID, RISK_ID } from "@/lib/fixtures/ids";

const ANA_RECORD_IDS = new Set([LEAD_ID, CONTACT_ID, DEAL_ID, RISK_ID]);

export function isProtectedAnaRecord(id: string): boolean {
  return ANA_RECORD_IDS.has(id);
}

export function anaSkipMessage(): string {
  return "Ana Dib HO3 stays shopping / unbound / Cov A $321,000. Macro skipped this record.";
}
