import { insuredContactName, insuredHref } from "@/lib/crm/lists";
import type { PipelineCardRow } from "@/lib/db/queries";
import { homeAddressFromRecords } from "@/lib/meetings/types";

export type PipelineCardView = {
  id: string;
  title: string;
  pipelineStage: string;
  pipelineStageSlug: string | null;
  lineOfBusiness: string;
  state: string;
  insured: string;
  insuredHref: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  coverageA: number | null;
  carrier: string | null;
  contactId: string | null;
  leadId: string | null;
  accountId: string | null;
  updatedAt: string | null;
  boundAt: string | null;
  archivedAt: string | null;
};

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function presentPipelineCard(row: PipelineCardRow): PipelineCardView {
  const { deal, contact, lead, risk } = row;
  return {
    id: deal.id,
    title: deal.title,
    pipelineStage: deal.pipelineStage,
    pipelineStageSlug: deal.pipelineStageSlug,
    lineOfBusiness: deal.lineOfBusiness,
    state: deal.state,
    insured: insuredContactName({
      primaryNamedInsured: deal.primaryNamedInsured,
      secondaryNamedInsured: deal.secondaryNamedInsured,
      contact,
      lead,
    }),
    insuredHref: insuredHref({ contactId: deal.contactId, leadId: deal.leadId }),
    phone: contact?.phone ?? lead?.phone ?? null,
    email: contact?.email ?? lead?.email ?? null,
    address: homeAddressFromRecords({ risk, lead, contact }),
    city: risk?.city ?? contact?.city ?? lead?.city ?? null,
    coverageA: risk?.coverageA ?? deal.coverageAmount ?? null,
    carrier: deal.currentCarrier,
    contactId: deal.contactId,
    leadId: deal.leadId,
    accountId: deal.accountId,
    updatedAt: iso(deal.updatedAt),
    boundAt: iso(deal.boundAt),
    archivedAt: iso(deal.archivedAt),
  };
}

export type PipelineStageView = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  seeded: boolean;
};

export type PipelineBoardView = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  seeded: boolean;
  stages: PipelineStageView[];
};
