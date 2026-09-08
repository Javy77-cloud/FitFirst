"use client";

import { useTransition } from "react";
import { loadJavyHomeShopListAction } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";
import { JAVY_HOME_SHOP_CARRIER_IDS, JAVY_HOME_SHOP_LABEL } from "@/lib/appetite/javy-home-shop-list";

export function LoadHomeShopListButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={pending}
      data-ff-load-home-shop-list=""
      className="bg-fit-green-bg text-fit-green border border-fit-green/40 hover:bg-fit-green hover:text-white"
      onClick={() => {
        const data = new FormData();
        data.set("dealId", dealId);
        startTransition(async () => {
          await loadJavyHomeShopListAction(data);
        });
      }}
    >
      {pending ? "Loading…" : `${JAVY_HOME_SHOP_LABEL} (${JAVY_HOME_SHOP_CARRIER_IDS.length})`}
    </Button>
  );
}
