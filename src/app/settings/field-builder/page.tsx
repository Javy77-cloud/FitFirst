import { FieldBuilder } from "@/components/custom-fields/field-builder";
import { SettingsShell } from "@/components/settings/settings-shell";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import { ensureFieldsForLine, listDealFieldDefs, loadLayoutForLine } from "@/lib/custom-fields/store";

export const dynamic = "force-dynamic";

export default async function FieldBuilderPage() {
  await ensureFieldsForLine("HO").catch(() => null);
  const [layout, fields, picklists] = await Promise.all([
    loadLayoutForLine("HO"),
    listDealFieldDefs(),
    listFieldPicklists(),
  ]);

  return (
    <SettingsShell title="Deal field builder" current="field-builder">
      <p className="mb-4 text-sm text-muted-foreground">
        One layout for every deal. Compact field-type chips sit beside Left and Right on one
        row. Every field is a closed row until you open its menu. Save applies globally.
      </p>
      <FieldBuilder line="HO" initialLayout={layout} fields={fields} picklists={picklists} />
    </SettingsShell>
  );
}
