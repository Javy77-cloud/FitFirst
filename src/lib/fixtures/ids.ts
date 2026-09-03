import { DEFAULT_TENANT_ID } from "@/lib/domain";

export const TENANT_ID = DEFAULT_TENANT_ID;

export const LEAD_ID = "22222222-2222-4222-8222-222222222221";
export const CONTACT_ID = "22222222-2222-4222-8222-222222222224";
export const DEAL_ID = "22222222-2222-4222-8222-222222222222";
export const RISK_ID = "22222222-2222-4222-8222-222222222223";

export const DESK_AGENT_IDS = {
  admin: "44444444-4444-4444-8444-444444444401",
  javy: "44444444-4444-4444-8444-444444444402",
  producer: "44444444-4444-4444-8444-444444444403",
} as const;

export const SEEDED_DESK_AGENTS = [
  { id: DESK_AGENT_IDS.admin, slug: "admin", displayName: "Agency admin", role: "admin" },
  { id: DESK_AGENT_IDS.javy, slug: "javy", displayName: "Javy Garcia", role: "agent" },
  { id: DESK_AGENT_IDS.producer, slug: "producer", displayName: "Desk producer", role: "agent" },
] as const;

export const CARRIER_IDS = {
  qbe: "33333333-3333-4333-8333-333333333301",
  benchmark: "33333333-3333-4333-8333-333333333302",
  hadron: "33333333-3333-4333-8333-333333333303",
  hoc: "33333333-3333-4333-8333-333333333304",
  vyrd: "33333333-3333-4333-8333-333333333305",
  tailrow: "33333333-3333-4333-8333-333333333306",
  geovera: "33333333-3333-4333-8333-333333333307",
  sagesure: "33333333-3333-4333-8333-333333333308",
  americanIntegrity: "33333333-3333-4333-8333-333333333309",
  vave: "33333333-3333-4333-8333-333333333310",
} as const;
