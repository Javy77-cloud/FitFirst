"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyMassTags } from "@/app/actions/list-bulk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTagLabel, type TagModule } from "@/lib/tags/module-tags";
import { tagChipStyle, type TagColorMap } from "@/lib/tags/tag-colors";

export type MassTagCatalogRow = { name: string; color: string | null };

export function MassTagMenu({
  module,
  tagModule,
  selected,
  catalog,
  busy,
  onBusy,
  onMessage,
  onClear,
}: {
  module: string;
  tagModule: TagModule;
  selected: string[];
  catalog: MassTagCatalogRow[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "replace">("add");

  if (selected.length === 0) return null;

  const colors: TagColorMap = {};
  for (const row of catalog) {
    if (row.color) colors[row.name] = row.color;
  }

  function toggle(name: string) {
    setDraft((list) => (list.includes(name) ? list.filter((item) => item !== name) : [...list, name]));
  }

  async function apply() {
    onBusy(true);
    const form = new FormData();
    form.set("module", module);
    form.set("mode", mode);
    form.set("tags", draft.join(","));
    for (const id of selected) form.append("recordId", id);
    const result = await applyMassTags(form);
    onMessage(result.message);
    onBusy(false);
    if (result.ok) {
      setOpen(false);
      setDraft([]);
      onClear();
      router.refresh();
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        data-testid="mass-tag-trigger"
        data-ff-mass-tag=""
        onClick={() => {
          setDraft([]);
          setMode("add");
          setOpen(true);
        }}
      >
        Mass tag
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton data-ff-mass-tag-dialog="">
          <DialogHeader>
            <DialogTitle>Mass tag · {selected.length} selected</DialogTitle>

          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="mass-tag-mode"
                  checked={mode === "add"}
                  onChange={() => setMode("add")}
                />
                Add
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="mass-tag-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                />
                Replace
              </label>
            </div>
            {catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No catalog tags yet.</p>
            ) : (
              <ul className="max-h-56 space-y-0.5 overflow-auto">
                {catalog.map((row) => {
                  const checked = draft.includes(row.name);
                  const style = tagChipStyle(row.color);
                  return (
                    <li key={row.name}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-navy hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(row.name)}
                          className="size-3.5 accent-primary"
                          data-ff-mass-tag-option={row.name}
                        />
                        <span
                          className={
                            style
                              ? "rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
                              : "rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
                          }
                          style={style}
                        >
                          {formatTagLabel(row.name)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || (mode === "add" && draft.length === 0)}
              onClick={() => void apply()}
              data-testid="mass-tag-apply"
            >
              {mode === "replace" ? "Replace on" : "Add to"} {selected.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
