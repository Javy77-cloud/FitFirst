import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormPrimaryActions({
  submitLabel,
  secondary,
  className,
}: {
  submitLabel: string;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ff-form-actions", className)}>
      <Button type="submit" className="ff-primary-action">
        {submitLabel}
      </Button>
      {secondary ? <div className="ff-form-secondary">{secondary}</div> : null}
    </div>
  );
}
