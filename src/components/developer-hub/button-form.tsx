import { saveDeskButton } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUTTON_ACTION_KINDS,
  BUTTON_PLACEMENTS,
  DEV_HUB_MODULES,
  DEV_HUB_MODULE_LABEL,
} from "@/lib/developer-hub/types";
import type { DeskCustomButton, DeskWidget } from "@/lib/db/schema";

export function ButtonForm({
  button,
  widgets,
}: {
  button?: DeskCustomButton;
  widgets: DeskWidget[];
}) {
  const profiles = button?.visibilityProfiles ?? ["admin", "agent"];
  return (
    <form action={saveDeskButton} className="ff-card max-w-3xl space-y-4 p-4">
      {button ? <input type="hidden" name="id" value={button.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Label</Label>
          <Input name="label" defaultValue={button?.label} required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Module</Label>
          <select
            name="module"
            defaultValue={button?.module ?? "deals"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {DEV_HUB_MODULES.map((item) => (
              <option key={item} value={item}>
                {DEV_HUB_MODULE_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Placement</Label>
          <select
            name="placement"
            defaultValue={button?.placement ?? "detail"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {BUTTON_PLACEMENTS.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">On click</Label>
          <select
            name="actionKind"
            defaultValue={button?.actionKind ?? "url"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {BUTTON_ACTION_KINDS.map((item) => (
              <option key={item} value={item}>
                {item === "function" ? "Run function" : item === "url" ? "Open URL" : "Open widget"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Visibility profiles</Label>
        <div className="mt-1 flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="visibility" value="admin" defaultChecked={profiles.includes("admin")} />
            Admin
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="visibility" value="agent" defaultChecked={profiles.includes("agent")} />
            Agent
          </label>
        </div>
      </div>
      <div>
        <Label className="text-xs">Function apiName</Label>
        <Input
          name="functionApiName"
          defaultValue={button?.functionApiName ?? ""}
          placeholder="lead_followup_stub"
          className="mt-1 h-8"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Nullable until Developer Hub core Functions exist. Click toasts a no-op if the table is missing.
        </p>
      </div>
      <div>
        <Label className="text-xs">URL template</Label>
        <Input
          name="urlTemplate"
          defaultValue={button?.urlTemplate ?? ""}
          placeholder="https://…?q={{record.address}}"
          className="mt-1 h-8"
        />
      </div>
      <div>
        <Label className="text-xs">Widget</Label>
        <select
          name="widgetId"
          defaultValue={button?.widgetId ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">—</option>
          {widgets.map((widget) => (
            <option key={widget.id} value={widget.id}>
              {widget.name}
            </option>
          ))}
        </select>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={button?.enabled ?? true} />
        Enabled
      </label>
      <Button type="submit" size="sm">
        {button ? "Save button" : "Create button"}
      </Button>
    </form>
  );
}
