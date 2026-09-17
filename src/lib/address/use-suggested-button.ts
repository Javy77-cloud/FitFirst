import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Accept FedEx/Mapbox suggested address — not the navy primary action. */
export const ADDRESS_USE_SUGGESTED_LABEL = "Use this address";

export function addressUseSuggestedButtonClassName() {
  return cn(
    buttonVariants({ size: "sm" }),
    "mt-1.5 inline-flex w-full items-center justify-center gap-1.5 border-transparent bg-[var(--ff-terracotta)] text-white shadow-sm transition-all duration-150",
    "hover:bg-[color-mix(in_srgb,var(--ff-terracotta)_86%,black)] hover:shadow-md hover:-translate-y-px",
    "active:translate-y-0 sm:w-auto",
  );
}

export function addressSuggestedChoiceClassName() {
  return "rounded-md border border-[var(--ff-terracotta)]/35 bg-[color-mix(in_srgb,var(--ff-terracotta)_9%,white)] p-2";
}
