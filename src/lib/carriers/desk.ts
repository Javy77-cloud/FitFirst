import { CARRIER_IDS } from "@/lib/fixtures/ids";

type CarrierKey = keyof typeof CARRIER_IDS;

export type CarrierDeskContact = {
  portalLogin: string;
  customerServicePhone: string;
  agentPhone: string;
  website: string;
  agentPortalUrl: string;
  carrierInfo: string;
};

/** Desk book for the seeded shop carriers. Ana fixture is not the source — do not edit that JSON. */
export const CARRIER_DESK: Record<CarrierKey, CarrierDeskContact> = {
  tailrow: {
    portalLogin: "Harmony",
    customerServicePhone: "888-813-8376",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.tailrow.com",
    agentPortalUrl: "https://harmony.tailrow.com",
    carrierInfo: "HO on Harmony. TypTap is the same login — not a second carrier.",
  },
  hoc: {
    portalLogin: "Harmony (service / takeout)",
    customerServicePhone: "877-861-6742",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.hci-group.com",
    agentPortalUrl: "https://harmony.hci-group.com",
    carrierInfo: "Homeowners Choice. Voluntary NB closed; Harmony service account only.",
  },
  vyrd: {
    portalLogin: "VYRD takeout",
    customerServicePhone: "844-208-8973",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.vyrdins.com",
    agentPortalUrl: "https://agents.vyrdins.com",
    carrierInfo: "Citizens takeout only. No voluntary new business.",
  },
  qbe: {
    portalLogin: "Swyfft",
    customerServicePhone: "877-346-6585",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.qbe.com/us",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "QBE homeowners via Swyfft. AFA paper.",
  },
  vave: {
    portalLogin: "Swyfft",
    customerServicePhone: "800-221-3880",
    agentPhone: "Agentero · 888-982-7950",
    website: "https://www.lloyds.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "VAVE / Lloyd's surplus via Swyfft. Agentero paper.",
  },
  benchmark: {
    portalLogin: "Swyfft",
    customerServicePhone: "866-568-4100",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.benchmarkinsurancesolutions.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "Benchmark HO via Swyfft. Same shop as Hadron.",
  },
  hadron: {
    portalLogin: "Swyfft",
    customerServicePhone: "888-423-7661",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.hadroninsurance.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "Hadron HO via Swyfft. First Connect paper.",
  },
  geovera: {
    portalLogin: "GeoVera agent",
    customerServicePhone: "800-220-1351",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.geovera.com",
    agentPortalUrl: "https://agents.geovera.com",
    carrierInfo: "GeoVera specialty HO. Will not drop Cov A below that house's RCE.",
  },
  sagesure: {
    portalLogin: "SageSure",
    customerServicePhone: "888-32-SAGE-1",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.sagesure.com",
    agentPortalUrl: "https://agents.sagesure.com",
    carrierInfo: "SageSure (Markel). Published min Cov A $100k in named counties.",
  },
  americanIntegrity: {
    portalLogin: "AIC agent",
    customerServicePhone: "866-277-9871",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.aiicfl.com",
    agentPortalUrl: "https://agents.aiicfl.com",
    carrierInfo: "American Integrity. Quote at requested Cov A is not automatically bindable.",
  },
};

export const CARRIER_TABLE_COLUMNS = [
  { id: "portalLogin", label: "Portal login", defaultVisible: true },
  { id: "customerServicePhone", label: "Customer-service phone", defaultVisible: true },
  { id: "agentPhone", label: "Agent phone", defaultVisible: true },
  { id: "website", label: "Website / agent portal", defaultVisible: true },
  { id: "carrierInfo", label: "Carrier info", defaultVisible: true },
  { id: "appointments", label: "Appointments", defaultVisible: false },
] as const;

export type CarrierTableColumnId = (typeof CARRIER_TABLE_COLUMNS)[number]["id"];

export function defaultColumnVisibility(): Record<CarrierTableColumnId, boolean> {
  return Object.fromEntries(
    CARRIER_TABLE_COLUMNS.map((col) => [col.id, col.defaultVisible]),
  ) as Record<CarrierTableColumnId, boolean>;
}
