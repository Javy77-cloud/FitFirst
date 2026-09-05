"use client";

import { createPipelineDeal } from "@/app/actions/pipeline-admin";
import { PartyTypeahead } from "@/components/crm/party-typeahead";
import { Button } from "@/components/ui/button";
import type { PartyRecord } from "@/lib/crm/party-typeahead";

export function PipelineCreateDealForm({
  parties,
  pipelineSlug,
  lineOfBusiness,
  lifeOptions,
  healthOptions,
  stages,
}: {
  parties: PartyRecord[];
  pipelineSlug: string;
  lineOfBusiness: string;
  lifeOptions: Array<{ slug: string; label: string }>;
  healthOptions: Array<{ slug: string; label: string }>;
  stages: Array<{ slug: string; name: string }>;
}) {
  return (
    <form
      action={createPipelineDeal}
      className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
    >
      <input type="hidden" name="pipelineSlug" value={pipelineSlug} />
      <input type="hidden" name="lineOfBusiness" value={lineOfBusiness} />
      <div className="min-w-[16rem] flex-1">
        <PartyTypeahead
          parties={parties}
          required
          titleName="title"
          placeholder="Deal name — Contact or Business"
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
      <select name="stageSlug" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
        {stages.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Create deal
      </Button>
    </form>
  );
}
