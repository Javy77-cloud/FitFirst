import Link from "next/link";
import { FieldBuilder } from "@/components/custom-fields/field-builder";
import { ModuleLayoutNav } from "@/components/custom-fields/module-layout-nav";
import { SettingsShell } from "@/components/settings/settings-shell";
import { listFieldPicklists } from "@/lib/custom-fields/picklist-store";
import { globalListOptionSetsFromRows } from "@/lib/custom-fields/option-sets";
import { loadGlobalLists } from "@/lib/db/global-lists";
import {
  fieldBuilderHref,
  fieldLayoutModuleLabel,
  parseLayoutModule,
} from "@/lib/custom-fields/modules";
import { layoutContentScore, resolveLayoutFields } from "@/lib/custom-fields/resolve-layout";
import { ensureFieldsForModule, listFieldDefs, loadLayoutForModule } from "@/lib/custom-fields/store";
import { loadAgencyLines } from "@/lib/db/agency-lines";
import { visibleAgencyLines } from "@/lib/desk/agency-lines";
import { cn } from "@/lib/utils";

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
  const [layout, fields, picklists, globalRows, agencyLines] = await Promise.all([
    loadLayoutForModule(module, line),
    listFieldDefs(module),
    listFieldPicklists(),
    loadGlobalLists().catch(() => []),
    module === "deals" || module === "policies"
      ? loadAgencyLines().catch(() => [])
      : Promise.resolve([]),
  ]);
  const globalLists = globalListOptionSetsFromRows(globalRows);
  const label = fieldLayoutModuleLabel(module);
  const resolvedFields = resolveLayoutFields(layout, fields);

  return (
    <SettingsShell title={`${label} field builder`} current="field-builder">
      <ModuleLayoutNav current={module} />
      {agencyLines.length > 0 ? (
        <nav
          className="mb-4 flex flex-wrap gap-1.5"
          data-ff-field-builder-lines
          aria-label="Line of business"
        >
          {visibleAgencyLines(agencyLines).map((row) => {
            const active = row.code === line;
            return (
              <Link
                key={row.code}
                href={fieldBuilderHref(module, row.code)}
                data-ff-field-builder-line={row.code}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium",
                  active
                    ? "border-navy bg-navy text-white"
                    : "border-border bg-background text-navy hover:bg-muted",
                )}
              >
                {row.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <FieldBuilder
        key={`${module}:${line}:${layoutContentScore(layout)}`}
        module={module}
        line={line}
        initialLayout={layout}
        fields={resolvedFields}
        picklists={picklists}
        globalLists={globalLists}
      />
    </SettingsShell>
  );
}
