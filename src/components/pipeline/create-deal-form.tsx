"use client";

import { useMemo, useState } from "react";
import { createPipelineDeal } from "@/app/actions/pipeline-admin";
import { PartyTypeahead } from "@/components/crm/party-typeahead";
import { Button } from "@/components/ui/button";
import type { PartyRecord } from "@/lib/crm/party-typeahead";
import type { DealLookupRow } from "@/lib/deals/lookup";
import { uploadDealCta, uploadDealCtaLabel } from "@/lib/deals/pipeline-desk";

export function PipelineCreateDealForm({
  parties,
  deals = [],
  pipelineSlug,
  lineOfBusiness,
  lifeOptions,
  healthOptions,
  stages,
}: {
  parties: PartyRecord[];
  deals?: DealLookupRow[];
  pipelineSlug: string;
  lineOfBusiness: string;
  lifeOptions: Array<{ slug: string; label: string }>;
  healthOptions: Array<{ slug: string; label: string }>;
  stages: Array<{ slug: string; name: string }>;
}) {
  const [query, setQuery] = useState("");
  const [pickedDealId, setPickedDealId] = useState("");
  const cta = useMemo(
    () => uploadDealCta(deals, query, pickedDealId || null),
    [deals, query, pickedDealId],
  );

  return (
    <form
      action={createPipelineDeal}
      className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
    >
      <input type="hidden" name="pipelineSlug" value={pipelineSlug} />
      <input type="hidden" name="lineOfBusiness" value={lineOfBusiness} />
      <input type="hidden" name="existingDealId" value={cta.match?.id ?? pickedDealId} />
      <div className="min-w-[16rem] flex-1">
        <PartyTypeahead
          parties={parties}
          required
          titleName="title"
          placeholder="Deal name — Contact or Business"
          onPick={(hit, nextQuery) => {
            setQuery(nextQuery);
            if (!hit) {
              setPickedDealId("");
              return;
            }
            const related = deals.filter((row) =>
              hit.kind === "contact" ? row.contactId === hit.id : row.accountId === hit.id,
            );
            setPickedDealId(related.length === 1 ? related[0]!.id : "");
          }}
        />
      </div>
      {pipelineSlug === "life" ? (
        <select name="policySubType" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">Life type</option>
          {lifeOptions.map((option) => (
            <option key={option.slug} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {pipelineSlug === "health" ? (
        <select name="policySubType" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          <option value="">Health type</option>
          {healthOptions.map((option) => (
            <option key={option.slug} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {cta.kind !== "select" ? (
        <select name="stageSlug" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          {stages.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" size="sm" data-testid="pipeline-deal-cta">
        {uploadDealCtaLabel(cta.kind === "idle" ? "create" : cta.kind)}
      </Button>
    </form>
  );
}
