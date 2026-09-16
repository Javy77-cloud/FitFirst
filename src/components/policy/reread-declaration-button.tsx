"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { rereadMintedDeclaration } from "@/app/actions/policy-mint";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";

export function RereadDeclarationButton({
  policyId,
  compact = false,
}: {
  policyId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={compact ? "ghost" : "outline"}
      disabled={pending}
      data-ff-reread-declaration=""
      onClick={() => {
        const data = new FormData();
        data.set("policyId", policyId);
        startTransition(async () => {
          const result = await rereadMintedDeclaration(data);
          // Success redirects to /policies/:id?flash=declaration-reread with the new mint.
          if (result && !result.ok) {
            flashAction(result.reason === "need_dec" ? "need-dec" : "deal-updated", "error");
            return;
          }
          flashAction("declaration-reread");
          router.push(`/policies/${policyId}`);
          router.refresh();
        });
      }}
    >
      {pending ? "Re-reading…" : "Re-read declaration"}
    </Button>
  );
}
