"use client";

import { useMemo, useState } from "react";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { NewDealCreateFields } from "@/components/deals/new-deal-create-fields";
import {
  BUSINESS_IDENTITY_FIELDS,
  defaultCommercialDealLayout,
} from "@/lib/custom-fields/business-identity-fields";
import type { CustomFieldDef, FieldLayout } from "@/lib/custom-fields/types";
import { normalizeDealProducts } from "@/lib/deals/deal-products";
import { usesBusinessIdentityDetails } from "@/lib/deals/product-layout";

export function NewDealFormBody({
  initialLines,
  sourceDealId,
  personalLayout,
  fields,
  values,
}: {
  initialLines: readonly string[];
  sourceDealId?: string | null;
  personalLayout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
}) {
  const [products, setProducts] = useState<string[]>(() =>
    normalizeDealProducts(initialLines),
  );
  const commercial = usesBusinessIdentityDetails({ products });
  const layout = commercial ? defaultCommercialDealLayout() : personalLayout;
  const layoutFields = useMemo(
    () => (commercial ? [...fields, ...BUSINESS_IDENTITY_FIELDS] : fields),
    [commercial, fields],
  );

  return (
    <div data-ff-new-deal-identity={commercial ? "commercial" : "personal"}>
      <NewDealCreateFields
        initialLines={initialLines}
        sourceDealId={sourceDealId}
        products={products}
        onProductsChange={setProducts}
      />
      <RecordLayoutFields module="deals" layout={layout} fields={layoutFields} values={values} />
    </div>
  );
}
