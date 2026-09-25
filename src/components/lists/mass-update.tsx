"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyMassUpdate } from "@/app/actions/mass-update";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { withNoneOption } from "@/lib/ui/select-options";
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
  /** Available editable list columns — full Columns picker catalog (minus non-writable). */
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
    let raw: Array<{ value: string; label: string }> = [];
    let isSelect = false;
    if (isStatusLikeColumn(columnId)) {
      raw = massUpdateStatusOptions(module);
      isSelect = true;
    } else if (columnId === "source") {
      raw = massUpdateSourceOptions();
      isSelect = true;
    } else if (isOwnerLikeColumn(columnId)) {
      raw = owners.map((row) => ({ value: row.id, label: row.name }));
      isSelect = true;
    } else if (isFollowUpTemplateColumn(columnId)) {
      return [{ value: "", label: "None" }, ...templates.map((row) => ({ value: row.id, label: row.name }))];
    } else if (columnId === "line" || columnId === "lines") {
      raw = massUpdateLineOptions();
      isSelect = true;
    } else if (isSellingAgencyColumn(columnId)) {
      raw = fieldOptions[columnId]?.length ? fieldOptions[columnId] : massUpdateSellingAgencyOptions();
      isSelect = true;
    } else if (fieldOptions[columnId]?.length) {
      raw = fieldOptions[columnId];
      isSelect = true;
    }
    if (!isSelect) return []; // free-text columns stay Input (empty allowed by typing clear)
    return withNoneOption(raw);
  }, [columnId, fieldOptions, module, owners, templates]);

  if (selected.length === 0) return null;

  function open(next: string) {
    setColumnId(next);
    // Default to None/empty — never force the first real option.
    setValue("");
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
            <DropdownMenuItem disabled>No editable columns</DropdownMenuItem>
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
            <Button type="button" size="sm" disabled={busy} onClick={() => void apply()}>
              Update {selected.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
