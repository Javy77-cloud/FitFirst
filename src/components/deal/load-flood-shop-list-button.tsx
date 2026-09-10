"use client";

import { useTransition } from "react";
import { loadJavyFloodShopListAction } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";
import { JAVY_FLOOD_SHOP_LABEL, JAVY_FLOOD_SHOP_NAMES } from "@/lib/appetite/javy-flood-shop-list";

export function LoadFloodShopListButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={pending}
      data-ff-load-flood-shop-list=""
      className="bg-fit-green-bg text-fit-green border border-fit-green/40 hover:bg-fit-green hover:text-white"
      onClick={() => {
        const data = new FormData();
        data.set("dealId", dealId);
        startTransition(async () => {
          await loadJavyFloodShopListAction(data);
        });
      }}
    >
      {pending ? "Loading…" : `${JAVY_FLOOD_SHOP_LABEL} (${JAVY_FLOOD_SHOP_NAMES.length})`}
    </Button>
  );
}
