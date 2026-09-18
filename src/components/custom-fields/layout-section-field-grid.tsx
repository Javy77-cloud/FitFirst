import type { CSSProperties, ReactNode } from "react";
import {
  clampSectionColumns,
  groupSectionFieldRows,
  sectionFieldGridClass,
  sectionFieldGridVars,
  type LayoutFieldHint,
} from "@/lib/custom-fields/section-density";
import { DEFAULT_SECTION_DENSITY, sectionDensityOf, type SectionDensity } from "@/lib/custom-fields/types";

export function LayoutSectionFieldGrid({
  density = DEFAULT_SECTION_DENSITY,
  keys,
  fieldOf,
  renderField,
  collapse = true,
}: {
  density?: SectionDensity | number | { density?: unknown };
  keys: readonly string[];
  fieldOf?: (key: string) => LayoutFieldHint | undefined;
  renderField: (key: string) => ReactNode;
  collapse?: boolean;
}) {
  const raw = typeof density === "number" ? density : sectionDensityOf(density);
  const columns = clampSectionColumns(raw);
  const rows = groupSectionFieldRows(keys, fieldOf, columns);
  const collapseOnNarrow = collapse && columns > 1;
  return (
    <div
      className={sectionFieldGridClass(columns, { collapse })}
      style={sectionFieldGridVars(columns) as CSSProperties}
      data-ff-section-field-grid=""
      data-ff-section-density={columns}
      data-ff-collapse={collapseOnNarrow ? "1" : undefined}
    >
      {rows.map((row) => {
        const key = row.keys[0]!;
        return (
          <div key={key} className={row.kind === "wide" ? "col-span-full min-w-0" : "min-w-0"}>
            {renderField(key)}
          </div>
        );
      })}
    </div>
  );
}
