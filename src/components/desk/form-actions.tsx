"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ProcessingLabel } from "@/components/desk/wait-hold";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function FormSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="ff-primary-action"
      disabled={pending}
      aria-busy={pending}
      data-pending={pending ? "1" : undefined}
    >
      {pending ? <ProcessingLabel>{label}</ProcessingLabel> : label}
    </Button>
  );
}

export function FormPrimaryActions({
  submitLabel,
  secondary,
  featured,
  className,
}: {
  submitLabel: string;
  secondary?: ReactNode;
  featured?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ff-form-actions", className)} data-ff-form-actions>
      {featured}
      <FormSubmitButton label={submitLabel} />
      {secondary ? <div className="ff-form-secondary">{secondary}</div> : null}
    </div>
  );
}
