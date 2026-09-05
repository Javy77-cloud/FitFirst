"use client";

import { useState } from "react";
import { Check, ChevronDown, LayoutGrid, Pencil, Settings2 } from "lucide-react";
import {
  renameCustomHomeLayout,
  saveCustomHomeLayout,
  saveHomeBookScope,
  saveHomeHiddenWidgets,
  saveHomePreset,
  saveResizeTiles,
  selectCustomHomeLayout,
} from "@/app/actions/home-dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  DASHBOARD_PRESETS,
  DASHBOARD_PRESET_LABEL,
  HOME_WIDGET_IDS,
  HOME_WIDGET_LABEL,
  type BookScope,
  type DashboardPreset,
  type HomeWidgetId,
} from "@/lib/home/presets";
import { LAYOUT_WIDGET_LABEL, WIDGET_SPANS, type NamedHomeLayout, type WidgetSpan } from "@/lib/home/layout";
import { cn } from "@/lib/utils";
import { useHomeLayout } from "@/components/home/use-home-layout";

export function DashboardToolbar({
  preset,
  hiddenWidgets,
  bookScope,
  canToggleBook,
  customLayouts,
  activeLayoutId,
  resizeTiles,
}: {
  preset: DashboardPreset;
  hiddenWidgets: HomeWidgetId[];
  bookScope: BookScope;
  canToggleBook: boolean;
  customLayouts: NamedHomeLayout[];
  activeLayoutId: string | null;
  resizeTiles: boolean;
}) {
  const activeCustom = customLayouts.find((row) => row.id === activeLayoutId) ?? null;
  const layoutLabel = activeCustom?.name ?? DASHBOARD_PRESET_LABEL[preset];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="size-3" />
          Layout
        </span>
        <LayoutDropdown
          label={layoutLabel}
          preset={preset}
          customLayouts={customLayouts}
          activeLayoutId={activeLayoutId}
        />
        {canToggleBook ? (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Book
            </span>
            <SectionDropdown
              ariaLabel="Book scope"
              value={bookScope === "my_book" ? "My Book" : "Agency Book"}
              options={[
                { id: "my_book", label: "My Book", active: bookScope === "my_book" },
                { id: "agency", label: "Agency Book", active: bookScope === "agency" },
              ]}
              onSelect={(id) => {
                const form = new FormData();
                form.set("bookScope", id);
                void saveHomeBookScope(form);
              }}
            />
          </>
        ) : null}
      </div>
      <div className="ml-auto">
        <WidgetSettingsDialog hiddenWidgets={hiddenWidgets} resizeTiles={resizeTiles} />
      </div>
    </div>
  );
}

function LayoutDropdown({
  label,
  preset,
  customLayouts,
  activeLayoutId,
}: {
  label: string;
  preset: DashboardPreset;
  customLayouts: NamedHomeLayout[];
  activeLayoutId: string | null;
}) {
  const { layout } = useHomeLayout();
  const [saveOpen, setSaveOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function pickPreset(id: string) {
    const form = new FormData();
    form.set("preset", id);
    void saveHomePreset(form);
  }

  function pickCustom(id: string) {
    const form = new FormData();
    form.set("layoutId", id);
    void selectCustomHomeLayout(form);
  }

  function submitSave() {
    const form = new FormData();
    form.set("name", draftName);
    form.set("placements", JSON.stringify(layout));
    void saveCustomHomeLayout(form);
    setDraftName("");
    setSaveOpen(false);
  }

  function submitRename() {
    if (!renameId) return;
    const form = new FormData();
    form.set("layoutId", renameId);
    form.set("name", draftName);
    void renameCustomHomeLayout(form);
    setDraftName("");
    setRenameId(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Home layout"
          render={<Button type="button" size="xs" variant="outline" className="bg-card" />}
        >
          {label}
          <ChevronDown className="size-3 opacity-70" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          {DASHBOARD_PRESETS.map((id) => (
            <DropdownMenuItem
              key={id}
              onClick={() => pickPreset(id)}
              className="justify-between"
            >
              {DASHBOARD_PRESET_LABEL[id]}
              {!activeLayoutId && preset === id ? <Check className="size-3.5 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Custom layouts</DropdownMenuLabel>
          {customLayouts.length === 0 ? (
            <div className="px-1.5 py-1 text-xs text-muted-foreground">None saved yet for this user.</div>
          ) : (
            customLayouts.map((row) => (
              <DropdownMenuItem
                key={row.id}
                onClick={() => pickCustom(row.id)}
                className="justify-between"
              >
                <span className="min-w-0 truncate">{row.name}</span>
                {activeLayoutId === row.id ? <Check className="size-3.5 text-primary" /> : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuItem
            onClick={() => {
              setDraftName("");
              setSaveOpen(true);
            }}
          >
            Save as custom layout…
          </DropdownMenuItem>
          {activeLayoutId ? (
            <DropdownMenuItem
              onClick={() => {
                const current = customLayouts.find((row) => row.id === activeLayoutId);
                setDraftName(current?.name ?? "");
                setRenameId(activeLayoutId);
              }}
            >
              <Pencil className="size-3" />
              Rename current layout…
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Name this layout</DialogTitle>
            <DialogDescription>
              Saves the current tile order and sizes for you on this desk. You can rename it later.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSave();
            }}
            placeholder="Morning board"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitSave} disabled={!draftName.trim()}>
              Save layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameId)} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename layout</DialogTitle>
            <DialogDescription>The name is only for you on this desk.</DialogDescription>
          </DialogHeader>
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename();
            }}
            placeholder="Layout name"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitRename} disabled={!draftName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionDropdown({
  ariaLabel,
  value,
  options,
  onSelect,
}: {
  ariaLabel: string;
  value: string;
  options: { id: string; label: string; active: boolean }[];
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        render={<Button type="button" size="xs" variant="outline" className="bg-card" />}
      >
        {value}
        <ChevronDown className="size-3 opacity-70" data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onSelect(option.id)}
            className="justify-between"
          >
            {option.label}
            {option.active ? <Check className="size-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WidgetSettingsDialog({
  hiddenWidgets,
  resizeTiles,
}: {
  hiddenWidgets: HomeWidgetId[];
  resizeTiles: boolean;
}) {
  const { layout, setSpan, reset } = useHomeLayout();

  return (
    <Dialog>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <Settings2 className="size-3" />
        Widget settings
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Widget settings</DialogTitle>
          <DialogDescription>
            Show or hide cards, turn on corner resize, or reset the board. Resize never changes a
            neighbor&apos;s stored size.
          </DialogDescription>
        </DialogHeader>
        <form action={saveHomeHiddenWidgets} className="space-y-4">
          <label className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2">
            <input
              type="checkbox"
              defaultChecked={resizeTiles}
              className="mt-0.5"
              onChange={(event) => {
                const form = new FormData();
                form.set("resizeTiles", event.target.checked ? "1" : "0");
                void saveResizeTiles(form);
              }}
            />
            <span>
              <span className="block text-[13px] font-medium text-navy">Resize tiles</span>
              <span className="block text-[12px] text-muted-foreground">
                Makes tiles customizable. Pull a corner to stretch or shrink. Preset sizes stay as
                shortcuts.
              </span>
            </span>
          </label>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Visible cards
            </div>
            <ul className="grid max-h-40 gap-1.5 overflow-auto pr-1 sm:grid-cols-2">
              {HOME_WIDGET_IDS.map((id) => (
                <li key={id}>
                  <label className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-[12px]">
                    <input
                      type="checkbox"
                      name={`show_${id}`}
                      value="1"
                      defaultChecked={!hiddenWidgets.includes(id)}
                    />
                    <span className="text-navy">{HOME_WIDGET_LABEL[id]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tile sizes
            </div>
            <ul className="grid max-h-56 gap-1.5 overflow-auto pr-1">
              {layout.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded-md border border-border bg-card px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-[12px] text-navy">{LAYOUT_WIDGET_LABEL[item.id]}</span>
                  <div className="flex flex-wrap gap-1">
                    {WIDGET_SPANS.map((span) => (
                      <SizeChip
                        key={span}
                        span={span}
                        active={item.span === span}
                        onSelect={() => setSpan(item.id, span)}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              Reset tile layout
            </Button>
            <Button type="submit" size="sm">
              Save widgets
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SizeChip({
  span,
  active,
  onSelect,
}: {
  span: WidgetSpan;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "h-6 rounded-sm border px-1.5 text-[10px] font-medium",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-navy",
      )}
    >
      {span.replace("x", "×")}
    </button>
  );
}
