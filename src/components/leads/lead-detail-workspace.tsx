"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createDealFromLead } from "@/app/actions/crm";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { LeadLineDocuments, type LeadLineDoc } from "@/components/leads/lead-line-documents";
import { documentLinesFromDocs, leadDocumentCardLines } from "@/lib/leads/line-documents";
import type { ShopLine } from "@/lib/domain";

export function LeadDetailWorkspace({
  leadId,
  dealId,
  insuranceTypeDesired,
  state,
  canConvert,
  docs,
  children,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  state: string;
  canConvert: boolean;
  docs: LeadLineDoc[];
  children: ReactNode;
}) {
  const [extraLines, setExtraLines] = useState<ShopLine[]>([]);
  const documentLines = documentLinesFromDocs(docs);
  const shopLines = useMemo(
    () =>
      leadDocumentCardLines({
        insuranceTypeDesired,
        documentLines,
        extraLines,
      }),
    [insuranceTypeDesired, documentLines, extraLines],
  );

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] gap-4 max-[699px]:grid-cols-1"
      data-ff-lead-layout="two-col"
    >
      <div className="min-w-0">
        <form action={updateLeadRecord} className="space-y-3">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="shopLines" value={shopLines.join(",")} />
          {children}
          <FormPrimaryActions
            submitLabel="Save lead"
            featured={
              canConvert ? (
                <button
                  type="submit"
                  formAction={createDealFromLead}
                  className="ff-primary-action ff-convert-action inline-flex items-center rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/80"
                  data-ff-convert-deal
                >
                  Convert
                </button>
              ) : null
            }
          />
        </form>
      </div>
      <LeadLineDocuments
        leadId={leadId}
        dealId={dealId}
        insuranceTypeDesired={insuranceTypeDesired}
        docs={docs}
        extraLines={extraLines}
        onExtraLines={setExtraLines}
      />
    </div>
  );
}
