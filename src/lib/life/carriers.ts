import { loadLifeContacts, overlayLifeCarrierContact } from "./sheet";

export type LifeMatrixCarrierContact = {
  slug: string;
  name: string;
  aliases: string[];
  website: string;
  phone: string;
  agentPhone: string;
  portalUrl: string;
  agentPortalUrl: string;
  carrierInfo: string;
};

/**
 * Public agent-facing contacts verified 2026-09. Empty fields stay empty —
 * do not invent numbers. Update-in-place matches these names/aliases.
 */
export const LIFE_MATRIX_CARRIER_CONTACTS: LifeMatrixCarrierContact[] = [
  {
    slug: "americo",
    name: "Americo",
    aliases: ["americo financial life", "americo life"],
    website: "https://www.americo.com",
    phone: "800-231-0801",
    agentPhone: "800-231-0801",
    portalUrl: "https://portal.americoagent.com",
    agentPortalUrl: "https://portal.americoagent.com",
    carrierInfo:
      "Americo Agent Services 800-231-0801. Agent portal portal.americoagent.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "moo",
    name: "Mutual of Omaha",
    aliases: ["moo", "united of omaha", "mutual of omaha insurance"],
    website: "https://www.mutualofomaha.com",
    phone: "800-775-7896",
    agentPhone: "800-775-7896",
    portalUrl: "https://producer.mutualofomaha.com",
    agentPortalUrl: "http://www.mutualofomaha.com/broker",
    carrierInfo:
      "Mutual of Omaha Life desk 800-775-7896 (Javy Carrier Rep Contact List / MATRIX). Producer portal producer.mutualofomaha.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.",
  },
  {
    slug: "foresters",
    name: "Foresters",
    aliases: ["foresters financial", "the independent order of foresters"],
    website: "https://www.foresters.com",
    phone: "866-466-7166",
    agentPhone: "866-466-7166",
    portalUrl: "https://myezbiz.foresters.com",
    agentPortalUrl: "https://myezbiz.foresters.com",
    carrierInfo:
      "Foresters ezbiz / myezbiz.foresters.com. Sales support 866-466-7166. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "transamerica",
    name: "Transamerica",
    aliases: ["transamerica life", "transamerica life insurance"],
    website: "https://www.transamerica.com",
    phone: "877-454-4768",
    agentPhone: "877-454-4768",
    portalUrl: "https://www.agentnetinfo.com",
    agentPortalUrl: "https://www.agentnetinfo.com",
    carrierInfo:
      "Transamerica AgentNet agentnetinfo.com. MATRIX product phone 877-454-4768. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.",
  },
  {
    slug: "sbli",
    name: "SBLI",
    aliases: [
      "savings bank life",
      "the savings bank mutual life",
      "savings bank mutual life insurance company of massachusetts",
    ],
    website: "https://www.sbli.com",
    phone: "888-224-7254",
    agentPhone: "888-224-7254",
    portalUrl: "https://www.sbliagent.com",
    agentPortalUrl: "https://www.sbliagent.com",
    carrierInfo:
      "SBLI agent portal sbliagent.com. Brokerage 888-224-7254 option 1. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "banner",
    name: "Banner Life",
    aliases: ["banner", "lga", "legal & general america", "legal and general america"],
    website: "https://www.lgamerica.com",
    phone: "833-520-2131",
    agentPhone: "833-520-2131",
    portalUrl: "https://www.lgamerica.com",
    agentPortalUrl: "https://www.lgamerica.com",
    carrierInfo:
      "Banner Life / LGA. MATRIX product phone 833-520-2131. Rep Audrey Anders aanders@lgamerica.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.",
  },
  {
    slug: "nlg",
    name: "National Life Group",
    aliases: ["nlg", "national life", "national life insurance"],
    website: "https://www.nationallife.com",
    phone: "800-906-3310",
    agentPhone: "800-906-3310",
    portalUrl: "https://www.nationallife.com",
    agentPortalUrl: "https://www.nationallife.com",
    carrierInfo:
      "National Life Group agent desk 800-906-3310 (NLGSalesDesk@nationallife.com). Portal via nationallife.com LOGIN/REGISTER. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "royal_neighbors",
    name: "Royal Neighbors",
    aliases: ["royal neighbors of america", "rna"],
    website: "https://www.royalneighbors.org",
    phone: "800-770-4561",
    agentPhone: "800-770-4561",
    portalUrl: "https://agent.royalneighbors.org",
    agentPortalUrl: "https://agent.royalneighbors.org",
    carrierInfo:
      "Royal Neighbors agent portal agent.royalneighbors.org. MATRIX phone 800-770-4561. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.",
  },
  {
    slug: "fg",
    name: "Fidelity & Guaranty",
    aliases: ["f&g", "fidelity & guarantee", "fidelity and guaranty", "fidelity & guaranty life", "fg life"],
    website: "https://www.fglife.com",
    phone: "800-445-6758",
    agentPhone: "800-445-6758",
    portalUrl: "https://saleslink.fglife.com",
    agentPortalUrl: "https://saleslink.fglife.com",
    carrierInfo:
      "F&G (Fidelity & Guaranty) SalesLink saleslink.fglife.com. Contracting 800-445-6758. SalesLink help 888-513-8797. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "corebridge",
    name: "Corebridge",
    aliases: ["corebridge financial", "aig life"],
    website: "https://www.corebridgefinancial.com",
    phone: "877-399-7747",
    agentPhone: "877-399-7747",
    portalUrl: "https://www.corebridgefinancial.com/Connext",
    agentPortalUrl: "https://www.corebridgefinancial.com/Connext",
    carrierInfo:
      "Corebridge Connext portal corebridgefinancial.com/Connext. MATRIX product phone 877-399-7747. AIG eStation 800-247-8837. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv — full MATRIX when spreadsheet provided.",
  },
  {
    slug: "amam",
    name: "American Amicable",
    aliases: ["amam", "am-am", "american memorial", "american-amicable", "occidental life"],
    website: "https://www.americanamicable.com",
    phone: "800-736-7311",
    agentPhone: "800-736-7311",
    portalUrl: "https://www.americanamicable.com/v3/agentLogin.php",
    agentPortalUrl: "https://www.americanamicable.com/v3/agentLogin.php",
    carrierInfo:
      "MATRIX column AMAM — American Amicable / Occidental family (Term Made Simple, Express Term). Agent line 800-736-7311. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "uhl",
    name: "United Home Life",
    aliases: ["uhl", "united heritage life", "united home life insurance"],
    website: "https://www.unitedhomelife.com",
    phone: "800-428-3001",
    agentPhone: "800-428-3001",
    portalUrl: "https://agentportal.unitedhomelife.com",
    agentPortalUrl: "https://agentportal.unitedhomelife.com",
    carrierInfo:
      "United Home Life (UHL) agent portal agentportal.unitedhomelife.com. Life Contact Center 800-428-3001. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
];

export function normalizeLifeCarrierName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesAlign(needle: string, alias: string): boolean {
  return needle === alias || needle.startsWith(`${alias} `) || alias.startsWith(`${needle} `);
}

export function matchLifeMatrixCarrier(
  name: string,
): LifeMatrixCarrierContact | null {
  const needle = normalizeLifeCarrierName(name);
  if (!needle) return null;
  for (const carrier of LIFE_MATRIX_CARRIER_CONTACTS) {
    const names = [carrier.name, ...carrier.aliases].map(normalizeLifeCarrierName);
    if (names.some((alias) => namesAlign(needle, alias))) {
      return carrier;
    }
  }
  return null;
}

export function resolveLifeMatrixCarrier(name: string): LifeMatrixCarrierContact | null {
  const matched = matchLifeMatrixCarrier(name);
  if (!matched) return null;
  const row = loadLifeContacts().find((contact) => contact.carrierSlug === matched.slug);
  return overlayLifeCarrierContact(matched, row);
}
