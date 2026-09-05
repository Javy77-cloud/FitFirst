import { saveMyDeskPrefs } from "@/app/actions/brand";
import { ColumnLayoutFields } from "@/components/brand/column-layout-fields";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import { getAgentPrefs, getResolvedDesk } from "@/lib/db/brand-queries";
import {
  COLOR_PRESET_LABELS,
  COLOR_PRESETS,
  DENSITY_PRESET_LABELS,
  DENSITY_PRESETS,
  FONT_PRESET_LABELS,
  FONT_PRESETS,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function MyDeskPage() {
  const session = await requireSignedIn();
  const desk = await getResolvedDesk();
  const stored = await getAgentPrefs(desk.actor.key);
  const inheriting = !stored?.colorPreset && !stored?.fontPreset && !stored?.density;

  return (
    <SettingsShell title="My desk" current="my-desk">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Your interface only. Does not change agency logo, templates, signatures, or another
        agent&apos;s desk. Column order is stored here; the CRM list picker writes the same
        layout when that slice lands. Rearrange the left menu from the sidebar{" "}
        <strong>Customize menu</strong> control — that layout is saved on your{" "}
        <code>agent_ui_prefs</code> row and is not shared with Maya.
      </p>
      <form action={saveMyDeskPrefs} className="ff-card space-y-4 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inheritAgency" value="true" defaultChecked={inheriting} />
          Use agency defaults (clear my overrides)
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Color</Label>
            <select
              name="colorPreset"
              defaultValue={desk.colorPreset}
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
            <Label className="text-xs">Font</Label>
            <select
              name="fontPreset"
              defaultValue={desk.fontPreset}
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
            <Label className="text-xs">Density</Label>
            <select
              name="density"
              defaultValue={desk.density}
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
          prefix="agentCol_"
          layout={desk.columnLayout}
          note="Your visible columns. Uncheck to hide. The in-list column picker should persist to agent_ui_prefs.column_layout."
        />
        <Button type="submit" size="sm">
          Save my desk
        </Button>
      </form>
    </SettingsShell>
  );
}
