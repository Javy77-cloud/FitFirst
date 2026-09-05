import { saveDeskScript } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COV_A_EMPTY_SCRIPT } from "@/lib/developer-hub/client-scripts";
import {
  DEV_HUB_MODULES,
  DEV_HUB_MODULE_LABEL,
  SCRIPT_EVENTS,
  SCRIPT_PAGES,
} from "@/lib/developer-hub/types";
import type { DeskClientScript } from "@/lib/db/schema";

export function ScriptForm({ script }: { script?: DeskClientScript }) {
  return (
    <form action={saveDeskScript} className="ff-card max-w-3xl space-y-4 p-4">
      {script ? <input type="hidden" name="id" value={script.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={script?.name} required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Module</Label>
          <select
            name="module"
            defaultValue={script?.module ?? "deals"}
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
          <Label className="text-xs">Page</Label>
          <select
            name="page"
            defaultValue={script?.page ?? "edit"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {SCRIPT_PAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Event</Label>
          <select
            name="event"
            defaultValue={script?.event ?? "onChange"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {SCRIPT_EVENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Field (onChange)</Label>
        <Input name="fieldName" defaultValue={script?.fieldName ?? ""} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Script body</Label>
        <Textarea
          name="body"
          defaultValue={script?.body ?? COV_A_EMPTY_SCRIPT}
          className="mt-1 min-h-32 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Allowlisted calls only: getValue, setValue, showError. The desk does not eval this string.
        </p>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={script?.enabled ?? true} />
        Enabled
      </label>
      <Button type="submit" size="sm">
        {script ? "Save script" : "Create script"}
      </Button>
    </form>
  );
}
