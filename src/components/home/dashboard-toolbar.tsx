"use client";

import { LayoutGrid, Settings2 } from "lucide-react";
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
  DASHBOARD_PRESETS,
  DASHBOARD_PRESET_LABEL,
  HOME_WIDGET_IDS,
  HOME_WIDGET_LABEL,
  type BookScope,
  type DashboardPreset,
  type HomeWidgetId,
} from "@/lib/home/presets";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="size-3" />
          Layout
        </span>
        {DASHBOARD_PRESETS.map((id) => (
          <form key={id} action={saveHomePreset}>
            <input type="hidden" name="preset" value={id} />
            <Button
              type="submit"
              size="xs"
              variant={preset === id ? "default" : "outline"}
              className={preset === id ? "" : "bg-card"}
            >
              {DASHBOARD_PRESET_LABEL[id]}
            </Button>
          </form>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {canToggleBook ? (
          <>
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              Book
            </span>
            {(["my_book", "agency"] as const).map((id) => (
              <form key={id} action={saveHomeBookScope}>
                <input type="hidden" name="bookScope" value={id} />
                <Button
                  type="submit"
                  size="xs"
                  variant={bookScope === id ? "default" : "outline"}
                >
                  {id === "my_book" ? "My book" : "Agency-wide"}
                </Button>
              </form>
            ))}
          </>
        ) : null}
        <Dialog>
          <DialogTrigger render={<Button size="xs" variant="outline" />}>
            <Settings2 className="size-3" />
            Widget settings
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Widget settings</DialogTitle>
              <DialogDescription>
                Uncheck a card to hide it. The preset still decides the starting set.
              </DialogDescription>
            </DialogHeader>
            <form action={saveHomeHiddenWidgets} className="space-y-3">
              <ul className="grid max-h-72 gap-1.5 overflow-auto pr-1 sm:grid-cols-2">
                {HOME_WIDGET_IDS.map((id) => (
                  <li key={id}>
                    <label className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        name={`show_${id}`}
                        value="1"
                        defaultChecked={!hiddenWidgets.includes(id)}
                      />
                      <span className={cn("text-navy")}>{HOME_WIDGET_LABEL[id]}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button type="submit" size="sm">
                  Save widgets
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
