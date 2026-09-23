"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markClientStaying } from "@/app/actions/renewals-board";
import { Button } from "@/components/ui/button";
import { RENEWAL_HANDLED_LABEL } from "@/lib/renewal/handled";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export function ClientStayingButton({
  policyId,
  className,
  size = "xs",
  variant = "outline",
}: {
  policyId: string;
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("ff-client-staying-btn", className)}
      data-ff-client-staying=""
      disabled={pending}
      title="Client staying — clears chase and moves to Handled (policy stays live)"
      aria-label="Client staying — marks renewal handled"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        start(async () => {
          const fd = new FormData();
          fd.set("policyId", policyId);
          try {
            await markClientStaying(fd);
            flashAction("client-staying");
            router.refresh();
          } catch (err) {
            flashAction(
              err instanceof Error ? err.message : "Could not mark Client staying",
              "error",
            );
          }
        });
      }}
    >
      {pending ? "Saving…" : RENEWAL_HANDLED_LABEL}
    </Button>
  );
}
