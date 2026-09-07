import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <Button type="submit" className="ff-primary-action">
        {submitLabel}
      </Button>
      {secondary ? <div className="ff-form-secondary">{secondary}</div> : null}
    </div>
  );
}
