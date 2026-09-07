import Link from "next/link";
import {
  FIELD_LAYOUT_MODULES,
  FIELD_LAYOUT_MODULE_LABEL,
  fieldBuilderHref,
  type FieldLayoutModule,
} from "@/lib/custom-fields/modules";
import { cn } from "@/lib/utils";

export function ModuleLayoutNav({ current }: { current: FieldLayoutModule }) {
  return (
    <nav
      className="mb-4 flex flex-wrap gap-1.5"
      data-ff-module-layout-nav
      aria-label="Layout modules"
    >
      {FIELD_LAYOUT_MODULES.map((module) => {
        const active = module === current;
        return (
          <Link
            key={module}
            href={fieldBuilderHref(module)}
            data-ff-layout-module={module}
            data-ff-layout-module-active={active ? "true" : "false"}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              active
                ? "border-navy bg-navy text-white"
                : "border-border bg-background text-navy hover:bg-muted",
            )}
          >
            {FIELD_LAYOUT_MODULE_LABEL[module]}
          </Link>
        );
      })}
    </nav>
  );
}
