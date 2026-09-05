import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveDeveloperFunction } from "@/app/actions/developer-hub";
import type { DeveloperFunction } from "@/lib/db/schema";
import {
  FUNCTION_CATEGORIES,
  FUNCTION_CATEGORY_LABEL,
  FUNCTION_LANGUAGES,
  FUNCTION_LANGUAGE_LABEL,
} from "@/lib/developer-hub/types";
import type { DeveloperConnection } from "@/lib/db/schema";
import type { HubSurface } from "@/lib/developer-hub/paths";

export function FunctionForm({
  fn,
  connections,
  surface = "settings",
}: {
  fn?: DeveloperFunction;
  connections: DeveloperConnection[];
  surface?: HubSurface;
}) {
  const standaloneDefault = (fn?.category ?? "standalone") === "standalone";
  return (
    <form action={saveDeveloperFunction} className="ff-card max-w-3xl space-y-3 p-4">
      <input type="hidden" name="surface" value={surface} />
      {fn ? <input type="hidden" name="id" value={fn.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={fn?.name ?? ""} className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">apiName</Label>
          <Input
            name="apiName"
            defaultValue={fn?.apiName ?? ""}
            className="mt-1 h-8"
            placeholder="echo_payload"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea name="description" defaultValue={fn?.description ?? ""} className="mt-1 min-h-16" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Language</Label>
          <select
            name="language"
            defaultValue={fn?.language ?? "typescript"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {FUNCTION_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {FUNCTION_LANGUAGE_LABEL[lang]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <select
            name="category"
            defaultValue={fn?.category ?? "standalone"}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {FUNCTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {FUNCTION_CATEGORY_LABEL[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Body (allowlisted JSON transform)</Label>
        <Textarea
          name="body"
          defaultValue={fn?.body ?? '{"op":"identity"}'}
          className="mt-1 min-h-40 font-mono text-xs"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Allowed ops: identity, pick, wrap, set. Anything else logs the args and returns a stub.
          Host JavaScript is not executed.
        </p>
      </div>
      <div>
        <Label className="text-xs">Connection (metadata only)</Label>
        <select
          name="connectionLinkName"
          defaultValue={fn?.connectionLinkName ?? ""}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">None</option>
          {connections.map((row) => (
            <option key={row.id} value={row.linkName}>
              {row.name} ({row.linkName})
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-2 rounded-md border border-dashed border-border px-3 py-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Standalone expose
        </legend>
        <p className="text-xs text-muted-foreground">
          REST is a working stub at{" "}
          <code>/api/dev/functions/[apiName]/execute</code> and checks an org API key. OAuth 2.0
          is a wall — Connect later.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="exposeAsRest" defaultChecked={fn?.exposeAsRest ?? standaloneDefault} />
          Expose as REST (API Key)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="exposeAsOauth" defaultChecked={fn?.exposeAsOauth ?? false} />
          Expose as OAuth 2.0 (needs OAuth)
        </label>
      </fieldset>
      <Button type="submit" size="sm">
        {fn ? "Save function" : "Create function"}
      </Button>
    </form>
  );
}
