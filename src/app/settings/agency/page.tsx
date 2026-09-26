import Link from "next/link";
import { deleteAgencyLogo, saveAgencyBrand, uploadAgencyLogo } from "@/app/actions/brand";
import { ChooseFiles } from "@/components/choose-files";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { saveShowCompanyWidgets } from "@/app/actions/home-dashboard";
import { ColumnLayoutFields } from "@/components/brand/column-layout-fields";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { getAgencyBrand, getResolvedDesk } from "@/lib/db/brand-queries";
import { eq } from "drizzle-orm";
import {
  COLOR_PRESET_LABELS,
  COLOR_PRESETS,
  DENSITY_PRESET_LABELS,
  DENSITY_PRESETS,
  FONT_PRESET_LABELS,
  FONT_PRESETS,
  defaultColumnLayout,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AgencySettingsPage() {
  const session = await requireAdminPage();
  const [desk, brand, settings] = await Promise.all([
    getResolvedDesk(),
    getAgencyBrand(),
    db.select().from(agencySettings).where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID)),
  ]);
  void session;
  const showCompanyWidgets = Boolean(settings[0]?.showCompanyWidgets);

  return (
    <SettingsShell title="Agency branding" current="agency">

      {desk.isAdmin ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/settings/lines"
            className="ff-card block p-4 hover:border-primary/40"
            data-ff-agency-lines-card=""
          >
            <div className="text-sm font-semibold text-navy">Lines of business</div>

          </Link>
          <Link
            href="/settings/pipeline-stages"
            className="ff-card block p-4 hover:border-primary/40"
            data-ff-agency-pipeline-stages-card=""
          >
            <div className="text-sm font-semibold text-navy">Pipeline stages</div>
          </Link>
          <Link
            href="/settings/offices"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Offices</div>

          </Link>
          <Link
            href="/settings/territories"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Territories</div>

          </Link>
          <Link
            href="/settings/import-export"
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="text-sm font-semibold text-navy">Agency data / Import Export</div>

          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form action={saveAgencyBrand} className="ff-card space-y-4 p-4">
          <fieldset disabled={!desk.isAdmin} className="space-y-4">
            <div>
              <Label htmlFor="agencyName" className="text-xs">
                Agency name
              </Label>
              <Input
                id="agencyName"
                name="agencyName"
                required
                defaultValue={desk.agencyName}
                className="mt-1 h-8"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Default color</Label>
                <select
                  name="defaultColorPreset"
                  defaultValue={brand?.defaultColorPreset ?? "agency"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {COLOR_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {COLOR_PRESET_LABELS[preset]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Default font</Label>
                <select
                  name="defaultFontPreset"
                  defaultValue={brand?.defaultFontPreset ?? "plex"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {FONT_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {FONT_PRESET_LABELS[preset]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Default density</Label>
                <select
                  name="defaultDensity"
                  defaultValue={brand?.defaultDensity ?? "comfortable"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {DENSITY_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {DENSITY_PRESET_LABELS[preset]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ColumnLayoutFields
              prefix="agencyCol_"
              layout={brand?.defaultColumnLayout ?? defaultColumnLayout()}
              note="Agency default columns — not your personal override. The CRM list picker writes this same JSON on agency_brand.default_column_layout."
            />
            {desk.isAdmin ? (
              <Button type="submit" size="sm">
                Save agency defaults
              </Button>
            ) : null}
          </fieldset>
        </form>

        <div className="space-y-4">
        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Home widgets</h2>

          <form action={saveShowCompanyWidgets} className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showCompanyWidgets"
                value="1"
                defaultChecked={showCompanyWidgets}
              />
              Show 1–2 company widgets on agent home
            </label>
            <Button type="submit" size="sm" variant="outline">
              Save home widgets
            </Button>
          </form>
        </section>

        <section className="ff-card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-navy">Logo</h2>
          <div className="flex items-center gap-3">
            {desk.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={desk.logoUrl}
                alt=""
                className="size-14 rounded-md border border-border bg-card object-contain p-1"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-md border border-dashed border-border text-helper text-muted-foreground">
                No file
              </div>
            )}
            <div className="text-sm text-muted-foreground">{desk.agencyName}</div>
          </div>
          {desk.isAdmin ? (
            <>
              <form action={uploadAgencyLogo} className="space-y-2">
                <ChooseFiles name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" />
                <Button type="submit" size="sm" variant="outline">
                  Upload logo
                </Button>
              </form>
              {desk.logoUrl ? (
                <HardDeleteForm action={deleteAgencyLogo} subject="the agency logo">
                    <FileDeleteIcon label="Delete logo" />
                </HardDeleteForm>
              ) : null}
            </>
          ) : null}
        </section>
        </div>
      </div>
    </SettingsShell>
  );
}
