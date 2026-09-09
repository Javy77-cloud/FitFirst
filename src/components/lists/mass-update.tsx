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
  isFollowUpTemplateColumn,
  isOwnerLikeColumn,
  isSellingAgencyColumn,
  isStatusLikeColumn,
  massUpdateLineOptions,
  massUpdateSellingAgencyOptions,
  massUpdateSourceOptions,
  massUpdateStatusOptions,
} from "@/lib/lists/mass-update";
import type { ListColumn } from "@/lib/list-columns";
import type { CrmListModule } from "@/lib/lists/selection-actions";

export type MassUpdateOwner = { id: string; name: string };
export type MassUpdateTemplate = { id: string; name: string };
export type MassUpdateFieldOptionMap = Record<string, Array<{ value: string; label: string }>>;

export function MassUpdateMenu({
  module,
  selected,
  fields = [],
  fieldOptions = {},
  owners = [],
  templates = [],
  busy,
  onBusy,
  onMessage,
  onClear,
}: {
  module: CrmListModule;
  selected: string[];
  /** Visible editable list columns — same set as Columns picker (minus non-writable). */
  fields?: ListColumn[];
  fieldOptions?: MassUpdateFieldOptionMap;
  owners?: MassUpdateOwner[];
  templates?: MassUpdateTemplate[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [columnId, setColumnId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const active = (fields ?? []).find((field) => field.id === columnId) ?? null;

  const options = useMemo(() => {
    if (!columnId) return [];
    if (isStatusLikeColumn(columnId)) return massUpdateStatusOptions(module);
    if (columnId === "source") return massUpdateSourceOptions();
    if (isOwnerLikeColumn(columnId)) return owners.map((row) => ({ value: row.id, label: row.name }));
    if (isFollowUpTemplateColumn(columnId)) {
      return [{ value: "", label: "Default playbook" }, ...templates.map((row) => ({ value: row.id, label: row.name }))];
    }
    if (columnId === "line") return massUpdateLineOptions();
    if (isSellingAgencyColumn(columnId)) {
      return fieldOptions[columnId]?.length
        ? fieldOptions[columnId]
        : massUpdateSellingAgencyOptions();
    }
    if (fieldOptions[columnId]?.length) return fieldOptions[columnId];
    return [];
  }, [columnId, fieldOptions, module, owners, templates]);

  if (selected.length === 0) return null;

  function open(next: string) {
    setColumnId(next);
    if (isStatusLikeColumn(next)) setValue(massUpdateStatusOptions(module)[0]?.value ?? "");
    else if (next === "source") setValue(massUpdateSourceOptions()[0]?.value ?? "");
    else if (isOwnerLikeColumn(next)) setValue(owners[0]?.id ?? "");
    else if (isFollowUpTemplateColumn(next)) setValue("");
    else if (next === "line") setValue(massUpdateLineOptions()[0]?.value ?? "");
    else if (isSellingAgencyColumn(next)) {
      const opts = fieldOptions[next]?.length ? fieldOptions[next] : massUpdateSellingAgencyOptions();
      setValue(opts[0]?.value ?? "");
    } else if (fieldOptions[next]?.length) setValue(fieldOptions[next][0]?.value ?? "");
    else setValue("");
  }

  async function apply() {
    if (!columnId) return;
    onBusy(true);
    const form = new FormData();
    form.set("module", module);
    form.set("columnId", columnId);
    form.set("value", value);
    for (const id of selected) form.append("recordId", id);
    const result = await applyMassUpdate(form);
    onMessage(result.message);
    onBusy(false);
    if (result.ok) {
      setColumnId(null);
      onClear();
      router.refresh();
    }
  }

  const useSelect = options.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy || fields.length === 0} />}
        >
          Mass update
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48" data-testid="mass-update-menu">
          {fields.length === 0 ? (
            <DropdownMenuItem disabled>No editable visible columns</DropdownMenuItem>
          ) : (
            fields.map((item) => (
              <DropdownMenuItem key={item.id} disabled={busy} onClick={() => open(item.id)}>
                {item.label}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={columnId !== null} onOpenChange={(openState) => !openState && setColumnId(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Mass update · {active?.label ?? columnId ?? ""}</DialogTitle>
            <DialogDescription>
              Writes {selected.length} selected {selected.length === 1 ? "row" : "rows"} on this list. Ana
              is skipped. Bound is signature-only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{active?.label ?? "Value"}</Label>
              {useSelect ? (
                <select
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  data-testid="mass-update-value"
                >
                  {options.map((option) => (
                    <option key={option.value || "default"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="mt-1 h-8"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  data-testid="mass-update-value"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setColumnId(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy || (!value && !isFollowUpTemplateColumn(columnId ?? ""))} onClick={() => void apply()}>
              Update {selected.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
