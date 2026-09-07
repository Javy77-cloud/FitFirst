"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyMassUpdate } from "@/app/actions/mass-update";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MASS_UPDATE_FIELDS,
  massUpdateAppliesTo,
  massUpdateCustomOptions,
  massUpdateSourceOptions,
  massUpdateStatusOptions,
  type MassUpdateField,
} from "@/lib/lists/mass-update";
import type { CrmListModule } from "@/lib/lists/selection-actions";

const FIELD_LABEL: Record<MassUpdateField, string> = {
  status: "Status",
  source: "Source",
  follow_up_template: "Follow-up template",
  owner: "Owner",
  custom: "Custom field",
};

export type MassUpdateOwner = { id: string; name: string };
export type MassUpdateTemplate = { id: string; name: string };

export function MassUpdateMenu({
  module,
  selected,
  owners = [],
  templates = [],
  busy,
  onBusy,
  onMessage,
  onClear,
}: {
  module: CrmListModule;
  selected: string[];
  owners?: MassUpdateOwner[];
  templates?: MassUpdateTemplate[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [field, setField] = useState<MassUpdateField | null>(null);
  const [value, setValue] = useState("");
  const [customKey, setCustomKey] = useState("notes");
  const options = useMemo(() => {
    if (!field) return [];
    if (field === "status") return massUpdateStatusOptions(module);
    if (field === "source") return massUpdateSourceOptions();
    if (field === "owner") return owners.map((row) => ({ value: row.id, label: row.name }));
    if (field === "follow_up_template") {
      return [{ value: "", label: "Default playbook" }, ...templates.map((row) => ({ value: row.id, label: row.name }))];
    }
    return massUpdateCustomOptions();
  }, [field, module, owners, templates]);

  if (selected.length === 0) return null;

  function open(next: MassUpdateField) {
    setField(next);
    setCustomKey("notes");
    if (next === "status") setValue(massUpdateStatusOptions(module)[0]?.value ?? "");
    else if (next === "source") setValue(massUpdateSourceOptions()[0]?.value ?? "");
    else if (next === "owner") setValue(owners[0]?.id ?? "");
    else if (next === "follow_up_template") setValue("");
    else setValue("");
  }

  async function apply() {
    if (!field) return;
    onBusy(true);
    const form = new FormData();
    form.set("module", module);
    form.set("field", field);
    form.set("value", field === "custom" ? value : value);
    form.set("customKey", customKey);
    for (const id of selected) form.append("recordId", id);
    const result = await applyMassUpdate(form);
    onMessage(result.message);
    onBusy(false);
    if (result.ok) {
      setField(null);
      onClear();
      router.refresh();
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} />}
        >
          Mass update
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48" data-testid="mass-update-menu">
          {MASS_UPDATE_FIELDS.map((item) => (
            <DropdownMenuItem
              key={item}
              disabled={!massUpdateAppliesTo(module, item) || busy}
              onClick={() => open(item)}
            >
              {FIELD_LABEL[item]}
              {!massUpdateAppliesTo(module, item) ? (
                <span className="ml-2 text-[11px] text-muted-foreground">Not on this list</span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={field !== null} onOpenChange={(openState) => !openState && setField(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Mass update · {field ? FIELD_LABEL[field] : ""}</DialogTitle>
            <DialogDescription>
              Writes {selected.length} selected {selected.length === 1 ? "row" : "rows"} on this list. Ana
              is skipped. Bound is signature-only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {field === "custom" ? (
              <>
                <div>
                  <Label className="text-xs">Field</Label>
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    value={customKey}
                    onChange={(event) => setCustomKey(event.target.value)}
                  >
                    {massUpdateCustomOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input className="mt-1 h-8" value={value} onChange={(event) => setValue(event.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-xs">{field ? FIELD_LABEL[field] : "Value"}</Label>
                <select
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                >
                  {options.map((option) => (
                    <option key={option.value || "default"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setField(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void apply()}>
              Update {selected.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
