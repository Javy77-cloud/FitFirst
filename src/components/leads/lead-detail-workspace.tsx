"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { Button, buttonVariants } from "@/components/ui/button";
import { LeadLineDocuments, type LeadLineDoc } from "@/components/leads/lead-line-documents";
import {
  documentFormKeysFromDocs,
  leadDocumentCardKeys,
  parseSelectedShopLines,
  shopLineForDocCardKey,
} from "@/lib/leads/line-documents";

export function LeadDetailWorkspace({
  leadId,
  dealId,
  insuranceTypeDesired,
  state,
  canConvert,
  docs,
  rail,
  children,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  state: string;
  canConvert: boolean;
  docs: LeadLineDoc[];
  rail?: ReactNode;
  children: ReactNode;
}) {
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const documentKeys = documentFormKeysFromDocs(docs);
  const cardKeys = useMemo(
    () =>
      leadDocumentCardKeys({
        insuranceTypeDesired,
        documentKeys,
        extraKeys,
      }).filter((key) => !hiddenKeys.includes(key)),
    [insuranceTypeDesired, documentKeys, extraKeys, hiddenKeys],
  );
  const shopLines = useMemo(() => {
    const found = new Set(parseSelectedShopLines(cardKeys.join(",")));
    for (const key of cardKeys) {
      const shop = shopLineForDocCardKey(key);
      if (shop) found.add(shop);
    }
    return Array.from(found);
  }, [cardKeys]);

  return (
    <div
      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(280px,320px)] gap-4 max-[999px]:grid-cols-1"
      data-ff-lead-layout="layout-docs-rail"
    >
      <div className="min-w-0" data-ff-lead-edit-layout="">
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
              <Link
                href={`/leads/${leadId}/convert?shopLines=${encodeURIComponent(shopLines.join(","))}`}
                className={buttonVariants()}
                data-ff-convert-deal
              >
                Convert
              </Link>
            ) : null}
          </div>
        </form>
      </div>
      <div className="min-w-0" data-ff-lead-docs-col="">
        <LeadLineDocuments
          leadId={leadId}
          dealId={dealId}
          insuranceTypeDesired={insuranceTypeDesired}
          docs={docs}
          extraKeys={extraKeys}
          onExtraKeys={setExtraKeys}
          hiddenKeys={hiddenKeys}
          onHiddenKeys={setHiddenKeys}
        />
      </div>
      {rail ? (
        <aside className="min-w-0 w-full" data-ff-lead-context-rail="">
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
