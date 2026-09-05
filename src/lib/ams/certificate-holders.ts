import { interestKindLabel } from "@/lib/domain-ams";

export type HolderInterestSource = {
  name: string;
  kind: string;
  policyId: string;
  policyNumber: string;
  accountName: string | null;
};

export type HolderCoiSource = {
  holderName: string;
  status: string;
  waiverOfSubrogation: boolean;
  primaryNoncontributory: boolean;
};

export type CertificateHolderRow = {
  name: string;
  kinds: string[];
  policyCount: number;
  policyNumbers: string[];
  accountName: string | null;
  openCoi: number;
  issuedStubs: number;
  waiverOfSubrogation: boolean;
  primaryNoncontributory: boolean;
};

export function parseCertificateFlags(input: {
  waiverOfSubrogation?: boolean | string | null;
  primaryNoncontributory?: boolean | string | null;
}): { waiverOfSubrogation: boolean; primaryNoncontributory: boolean } {
  return {
    waiverOfSubrogation: flagOn(input.waiverOfSubrogation),
    primaryNoncontributory: flagOn(input.primaryNoncontributory),
  };
}

export function flagOn(value: boolean | string | null | undefined): boolean {
  return value === true || value === "1" || value === "true" || value === "on";
}

export function certificateFlagLabels(flags: {
  waiverOfSubrogation: boolean;
  primaryNoncontributory: boolean;
}): string[] {
  const labels: string[] = [];
  if (flags.waiverOfSubrogation) labels.push("Waiver of subrogation");
  if (flags.primaryNoncontributory) labels.push("Primary & noncontributory");
  return labels;
}

export function normalizeHolderName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function rollupCertificateHolders(
  interests: HolderInterestSource[],
  requests: HolderCoiSource[],
): CertificateHolderRow[] {
  const byName = new Map<string, CertificateHolderRow>();

  function rowFor(name: string): CertificateHolderRow {
    const key = normalizeHolderName(name);
    const existing = byName.get(key);
    if (existing) return existing;
    const created: CertificateHolderRow = {
      name: name.trim(),
      kinds: [],
      policyCount: 0,
      policyNumbers: [],
      accountName: null,
      openCoi: 0,
      issuedStubs: 0,
      waiverOfSubrogation: false,
      primaryNoncontributory: false,
    };
    byName.set(key, created);
    return created;
  }

  for (const interest of interests) {
    const row = rowFor(interest.name);
    const kind = interestKindLabel(interest.kind);
    if (!row.kinds.includes(kind)) row.kinds.push(kind);
    if (!row.policyNumbers.includes(interest.policyNumber)) {
      row.policyNumbers.push(interest.policyNumber);
      row.policyCount = row.policyNumbers.length;
    }
    if (!row.accountName && interest.accountName) row.accountName = interest.accountName;
  }

  for (const request of requests) {
    const row = rowFor(request.holderName);
    if (request.status === "requested") row.openCoi += 1;
    if (request.status === "issued") row.issuedStubs += 1;
    if (request.waiverOfSubrogation) row.waiverOfSubrogation = true;
    if (request.primaryNoncontributory) row.primaryNoncontributory = true;
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
