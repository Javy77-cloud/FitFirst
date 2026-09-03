export type SearchKind = "lead" | "deal" | "contact" | "business" | "policy";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

function hay(parts: Array<string | null | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return hay(parts).includes(q);
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
  lastName: string;
  email?: string | null;
  phone?: string | null;
}): SearchHit {
  return {
    kind: "lead",
    id: row.id,
    title: `${row.lastName}, ${row.firstName}`,
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

export function hitFromBusiness(row: { id: string; name: string; ein?: string | null }): SearchHit {
  return {
    kind: "business",
    id: row.id,
    title: row.name,
    subtitle: row.ein ? `Business · EIN ${row.ein}` : "Business · Account 360",
    href: `/accounts/${row.id}`,
  };
}

export function hitFromPolicy(row: { id: string; policyNumber: string; lineOfBusiness: string }): SearchHit {
  return {
    kind: "policy",
    id: row.id,
    title: row.policyNumber,
    subtitle: `Policy · ${row.lineOfBusiness}`,
    href: `/policies/${row.id}`,
  };
}
