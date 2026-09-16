"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { WaitSpinner } from "@/components/desk/wait-hold";

export function FillSubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <WaitSpinner />
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
