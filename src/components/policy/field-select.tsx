import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldSelect({
  name,
  defaultValue,
  children,
  required,
  className,
}: {
  name: string;
  defaultValue?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      required={required}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {children}
    </select>
  );
}
