"use client";

import { Check, ChevronDown, LayoutGrid, Settings2 } from "lucide-react";
import { saveHomeBookScope, saveHomeHiddenWidgets, saveHomePreset } from "@/app/actions/home-dashboard";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { useHomeLayout } from "@/components/home/use-home-layout";

export function DashboardToolbar({
  preset,
  hiddenWidgets,
  bookScope,
  canToggleBook,
}: {
  preset: DashboardPreset;
  hiddenWidgets: HomeWidgetId[];
  bookScope: BookScope;
  canToggleBook: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="size-3" />
          Layout
        </span>
        <SectionDropdown
          ariaLabel="Home layout"
          value={DASHBOARD_PRESET_LABEL[preset]}
          options={DASHBOARD_PRESETS.map((id) => ({
            id,
            label: DASHBOARD_PRESET_LABEL[id],
            active: preset === id,
          }))}
          onSelect={(id) => {
            const form = new FormData();
            form.set("preset", id);
            void saveHomePreset(form);
          }}
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
            Show or hide cards, set each tile size, or reset the board. Resize never changes a
            neighbor&apos;s stored size.
          </DialogDescription>
        </DialogHeader>
        <form action={saveHomeHiddenWidgets} className="space-y-4">
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
