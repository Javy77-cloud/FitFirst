import { CARRIER_IDS } from "@/lib/fixtures/ids";

type CarrierKey = keyof typeof CARRIER_IDS;

export type CarrierDeskContact = {
  portalLogin: string;
  customerServicePhone: string;
  agentPhone: string;
  website: string;
  agentPortalUrl: string;
  carrierInfo: string;
  naic?: string;
  amBestRating?: string;
  underwriterName?: string;
  underwriterEmail?: string;
  underwriterPhone?: string;
  accountManagerName?: string;
  accountManagerEmail?: string;
  accountManagerPhone?: string;
  claimsPhone?: string;
  billingPhone?: string;
  newBusinessCommPct?: string;
  renewalCommPct?: string;
  territory?: string;
  preferredSubmission?: string;
  bindingAuthority?: string;
  appetiteNotes?: string;
};

function deskExtras(partial: Partial<CarrierDeskContact> = {}): Pick<
  CarrierDeskContact,
  | "naic"
  | "amBestRating"
  | "underwriterName"
  | "underwriterEmail"
  | "underwriterPhone"
  | "accountManagerName"
  | "accountManagerEmail"
  | "accountManagerPhone"
  | "claimsPhone"
  | "billingPhone"
  | "newBusinessCommPct"
  | "renewalCommPct"
  | "territory"
  | "preferredSubmission"
  | "bindingAuthority"
  | "appetiteNotes"
> {
  return {
    naic: partial.naic ?? "—",
    amBestRating: partial.amBestRating ?? "A-",
    underwriterName: partial.underwriterName ?? "Desk UW",
    underwriterEmail: partial.underwriterEmail ?? "uw@carrier.example",
    underwriterPhone: partial.underwriterPhone ?? "800-555-0100",
    accountManagerName: partial.accountManagerName ?? "Desk AM",
    accountManagerEmail: partial.accountManagerEmail ?? "am@carrier.example",
    accountManagerPhone: partial.accountManagerPhone ?? "800-555-0101",
    claimsPhone: partial.claimsPhone ?? "800-555-0199",
    billingPhone: partial.billingPhone ?? "800-555-0188",
    newBusinessCommPct: partial.newBusinessCommPct ?? "12",
    renewalCommPct: partial.renewalCommPct ?? "10",
    territory: partial.territory ?? "Florida",
    preferredSubmission: partial.preferredSubmission ?? "portal",
    bindingAuthority: partial.bindingAuthority ?? "limited",
    appetiteNotes: partial.appetiteNotes ?? "Appointed HO on this desk. Filter-first — do not shop off-appetite.",
  };
}

/** Desk book for the seeded shop carriers. Ana fixture is not the source — do not edit that JSON. */
export const CARRIER_DESK: Record<CarrierKey, CarrierDeskContact> = {
  tailrow: {
    portalLogin: "Harmony",
    customerServicePhone: "888-813-8376",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.tailrow.com",
    agentPortalUrl: "https://harmony.tailrow.com",
    carrierInfo: "HO on Harmony. TypTap is the same login — not a second carrier.",
    ...deskExtras({
      naic: "12833",
      amBestRating: "A-",
      underwriterName: "Harmony UW desk",
      underwriterEmail: "uw@harmony.example",
      underwriterPhone: "888-373-3111",
      accountManagerName: "First Connect AM",
      newBusinessCommPct: "12",
      renewalCommPct: "10",
      appetiteNotes: "HO on Harmony. Coast and RCE floors apply. TypTap is the same login.",
    }),
  },
  hoc: {
    portalLogin: "Harmony (service / takeout)",
    customerServicePhone: "877-861-6742",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.hci-group.com",
    agentPortalUrl: "https://harmony.hci-group.com",
    carrierInfo: "Homeowners Choice. Voluntary NB closed; Harmony service account only.",
    ...deskExtras({
      naic: "12944",
      bindingAuthority: "none",
      newBusinessCommPct: "0",
      renewalCommPct: "10",
      appetiteNotes: "Voluntary NB closed. Harmony service / takeout only.",
    }),
  },
  vyrd: {
    portalLogin: "VYRD takeout",
    customerServicePhone: "844-208-8973",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.vyrdins.com",
    agentPortalUrl: "https://agents.vyrdins.com",
    carrierInfo: "Citizens takeout only. No voluntary new business.",
    ...deskExtras({
      naic: "16820",
      bindingAuthority: "none",
      newBusinessCommPct: "0",
      renewalCommPct: "10",
      appetiteNotes: "Citizens takeout only. No voluntary new business.",
    }),
  },
  qbe: {
    portalLogin: "Swyfft",
    customerServicePhone: "877-346-6585",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.qbe.com/us",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "QBE homeowners via Swyfft. AFA paper.",
    ...deskExtras({
      naic: "39217",
      amBestRating: "A",
      preferredSubmission: "portal",
      appetiteNotes: "QBE HO via Swyfft. Coast construction rules skip many Brevard frames.",
    }),
  },
  vave: {
    portalLogin: "Swyfft",
    customerServicePhone: "800-221-3880",
    agentPhone: "Agentero · 888-982-7950",
    website: "https://www.lloyds.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "VAVE / Lloyd's surplus via Swyfft. Agentero paper.",
    ...deskExtras({
      naic: "15792",
      amBestRating: "A",
      newBusinessCommPct: "15",
      renewalCommPct: "12",
      appetiteNotes: "Surplus HO via Swyfft. RCE floors apply. Agentero paper.",
    }),
  },
  benchmark: {
    portalLogin: "Swyfft",
    customerServicePhone: "866-568-4100",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.benchmarkinsurancesolutions.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "Benchmark HO via Swyfft. Same shop as Hadron.",
    ...deskExtras({
      naic: "16187",
      appetiteNotes: "Benchmark HO via Swyfft. Roof-age skips on older clay.",
    }),
  },
  hadron: {
    portalLogin: "Swyfft",
    customerServicePhone: "888-423-7661",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.hadroninsurance.com",
    agentPortalUrl: "https://www.swyfft.com",
    carrierInfo: "Hadron HO via Swyfft. First Connect paper.",
    ...deskExtras({
      naic: "16705",
      appetiteNotes: "Hadron HO via Swyfft. Same roof-age skip as Benchmark on older clay.",
    }),
  },
  geovera: {
    portalLogin: "GeoVera agent",
    customerServicePhone: "800-220-1351",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.geovera.com",
    agentPortalUrl: "https://agents.geovera.com",
    carrierInfo: "GeoVera specialty HO. Will not drop Cov A below that house's RCE.",
    ...deskExtras({
      naic: "10799",
      amBestRating: "A-",
      underwriterName: "GeoVera specialty UW",
      appetiteNotes: "Specialty HO. Will not drop Cov A below that house's RCE.",
    }),
  },
  sagesure: {
    portalLogin: "SageSure",
    customerServicePhone: "888-32-SAGE-1",
    agentPhone: "First Connect · 888-373-3111",
    website: "https://www.sagesure.com",
    agentPortalUrl: "https://agents.sagesure.com",
    carrierInfo: "SageSure (Markel). Published min Cov A $100k in named counties.",
    ...deskExtras({
      naic: "38970",
      amBestRating: "A",
      appetiteNotes: "SageSure (Markel). Published min Cov A $100k in named counties.",
    }),
  },
  americanIntegrity: {
    portalLogin: "AIC agent",
    customerServicePhone: "866-277-9871",
    agentPhone: "AFA · 813-443-2100",
    website: "https://www.aiicfl.com",
    agentPortalUrl: "https://agents.aiicfl.com",
    carrierInfo: "American Integrity. Quote at requested Cov A is not automatically bindable.",
    ...deskExtras({
      naic: "12841",
      underwriterName: "AIC HO desk",
      underwriterEmail: "uw@aiicfl.example",
      accountManagerName: "AFA AM",
      newBusinessCommPct: "11",
      renewalCommPct: "9",
      appetiteNotes: "Quote at requested Cov A is not automatically bindable. Roof + RCS can block.",
    }),
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

export function visibilityFromCols(
  cols: string[] | undefined,
): Record<CarrierTableColumnId, boolean> {
  if (!cols || cols.length === 0) return defaultColumnVisibility();
  const selected = new Set(cols);
  return Object.fromEntries(
    CARRIER_TABLE_COLUMNS.map((col) => [col.id, selected.has(col.id)]),
  ) as Record<CarrierTableColumnId, boolean>;
}

export function colsQuery(visible: Record<CarrierTableColumnId, boolean>): string {
  const params = new URLSearchParams();
  for (const col of CARRIER_TABLE_COLUMNS) {
    if (visible[col.id]) params.append("cols", col.id);
  }
  return params.toString();
}
