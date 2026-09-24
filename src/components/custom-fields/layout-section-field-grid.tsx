import type { CSSProperties, ReactNode } from "react";
import {
  clampSectionColumns,
  groupSectionFieldRows,
  sectionFieldGridClass,
  sectionFieldGridVars,
  type LayoutDensityContext,
  type LayoutFieldHint,
} from "@/lib/custom-fields/section-density";
import { DEFAULT_SECTION_DENSITY, sectionDensityOf, type SectionDensity } from "@/lib/custom-fields/types";

export function LayoutSectionFieldGrid({
  density = DEFAULT_SECTION_DENSITY,
  keys,
  fieldOf,
  renderField,
  collapse = true,
  contactDesk = false,
}: {
  density?: SectionDensity | number | { density?: unknown };
  keys: readonly string[];
  fieldOf?: (key: string) => LayoutFieldHint | undefined;
  renderField: (key: string) => ReactNode;
  collapse?: boolean;
  /** Contact Details sketch v4 packing (email not wide, street span-2, equal cells). */
  contactDesk?: boolean;
}) {
  const raw = typeof density === "number" ? density : sectionDensityOf(density);
  const columns = clampSectionColumns(raw);
  const ctx: LayoutDensityContext | undefined = contactDesk ? { contactDesk: true } : undefined;
  const rows = groupSectionFieldRows(keys, fieldOf, columns, ctx);
  const collapseOnNarrow = collapse && columns > 1;
  return (
    <div
      className={sectionFieldGridClass(columns, { collapse })}
      style={sectionFieldGridVars(columns) as CSSProperties}
      data-ff-section-field-grid=""
      data-ff-section-density={columns}
      data-ff-contact-desk={contactDesk ? "1" : undefined}
      data-ff-collapse={collapseOnNarrow ? "1" : undefined}
    >
      {rows.map((row) => {
        const key = row.keys[0]!;
        const span = row.span && row.span > 1 ? row.span : undefined;
        const cellClass =
          row.kind === "wide"
            ? "col-span-full min-w-0"
            : span === 2
              ? "col-span-2 min-w-0"
              : "min-w-0";
        return (
          <div
            key={key}
            className={cellClass}
            data-ff-field-span={span === 2 ? "2" : row.kind === "wide" ? "full" : "1"}
          >
            {renderField(key)}
          </div>
        );
      })}
    </div>
  );
}
