"use client";

import { useState } from "react";
import { Check, ChevronDown, LayoutGrid, Pencil, Plus, Settings2 } from "lucide-react";
import {
  createHomeLayout,
  renameHomeLayout,
  saveHomeBookScope,
  saveHomeHiddenWidgets,
  saveHomePreset,
  selectHomeLayout,
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
import { Label } from "@/components/ui/label";
import {
  DASHBOARD_PRESETS,
  DASHBOARD_PRESET_LABEL,
  HOME_WIDGET_IDS,
  HOME_WIDGET_LABEL,
  type BookScope,
  type DashboardPreset,
  type HomeWidgetId,
} from "@/lib/home/presets";
import { LAYOUT_WIDGET_LABEL, WIDGET_SPANS, type WidgetSpan } from "@/lib/home/layout";
import { suggestedHomeLayoutName, type HomeCustomLayout } from "@/lib/home/custom-layouts";
import { cn } from "@/lib/utils";
import { useHomeLayout } from "@/components/home/use-home-layout";

export function DashboardToolbar({
  preset,
  hiddenWidgets,
  bookScope,
  canToggleBook,
  customLayouts,
  activeLayoutId,
}: {
  preset: DashboardPreset;
  hiddenWidgets: HomeWidgetId[];
  bookScope: BookScope;
  canToggleBook: boolean;
  customLayouts: HomeCustomLayout[];
  activeLayoutId: string | null;
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
        <HomeLayoutMenu
          label={layoutLabel}
          preset={preset}
          customLayouts={customLayouts}
          activeLayoutId={activeLayoutId}
          hiddenWidgets={hiddenWidgets}
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
        <WidgetSettingsDialog hiddenWidgets={hiddenWidgets} />
      </div>
    </div>
  );
}

function HomeLayoutMenu({
  label,
  preset,
  customLayouts,
  activeLayoutId,
  hiddenWidgets,
}: {
  label: string;
  preset: DashboardPreset;
  customLayouts: HomeCustomLayout[];
  activeLayoutId: string | null;
  hiddenWidgets: HomeWidgetId[];
}) {
  const { layout } = useHomeLayout();
  const [dialog, setDialog] = useState<null | "create" | "rename">(null);
  const [name, setName] = useState("");
  const activeCustom = customLayouts.find((row) => row.id === activeLayoutId) ?? null;

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
              onClick={() => {
                const form = new FormData();
                form.set("preset", id);
                void saveHomePreset(form);
              }}
              className="justify-between"
            >
              {DASHBOARD_PRESET_LABEL[id]}
              {!activeLayoutId && preset === id ? <Check className="size-3.5 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Custom layouts</DropdownMenuLabel>
          {customLayouts.length === 0 ? (
            <div className="px-1.5 py-1 text-xs text-muted-foreground">None yet — create one from this board.</div>
          ) : (
            customLayouts.map((row) => (
              <DropdownMenuItem
                key={row.id}
                onClick={() => {
                  const form = new FormData();
                  form.set("layoutId", row.id);
                  void selectHomeLayout(form);
                }}
                className="justify-between"
              >
                {row.name}
                {activeLayoutId === row.id ? <Check className="size-3.5 text-primary" /> : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuItem
            onClick={() => {
              setName(suggestedHomeLayoutName(customLayouts));
              setDialog("create");
            }}
          >
            <Plus className="size-3.5" />
            Create layout…
          </DropdownMenuItem>
          {activeCustom ? (
            <DropdownMenuItem
              onClick={() => {
                setName(activeCustom.name);
                setDialog("rename");
              }}
            >
              <Pencil className="size-3.5" />
              Rename “{activeCustom.name}”…
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "rename" ? "Rename layout" : "Create layout"}</DialogTitle>
            <DialogDescription>
              {dialog === "rename"
                ? "Only the name changes. Tile sizes and hidden cards stay on this layout."
                : "Saves this board’s tile order, sizes, and visible cards for you on this tenant."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData();
              form.set("name", name);
              if (dialog === "rename" && activeCustom) {
                form.set("layoutId", activeCustom.id);
                void renameHomeLayout(form);
              } else {
                form.set("placements", JSON.stringify(layout));
                form.set("hiddenWidgets", JSON.stringify(hiddenWidgets));
                void createHomeLayout(form);
              }
              setDialog(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="home-layout-name">Name</Label>
              <Input
                id="home-layout-name"
                value={name}
                maxLength={48}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="Morning board"
              />
            </div>
            <DialogFooter>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!name.trim()}>
                {dialog === "rename" ? "Save name" : "Create layout"}
              </Button>
            </DialogFooter>
          </form>
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

function WidgetSettingsDialog({ hiddenWidgets }: { hiddenWidgets: HomeWidgetId[] }) {
  const { layout, setSpan, reset, resizeTiles, setResizeTiles } = useHomeLayout();

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
            Show or hide cards, set each tile size, or reset the board. Resize never changes a
            neighbor&apos;s stored size.
          </DialogDescription>
        </DialogHeader>
        <form action={saveHomeHiddenWidgets} className="space-y-4">
          <label className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={resizeTiles}
              onChange={(event) => setResizeTiles(event.target.checked)}
            />
            <span>
              <span className="block text-[12px] font-medium text-navy">Resize tiles</span>
              <span className="block text-[11px] text-muted-foreground">
                When on, drag a tile corner to stretch or shrink. Preset sizes stay. Each tile is
                independent.
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
