"use client";

import Link from "next/link";
import { startRenewalShopping } from "@/app/actions/renewal-shopping";
import { Button } from "@/components/ui/button";
import { SHOPPING_IN_PROGRESS_BADGE, shoppingBadgeVisible } from "@/lib/renewal/shopping-branch";

/** Shop for quotes stays on the renewal. The badge is the only way back. */
export function ShopForQuotes({
  policyId,
  shoppingDealId,
  shoppingStatus,
}: {
  policyId: string;
  shoppingDealId?: string | null;
  shoppingStatus?: string | null;
}) {
  if (shoppingBadgeVisible(shoppingStatus) && shoppingDealId) {
    return (
      <Link
        href={`/deals/${shoppingDealId}`}
        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
        data-ff-shopping-badge=""
        data-ff-no-compare=""
      >
        {SHOPPING_IN_PROGRESS_BADGE}
      </Link>
    );
  }
  return (
    <form action={startRenewalShopping} data-ff-no-compare="">
      <input type="hidden" name="policyId" value={policyId} />
      <Button type="submit" size="xs" variant="outline" data-ff-shop-for-quotes="">
        Shop for quotes
      </Button>
    </form>
  );
}
