"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fillCompareFromTermRoleDocs } from "@/app/actions/renewal";
import { Button } from "@/components/ui/button";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

export function FillCompareFromDecsButton({
  policyId,
  className,
  size = "sm",
  variant = "default",
}: {
  policyId: string;
  className?: string;
  size?: "xs" | "sm" | "default";
  variant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await fillCompareFromTermRoleDocs(policyId);
      if (!result.ok) {
        setError(result.error);
        flashAction(result.error, "error");
        return;
      }
      const toast = `${result.deltaLabel} (${result.pctLabel}) — ${result.summary}`;
      flashAction(toast);
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-1", className)} data-ff-fill-compare-from-decs="">
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        onClick={run}
        data-ff-fill-compare-from-decs-run=""
      >
        {pending ? "Extracting DECs…" : "Fill Compare from DECs"}
      </Button>
      {error ? (
        <p className="text-sm text-fit-red" data-ff-fill-compare-from-decs-error="">
          {error}
        </p>
      ) : null}
    </div>
  );
}
