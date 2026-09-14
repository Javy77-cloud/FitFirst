"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { ConfigurePageFiltersButton } from "@/components/filters/configure-page-filters";
import { usePageFilterChrome } from "@/components/filters/page-filter-chrome-context";
import { ManageTagsDialog } from "@/components/tags/manage-tags-dialog";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { normalizePageFilterModule } from "@/lib/page-filters";
import { tagModuleForList, tagModuleLabel, type TagModule } from "@/lib/tags/module-tags";
import { cn } from "@/lib/utils";

const triggerClass = cn(
  "inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-navy",
  "hover:bg-muted",
);

export function SheetSettingsMenu({
  moduleId,
  tagModule: tagModuleProp,
}: {
  moduleId?: string;
  tagModule?: TagModule | null;
}) {
  const mounted = useClientMounted();
  const tagModule = tagModuleProp ?? (moduleId ? tagModuleForList(moduleId) : null);
  const pageFilterModule = normalizePageFilterModule(moduleId);
  const chrome = usePageFilterChrome();
  const canConfigure =
    Boolean(chrome?.canConfigure) &&
    pageFilterModule != null &&
    (chrome?.moduleId ? normalizePageFilterModule(chrome.moduleId) === pageFilterModule : true);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [panel, setPanel] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function place() {
      const box = buttonRef.current?.getBoundingClientRect();
      if (!box) return;
      setPanel({ top: box.bottom + 4, right: window.innerWidth - box.right });
    }
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  if (!tagModule && !pageFilterModule) return null;

  if (!mounted) {
    return (
      <button type="button" aria-label="Sheet settings" title="Settings" className={triggerClass}>
        <MoreHorizontal className="size-3.5" />
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Sheet settings"
        title="Settings"
        data-ff-sheet-settings=""
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <MoreHorizontal className="size-3.5" />
        <span className="sr-only">Settings</span>
      </button>
      {open && panel && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[80] min-w-48 rounded-md border border-border bg-card p-1 text-sm shadow-lg"
              style={{ top: panel.top, right: panel.right }}
              data-ff-sheet-settings-menu=""
            >
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Settings
              </p>
              {tagModule ? (
                <button
                  type="button"
                  data-ff-manage-tags=""
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    setManageOpen(true);
                  }}
                >
                  Manage Tags
                  <span className="ml-auto text-[11px] text-muted-foreground">{tagModuleLabel(tagModule)}</span>
                </button>
              ) : null}
              {canConfigure ? (
                <button
                  type="button"
                  data-ff-configure-page-filters=""
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    setConfigureOpen(true);
                  }}
                >
                  Configure page filters
                </button>
              ) : null}
              <Link
                href="/settings/developer-hub/macros"
                data-ff-add-macro=""
                className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                Add Macro
              </Link>
            </div>,
            document.body,
          )
        : null}
      {tagModule ? <ManageTagsDialog module={tagModule} open={manageOpen} onOpenChange={setManageOpen} /> : null}
      {pageFilterModule ? (
        <ConfigurePageFiltersButton
          moduleId={pageFilterModule}
          hideTrigger
          open={configureOpen}
          onOpenChange={setConfigureOpen}
        />
      ) : null}
    </>
  );
}
