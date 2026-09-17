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
    phone: "800-693-6083",
    agentPhone: "800-693-6083",
    portalUrl: "https://producer.mutualofomaha.com",
    agentPortalUrl: "https://producer.mutualofomaha.com",
    carrierInfo:
      "Mutual of Omaha producer portal producer.mutualofomaha.com. Sales support 800-693-6083. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
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
    phone: "877-234-4848",
    agentPhone: "877-234-4848",
    portalUrl: "https://www.agentnetinfo.com",
    agentPortalUrl: "https://www.agentnetinfo.com",
    carrierInfo:
      "Transamerica AgentNet agentnetinfo.com. Life / Final Expense desk 877-234-4848. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
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
    phone: "800-839-5960",
    agentPhone: "800-839-5960",
    portalUrl: "https://www.lgamerica.com",
    agentPortalUrl: "https://www.lgamerica.com",
    carrierInfo:
      "Banner Life / LGA (Legal & General America). AppAssist 800-839-5960. Advisor site lgamerica.com. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
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
    phone: "800-627-4762",
    agentPhone: "800-627-4762",
    portalUrl: "https://agent.royalneighbors.org",
    agentPortalUrl: "https://agent.royalneighbors.org",
    carrierInfo:
      "Royal Neighbors agent portal agent.royalneighbors.org. Sales support 800-627-4762 option 1 then 5. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
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
    phone: "800-280-2011",
    agentPhone: "800-280-2011",
    portalUrl: "https://www.corebridgefinancial.com/Connext",
    agentPortalUrl: "https://www.corebridgefinancial.com/Connext",
    carrierInfo:
      "Corebridge Connext portal corebridgefinancial.com/Connext. Connext support 800-280-2011 option 1. MATRIX Life appetite: data/appetite/fitfirst-life-uw-matrix.csv (partial screenshot seed — full MATRIX when spreadsheet provided).",
  },
  {
    slug: "amam",
    name: "American Amicable",
    aliases: ["amam", "am-am", "american memorial", "american-amicable", "occidental life"],
    website: "https://www.americanamicable.com",
    phone: "800-736-7311",
    agentPhone: "800-736-7311",
    portalUrl: "https://www.americanamicable.com",
    agentPortalUrl: "https://www.americanamicable.com",
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
