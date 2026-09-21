export type SearchKind = "lead" | "deal" | "contact" | "business" | "policy" | "carrier";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** Drop commas and apostrophes so "Ruiz, Elena" matches first + last stored separately. */
export function foldSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/['’`,./|·\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hay(parts: Array<string | null | undefined>) {
  return foldSearchText(parts.filter(Boolean).join(" "));
}

export function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  const q = foldSearchText(query);
  if (!q) return false;
  const text = hay(parts);
  if (text.includes(q)) return true;
  const tokens = q.split(" ").filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => text.includes(token));
}

export function rankHits(hits: SearchHit[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  return [...hits].sort((a, b) => {
    const aExact = a.title.toLowerCase() === q ? 0 : a.title.toLowerCase().includes(q) ? 1 : 2;
    const bExact = b.title.toLowerCase() === q ? 0 : b.title.toLowerCase().includes(q) ? 1 : 2;
    if (aExact !== bExact) return aExact - bExact;
    return a.title.localeCompare(b.title);
  });
}

export function hitFromLead(row: {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}): SearchHit {
  const given = [row.firstName, row.middleName].filter((part) => part?.trim()).join(" ");
  return {
    kind: "lead",
    id: row.id,
    title: `${row.lastName}, ${given}`.replace(/, $/, ""),
    subtitle: [row.email, row.phone].filter(Boolean).join(" · ") || "Lead",
    href: `/leads/${row.id}`,
  };
}

export function hitFromDeal(row: { id: string; title: string; pipelineStage: string }): SearchHit {
  return {
    kind: "deal",
    id: row.id,
    title: row.title,
    subtitle: `Deal · ${row.pipelineStage}`,
    href: `/deals/${row.id}`,
  };
}

export function hitFromContact(row: { id: string; firstName: string; lastName: string }): SearchHit {
  return {
    kind: "contact",
    id: row.id,
    title: `${row.lastName}, ${row.firstName}`,
    subtitle: "Contact · Account 360",
    href: `/contacts/${row.id}`,
  };
}

export function hitFromBusiness(row: {
  id: string;
  name: string;
  einLast4?: string | null;
  ein?: string | null;
}): SearchHit {
  const last4 = row.einLast4 ?? (row.ein ? row.ein.replace(/\D/g, "").slice(-4) : null);
  const mask = last4 ? `**-***${last4}` : null;
  return {
    kind: "business",
    id: row.id,
    title: row.name,
    subtitle: mask ? `Business · EIN ${mask}` : "Business · Account 360",
    href: `/accounts/${row.id}`,
  };
}

export function hitFromPolicy(row: {
  id: string;
  policyNumber: string;
  lineOfBusiness: string;
  partyName?: string | null;
}): SearchHit {
  const party = row.partyName?.trim();
  return {
    kind: "policy",
    id: row.id,
    title: row.policyNumber,
    subtitle: party ? `Policy · ${party} · ${row.lineOfBusiness}` : `Policy · ${row.lineOfBusiness}`,
    href: `/policies/${row.id}`,
  };
}

export function hitFromCarrier(row: {
  id: string;
  name: string;
  naic?: string | null;
  writtenLines?: string[] | null;
}): SearchHit {
  const lines = (row.writtenLines ?? []).filter(Boolean).join(", ");
  return {
    kind: "carrier",
    id: row.id,
    title: row.name,
    subtitle: [lines || null, row.naic ? `NAIC ${row.naic}` : null].filter(Boolean).join(" · ") || "Carrier",
    href: `/carriers/${row.id}`,
  };
}
