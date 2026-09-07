"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createDealFromLead } from "@/app/actions/crm";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { Button } from "@/components/ui/button";
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
      className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 max-[699px]:grid-cols-1"
      data-ff-lead-layout="two-col"
    >
      <div className="min-w-0">
        <form action={updateLeadRecord} className="space-y-3">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="shopLines" value={shopLines.join(",")} />
          {children}
          <div
            className="flex items-center justify-end gap-3 pt-1"
            data-ff-lead-actions=""
          >
            <Button type="submit" variant="link" className="h-9 px-0">
              Save lead
            </Button>
            {canConvert ? (
              <Button type="submit" formAction={createDealFromLead} data-ff-convert-deal>
                Convert
              </Button>
            ) : null}
          </div>
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
