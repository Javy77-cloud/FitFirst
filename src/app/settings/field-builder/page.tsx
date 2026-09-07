import Link from "next/link";
import { FieldBuilder } from "@/components/custom-fields/field-builder";
import { SettingsShell } from "@/components/settings/settings-shell";
import { LINE_LABELS } from "@/lib/crm/bind";
import { DEAL_LAYOUT_LINES } from "@/lib/custom-fields/defaults";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import { ensureFieldsForLine, listDealFieldDefs, loadLayoutForLine } from "@/lib/custom-fields/store";
import { LINES, type LineOfBusiness } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function FieldBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>;
}) {
  const { line: raw } = await searchParams;
  const line = (LINES as readonly string[]).includes(raw ?? "") ? (raw as LineOfBusiness) : "HO";
  await ensureFieldsForLine(line).catch(() => null);
  const [layout, fields, picklists] = await Promise.all([
    loadLayoutForLine(line),
    listDealFieldDefs(),
    listFieldPicklists(),
  ]);

  return (
    <SettingsShell title="Deal field builder" current="field-builder">
      <p className="mb-4 text-sm text-muted-foreground">
        Three locked columns: types on the left, then the two canvas columns. Drag a type —
        including Section — onto a column. Currency, percent, checkbox, and picklist render as
        those controls. Save applies this layout to every {LINE_LABELS[line]} deal.
      </p>
      <div className="mb-4 flex flex-wrap gap-2" data-ff-builder-lobs>
        {DEAL_LAYOUT_LINES.map((item) => (
          <Link
            key={item}
            href={`/settings/field-builder?line=${item}`}
            className={`rounded-sm px-2.5 py-1 text-sm ${
              item === line ? "bg-navy text-white" : "bg-muted text-navy hover:bg-secondary"
            }`}
          >
            {LINE_LABELS[item]}
          </Link>
        ))}
      </div>
      <FieldBuilder line={line} initialLayout={layout} fields={fields} picklists={picklists} />
    </SettingsShell>
  );
}
