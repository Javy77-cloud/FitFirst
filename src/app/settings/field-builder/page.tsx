import { FieldBuilder } from "@/components/custom-fields/field-builder";
import { ModuleLayoutNav } from "@/components/custom-fields/module-layout-nav";
import { SettingsShell } from "@/components/settings/settings-shell";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import {
  fieldLayoutModuleLabel,
  parseLayoutModule,
} from "@/lib/custom-fields/modules";
import { resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { ensureFieldsForModule, listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FieldBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const module = parseLayoutModule(first(params.module));
  const line = first(params.line) || "HO";
  await ensureFieldsForModule(module, line).catch(() => null);
  const [layout, fields, picklists] = await Promise.all([
    loadLayoutForModule(module, line),
    listFieldDefs(module),
    listFieldPicklists(),
  ]);
  const label = fieldLayoutModuleLabel(module);
  const resolvedFields = resolveLayoutFields(layout, fields);

  return (
    <SettingsShell title={`${label} field builder`} current="field-builder">
      <p className="mb-4 text-sm text-muted-foreground">
        One layout for every {label.toLowerCase()} record. Compact field-type chips sit beside Left and Right
        on one row. Every field is a closed row until you open its menu. Save applies globally to this
        module.
      </p>
      <ModuleLayoutNav current={module} />
      <FieldBuilder
        key={`${module}:${line}:${layoutContentScore(layout)}`}
        module={module}
        line={line}
        initialLayout={layout}
        fields={resolvedFields}
        picklists={picklists}
      />
    </SettingsShell>
  );
}
