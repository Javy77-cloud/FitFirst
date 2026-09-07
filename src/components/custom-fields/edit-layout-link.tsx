import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  fieldBuilderHref,
  type FieldLayoutModule,
} from "@/lib/custom-fields/modules";
import { cn } from "@/lib/utils";

export function EditLayoutLink({
  module,
  line,
  className,
  size = "sm",
}: {
  module: FieldLayoutModule;
  line?: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  return (
    <Link
      href={fieldBuilderHref(module, line)}
      className={cn(buttonVariants({ variant: "default", size }), className)}
      data-ff-open-field-builder
      data-ff-edit-layout={module}
    >
      Edit Layout
    </Link>
  );
}
