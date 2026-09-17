import type { ReactNode } from "react";
import {
  compactRowClass,
  groupSectionFieldRows,
  sectionFieldGridClass,
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
  const columns = typeof density === "number" ? density : sectionDensityOf(density);
  const rows = groupSectionFieldRows(keys, fieldOf, columns);
  return (
    <div
      className={sectionFieldGridClass(columns, { collapse })}
      data-ff-section-field-grid=""
      data-ff-section-density={columns}
    >
      {rows.map((row, index) => {
        if (row.kind === "wide") {
          const key = row.keys[0]!;
          return (
            <div key={key} className="col-span-full min-w-0">
              {renderField(key)}
            </div>
          );
        }
        if (row.kind === "compact" && row.keys.length > 1) {
          return (
            <div
              key={`compact:${row.keys.join(":")}:${index}`}
              className={`col-span-full min-w-0 ${compactRowClass(row.keys.length)}`}
              data-ff-compact-row=""
            >
              {row.keys.map((key) => (
                <div key={key} className="min-w-0">
                  {renderField(key)}
                </div>
              ))}
            </div>
          );
        }
        return row.keys.map((key) => (
          <div key={key} className="min-w-0">
            {renderField(key)}
          </div>
        ));
      })}
    </div>
  );
}
