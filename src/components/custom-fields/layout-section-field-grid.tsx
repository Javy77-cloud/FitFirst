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
        const primary = row.keys[0]!;
        // Spouse name + DOB + link: one full-width row of three equal cells.
        if (row.span === 3 && row.keys.length === 3) {
          return (
            <div
              key={row.keys.join("|")}
              className="col-span-full min-w-0 grid grid-cols-3 gap-x-3 gap-y-2"
              data-ff-field-span="3"
              data-ff-spouse-trio=""
            >
              {row.keys.map((key) => (
                <div key={key} className="min-w-0" data-ff-field-span="1">
                  {renderField(key)}
                </div>
              ))}
            </div>
          );
        }
        const span = row.span && row.span > 1 ? row.span : undefined;
        const cellClass =
          row.kind === "wide"
            ? "col-span-full min-w-0"
            : span === 2
              ? "col-span-2 min-w-0"
              : "min-w-0";
        return (
          <div
            key={primary}
            className={cellClass}
            data-ff-field-span={span === 2 ? "2" : row.kind === "wide" ? "full" : "1"}
          >
            {renderField(primary)}
          </div>
        );
      })}
    </div>
  );
}
