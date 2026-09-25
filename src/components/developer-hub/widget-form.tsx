import { saveDeskWidget } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WIDGET_HOSTING, WIDGET_TYPES } from "@/lib/developer-hub/types";
import type { DeskWidget } from "@/lib/db/schema";

export function WidgetForm({ widget }: { widget?: DeskWidget }) {
  return (
    <form action={saveDeskWidget} className="ff-card max-w-3xl space-y-4 p-4">
      {widget ? <input type="hidden" name="id" value={widget.id} /> : null}
      <div>
        <Label className="text-xs">Name</Label>
        <Input name="name" defaultValue={widget?.name} required className="mt-1 h-8" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Type</Label>
          <select
            name="type"
            defaultValue={widget?.type ?? "settings"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {WIDGET_TYPES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Hosting</Label>
          <select
            name="hosting"
            defaultValue={widget?.hosting ?? "external"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {WIDGET_HOSTING.map((item) => (
              <option key={item} value={item}>
                {item === "internal" ? "Internal (zip metadata)" : "External URL"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">External URL</Label>
        <Input name="externalUrl" defaultValue={widget?.externalUrl ?? ""} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Internal zip name (stub)</Label>
        <Input
          name="zipFileName"
          defaultValue={widget?.zipMeta?.fileName ?? ""}
          placeholder="my-widget.zip"
          className="mt-1 h-8"
        />

      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={widget?.enabled ?? true} />
        Enabled
      </label>
      <Button type="submit" size="sm">
        {widget ? "Save widget" : "Create widget"}
      </Button>
    </form>
  );
}
