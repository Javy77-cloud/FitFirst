"use client";

import { useTransition } from "react";
import { loadJavyAutoShopListAction } from "@/app/actions/deal-desk";
import { Button } from "@/components/ui/button";
import { JAVY_AUTO_SHOP_CARRIER_IDS, JAVY_AUTO_SHOP_LABEL } from "@/lib/appetite/javy-auto-shop-list";

export function LoadAutoShopListButton({
  dealId,
  line,
  product,
}: {
  dealId: string;
  line?: string | null;
  product?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={pending}
      data-ff-load-auto-shop-list=""
      className="bg-fit-green-bg text-fit-green border border-fit-green/40 hover:bg-fit-green hover:text-white"
      onClick={() => {
        const data = new FormData();
        data.set("dealId", dealId);
        if (line) data.set("line", line);
        if (product) data.set("product", product);
        startTransition(async () => {
          await loadJavyAutoShopListAction(data);
        });
      }}
    >
      {pending ? "Loading…" : `${JAVY_AUTO_SHOP_LABEL} (${JAVY_AUTO_SHOP_CARRIER_IDS.length})`}
    </Button>
  );
}
