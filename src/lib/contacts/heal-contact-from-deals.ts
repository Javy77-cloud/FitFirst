import { emptyOnlyDobPatch, firstParseableDob } from "./dob-sync";
import {
  contactAddressMatchesSecondaryProperty,
  parseInsuredPropertyKind,
  resolveInsuredPropertyKind,
  type InsuredPropertyKind,
} from "@/lib/deals/insured-property-kind";

export type LinkedDealDobSource = {
  dealId: string;
  values: Record<string, string>;
  quotingForm?: string | null;
  product?: string | null;
  insuredAddress?: string | null;
};

/** First parseable DOB on linked deals. Does not invent. */
export function dobFromLinkedDeals(deals: readonly LinkedDealDobSource[]): string | null {
  for (const deal of deals) {
    const iso = firstParseableDob(
      deal.values.date_of_birth,
      deal.values.applicant_dob,
      deal.values.insured_dob,
      deal.values.dob,
    );
    if (iso) return iso;
  }
  return null;
}

export function contactDobHealPatch(
  contactDob: string | null | undefined,
  deals: readonly LinkedDealDobSource[],
): { date_of_birth: string } | null {
  return emptyOnlyDobPatch(contactDob, dobFromLinkedDeals(deals));
}

export type SecondaryAddressCue = {
  dealId: string;
  insuredAddress: string;
  kind: InsuredPropertyKind;
};

export function secondaryPropertyAddressCue(input: {
  contactAddress?: string | null;
  deals: readonly LinkedDealDobSource[];
}): SecondaryAddressCue | null {
  for (const deal of input.deals) {
    const kind = resolveInsuredPropertyKind({
      stored: deal.values.insured_property_kind,
      product: deal.product,
      quotingForm: deal.quotingForm,
      sheetUsage: deal.values.usage,
      occupancy: deal.values.occupancy,
    });
    const insured = deal.insuredAddress || deal.values.mailing_address || "";
    if (
      contactAddressMatchesSecondaryProperty({
        contactAddress: input.contactAddress,
        insuredAddress: insured,
        kind: kind ?? parseInsuredPropertyKind(deal.values.insured_property_kind),
      })
    ) {
      return { dealId: deal.dealId, insuredAddress: insured, kind: kind ?? "secondary" };
    }
  }
  return null;
}
