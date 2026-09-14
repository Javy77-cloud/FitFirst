import type { FieldLayout } from "@/lib/custom-fields/types";

export type LayoutTemplateKind = "classic" | "card";

/** Classic (Dense) = empty right column; Card (Two column) = any right sections. */
export function layoutTemplateKind(layout: FieldLayout | null | undefined): LayoutTemplateKind {
  const right = layout?.columns?.[1]?.sections?.length ?? 0;
  return right === 0 ? "classic" : "card";
}
