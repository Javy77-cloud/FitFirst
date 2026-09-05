"use client";

import { useState, type ReactNode } from "react";
import type { HomeWidgetId } from "@/lib/home/layout";
import { WidgetChrome } from "@/components/home/widget-chrome";
import { useHomeLayout } from "@/components/home/use-home-layout";

export function HomeBoard({
  widgets,
}: {
  widgets: Partial<Record<HomeWidgetId, ReactNode>>;
}) {
  const { layout, setSpan, move } = useHomeLayout();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="grid auto-rows-[minmax(10rem,auto)] grid-cols-2 gap-3 xl:grid-cols-4">
      {layout.map((item) => {
        const body = widgets[item.id];
        if (!body) return null;
        return (
          <WidgetChrome
            key={item.id}
            span={item.span}
            dragging={dragging === item.id}
            over={over === item.id && dragging !== item.id}
            onSpan={(span) => setSpan(item.id, span)}
            onDragStart={() => setDragging(item.id)}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            onDragOver={() => setOver(item.id)}
            onDrop={() => {
              if (dragging) move(dragging, item.id);
              setDragging(null);
              setOver(null);
            }}
          >
            {body}
          </WidgetChrome>
        );
      })}
    </div>
  );
}

export function HomeLayoutReset() {
  const { reset } = useHomeLayout();
  return (
    <button type="button" onClick={reset} className="text-sm text-primary hover:underline">
      Reset tile layout
    </button>
  );
}
