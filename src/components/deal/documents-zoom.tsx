"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DOCS_ZOOM_DEFAULT,
  DOCS_ZOOM_STORAGE_KEY,
  documentsFitScale,
  parseDocsZoomMode,
  type DocsZoomMode,
} from "@/lib/deals/documents-zoom";

/** Reserve space for the shared "Shopping lives here" note under the panel. */
const PAGE_NOTE_RESERVE = 72;

export function DocumentsZoom({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DocsZoomMode>(DOCS_ZOOM_DEFAULT);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(parseDocsZoomMode(window.sessionStorage.getItem(DOCS_ZOOM_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(DOCS_ZOOM_STORAGE_KEY, mode);
  }, [mode]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    function measure() {
      if (!viewport || !content) return;
      if (mode !== "fit") {
        setScale(1);
        viewport.style.height = "";
        return;
      }
      const top = viewport.getBoundingClientRect().top;
      const availH = window.innerHeight - top - PAGE_NOTE_RESERVE;
      const availW = viewport.clientWidth;
      const next = documentsFitScale(content.scrollWidth, content.scrollHeight, availW, availH);
      setScale((prev) => (Math.abs(prev - next) < 0.002 ? prev : next));
      viewport.style.height = `${Math.max(1, content.scrollHeight * next)}px`;
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode]);

  return (
    <div className="flex w-full flex-col gap-2" data-ff-docs-zoom={mode}>
      <div className="flex flex-wrap items-center justify-end gap-1" data-ff-docs-zoom-toolbar="">
        <Button
          type="button"
          size="xs"
          variant={mode === "fit" ? "default" : "outline"}
          aria-pressed={mode === "fit"}
          data-ff-docs-zoom-fit=""
          onClick={() => setMode("fit")}
        >
          Fit to screen
        </Button>
        <Button
          type="button"
          size="xs"
          variant={mode === "100" ? "default" : "outline"}
          aria-pressed={mode === "100"}
          data-ff-docs-zoom-full=""
          onClick={() => setMode("100")}
        >
          100%
        </Button>
      </div>
      <div
        ref={viewportRef}
        className={mode === "fit" ? "overflow-hidden" : undefined}
        data-ff-docs-zoom-viewport=""
      >
        <div
          ref={contentRef}
          data-ff-docs-zoom-content=""
          style={
            mode === "fit"
              ? {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: "100%",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
