"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { resetNavLayoutAction, saveNavLayoutAction } from "@/app/actions/nav-layout";
import { pathIsActive } from "@/components/desk-nav-groups";
import type { Actor } from "@/lib/auth/rbac";
import {
  addSubmenuLink,
  applyNavDrop,
  availableSubmenuLinks,
  defaultStoredNavLayout,
  DIVIDER_ID,
  dropKey,
  NAV_LAYOUT_VERSION,
  normalizeNavLayout,
  nudgePrimary,
  nudgeSubmenu,
  parseDropKey,
  primaryIdForPath,
  resolveNavLayout,
  splitNavSections,
  togglePrimaryHidden,
  visibleNavItems,
  type ResolvedNavItem,
  type ResolvedNavRow,
  type StoredNavLayout,
} from "@/lib/desk/nav-layout";
import {
  readSidebarPrefs,
  resolveOpenSection,
  toggleAccordionId,
  writeSidebarPrefs,
  type SidebarRail,
} from "@/lib/desk/sidebar-accordion";
import { cn } from "@/lib/utils";

const NAV_LAYOUT_CACHE = `ff-nav-layout:v${NAV_LAYOUT_VERSION}`;

type DragPayload = { id: string };

function readCachedLayout(): StoredNavLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NAV_LAYOUT_CACHE);
    return raw ? normalizeNavLayout(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeCachedLayout(layout: StoredNavLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAV_LAYOUT_CACHE, JSON.stringify(normalizeNavLayout(layout)));
  } catch {
    /* private mode / quota */
  }
}

function dropKeyFromPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const target = el?.closest("[data-nav-drop]") as HTMLElement | null;
  return target?.dataset.navDrop ?? null;
}

export function DeskSidebar({
  unread,
  actor,
  signedIn,
  isAdmin,
  initialLayout,
}: {
  unread: number;
  actor: Actor;
  signedIn: boolean;
  isAdmin: boolean;
  initialLayout?: StoredNavLayout | null;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [layout, setLayout] = useState<StoredNavLayout>(() =>
    normalizeNavLayout(initialLayout ?? defaultStoredNavLayout()),
  );
  const [openId, setOpenId] = useState(() => primaryIdForPath(pathname, layout, isAdmin));
  const [rail, setRail] = useState<SidebarRail>("expanded");
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const persistEnabled = signedIn && Boolean(actor.id);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragPayload | null>(null);
  const layoutRef = useRef(layout);
  const narrow = rail === "narrow";
  const allRows = resolveNavLayout(layout, { isAdmin });
  const { main, utility } = splitNavSections(allRows);
  layoutRef.current = layout;

  useEffect(() => {
    const prefs = readSidebarPrefs();
    setRail(prefs.rail);
    const cached = persistEnabled ? null : readCachedLayout();
    const nextLayout = normalizeNavLayout(initialLayout ?? cached ?? defaultStoredNavLayout());
    setLayout(nextLayout);
    setOpenId(resolveOpenSection(pathname, prefs.openId));
    setReady(true);
    // First paint uses the server layout / active route; local prefs hydrate once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const routePrimary = primaryIdForPath(pathname, layout, isAdmin);
    if (routePrimary) setOpenId(routePrimary);
  }, [pathname, ready, layout, isAdmin]);

  useEffect(() => {
    if (!ready) return;
    writeSidebarPrefs({ openId, rail });
  }, [openId, rail, ready]);

  function persist(next: StoredNavLayout) {
    const normalized = normalizeNavLayout(next);
    setLayout(normalized);
    writeCachedLayout(normalized);
    setSaveError(null);
    if (!persistEnabled) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      startTransition(() => {
        void saveNavLayoutAction(normalized).then((result) => {
          if (!result.ok) setSaveError(result.error);
        });
      });
    }, 200);
  }

  function applyDrop(key: string | null) {
    const payload = dragRef.current;
    dragRef.current = null;
    setDropTarget(null);
    if (!payload || !key) return;
    const target = parseDropKey(key);
    persist(applyNavDrop(layoutRef.current, payload.id, target));
  }

  function beginDrag(payload: DragPayload) {
    dragRef.current = payload;
  }

  function onChevron(id: string) {
    setOpenId((current) => toggleAccordionId(current, id));
  }

  function resetLayout() {
    const next = defaultStoredNavLayout();
    setLayout(next);
    writeCachedLayout(next);
    setSaveError(null);
    if (!persistEnabled) return;
    startTransition(() => {
      void resetNavLayoutAction().then((result) => {
        if (!result.ok) setSaveError(result.error);
        else setLayout(result.layout);
      });
    });
  }

  function bindDrag(id: string, label: string) {
    return {
      draggable: customizing,
      title: customizing ? `Drag to move ${label}` : undefined,
      onPointerDown: (event: React.PointerEvent) => {
        if (!customizing || event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("a, button, select, input")) return;
        event.preventDefault();
        beginDrag({ id });
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent) => {
        if (!dragRef.current) return;
        const key = dropKeyFromPoint(event.clientX, event.clientY);
        setDropTarget(key);
        if (key?.startsWith("into:") || key?.startsWith("end-folder:")) {
          const folderId = key.startsWith("into:") ? key.slice(5) : key.slice("end-folder:".length);
          if (folderId) setOpenId(folderId);
        }
      },
      onPointerUp: (event: React.PointerEvent) => {
        if (!dragRef.current) return;
        applyDrop(dropKeyFromPoint(event.clientX, event.clientY));
      },
      onPointerCancel: () => {
        dragRef.current = null;
        setDropTarget(null);
      },
      onDragStart: (event: React.DragEvent) => {
        if (!customizing) return;
        beginDrag({ id });
        event.dataTransfer.setData("text/plain", id);
        event.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => {
        dragRef.current = null;
        setDropTarget(null);
      },
    };
  }

  function dropHandlers(key: string) {
    if (!customizing) return {};
    return {
      "data-nav-drop": key,
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: () => {
        setDropTarget((current) => (current === key ? null : current));
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        applyDrop(key);
      },
    };
  }

  function renderItem(row: ResolvedNavItem, sectionRows: ResolvedNavItem[]) {
    const open = openId === row.id;
    const Icon = row.link.icon;
    const panelId = `ff-nav-${row.id}`;
    const primaryActive = pathIsActive(pathname, row.link);
    const showChevron = !narrow && (customizing || row.submenu.length > 0);
    const addable = customizing ? availableSubmenuLinks(layout, row.id, { isAdmin }) : [];
    const intoKey = dropKey({ type: "into", id: row.id });
    const beforeKey = dropKey({ type: "before", id: row.id });
    const afterKey = dropKey({ type: "after", id: row.id });
    const endFolderKey = dropKey({ type: "end-folder", parentId: row.id });
    const rowIndex = sectionRows.findIndex((item) => item.id === row.id);

    return (
      <div key={row.id} className="relative">
        {customizing ? (
          <div
            {...dropHandlers(beforeKey)}
            className={cn(
              "absolute inset-x-0 -top-1 z-10 h-2 rounded-sm",
              dropTarget === beforeKey ? "bg-[var(--ff-card)]" : "bg-transparent",
            )}
            aria-hidden
          />
        ) : null}
        <div
          {...dropHandlers(intoKey)}
          {...bindDrag(row.id, row.link.label)}
          className={cn(
            "flex items-center rounded-md",
            dropTarget === intoKey ? "bg-white/20 ring-2 ring-[var(--ff-card)]" : "",
            customizing && row.hidden ? "opacity-55" : "",
            customizing ? "cursor-grab active:cursor-grabbing" : "",
          )}
        >
          {customizing && !narrow ? (
            <>
              <span className="px-0.5 text-sidebar-foreground/70" aria-hidden>
                <GripVertical className="size-3.5" />
              </span>
              <span className="flex flex-col">
                <button
                  type="button"
                  title={`Move ${row.link.label} up`}
                  aria-label={`Move ${row.link.label} up`}
                  disabled={rowIndex <= 0}
                  onClick={() => persist(nudgePrimary(layout, row.id, -1))}
                  className="rounded-sm p-0 text-sidebar-foreground/70 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  title={`Move ${row.link.label} down`}
                  aria-label={`Move ${row.link.label} down`}
                  disabled={rowIndex < 0 || rowIndex >= sectionRows.length - 1}
                  onClick={() => persist(nudgePrimary(layout, row.id, 1))}
                  className="rounded-sm p-0 text-sidebar-foreground/70 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown className="size-3" />
                </button>
              </span>
            </>
          ) : null}
          <Link
            href={row.link.href}
            title={row.link.label}
            className={cn(
              "flex min-w-0 flex-1 items-center rounded-md py-2 text-sm font-semibold",
              narrow ? "justify-center px-0" : "gap-2 px-2",
              primaryActive
                ? "bg-[var(--ff-card)] text-navy"
                : "text-white hover:bg-sidebar-accent hover:text-white",
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" />
            {narrow ? (
              <span className="sr-only">{row.link.label}</span>
            ) : (
              <span className="flex-1 truncate">
                {row.link.label}
                {customizing && row.hidden ? (
                  <span className="ml-1 font-normal text-sidebar-foreground/70">Hidden</span>
                ) : null}
              </span>
            )}
          </Link>
          {customizing && !narrow && row.hidable ? (
            <button
              type="button"
              title={row.hidden ? `Show ${row.link.label} in the menu` : `Hide ${row.link.label} from the menu`}
              aria-label={row.hidden ? `Show ${row.link.label}` : `Hide ${row.link.label}`}
              aria-pressed={row.hidden}
              onClick={() => persist(togglePrimaryHidden(layout, row.id))}
              className="rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            >
              {row.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
          ) : null}
          {showChevron ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              title={open ? `Collapse ${row.link.label}` : `Expand ${row.link.label}`}
              onClick={() => onChevron(row.id)}
              className="rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            >
              <ChevronDown className={cn("size-3.5 transition", open ? "rotate-180" : "")} />
            </button>
          ) : null}
        </div>
        {open && !narrow ? (
          <div id={panelId} className="mt-0.5 space-y-0.5" role="region" aria-label={row.link.label}>
            {row.submenu.map((item, itemIndex) => {
              const SubIcon = item.icon;
              const settingsSection = search.get("section");
              const active = item.href.includes("section=")
                ? pathname === "/me" && settingsSection === "signature" && item.href.includes("section=signature")
                : pathIsActive(pathname, item);
              const beforeChild = dropKey({ type: "before", id: item.id });
              const afterChild = dropKey({ type: "after", id: item.id });
              return (
                <div key={`${row.id}-${item.id}`} className="relative">
                  {customizing ? (
                    <div
                      {...dropHandlers(beforeChild)}
                      className={cn(
                        "absolute inset-x-0 -top-1 z-10 h-2 rounded-sm",
                        dropTarget === beforeChild ? "bg-[var(--ff-card)]" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    {...dropHandlers(afterChild)}
                    {...bindDrag(item.id, item.label)}
                    className={cn(
                      "flex items-center rounded-md",
                      dropTarget === afterChild ? "bg-white/20 ring-2 ring-[var(--ff-card)]" : "",
                      customizing ? "cursor-grab active:cursor-grabbing" : "",
                    )}
                  >
                    {customizing ? (
                      <>
                        <span className="px-0.5 text-sidebar-foreground/60" aria-hidden>
                          <GripVertical className="size-3.5" />
                        </span>
                        <span className="flex flex-col">
                          <button
                            type="button"
                            title={`Move ${item.label} up`}
                            aria-label={`Move ${item.label} up`}
                            disabled={itemIndex === 0}
                            onClick={() => persist(nudgeSubmenu(layout, row.id, item.id, -1))}
                            className="rounded-sm p-0 text-sidebar-foreground/60 hover:text-white disabled:opacity-30"
                          >
                            <ChevronUp className="size-3" />
                          </button>
                          <button
                            type="button"
                            title={`Move ${item.label} down`}
                            aria-label={`Move ${item.label} down`}
                            disabled={itemIndex === row.submenu.length - 1}
                            onClick={() => persist(nudgeSubmenu(layout, row.id, item.id, 1))}
                            className="rounded-sm p-0 text-sidebar-foreground/60 hover:text-white disabled:opacity-30"
                          >
                            <ChevronDown className="size-3" />
                          </button>
                        </span>
                      </>
                    ) : null}
                    <Link
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex min-w-0 flex-1 items-center rounded-md py-1.5 text-sm",
                        customizing ? "gap-2 px-1.5" : "gap-2 px-2.5",
                        active
                          ? "bg-[var(--ff-card)] text-navy"
                          : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white",
                      )}
                    >
                      <SubIcon className="size-3.5 shrink-0 opacity-80" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.match === "/notifications" && unread > 0 ? (
                        <span className="rounded-sm bg-fit-flag px-1.5 text-caption font-semibold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                </div>
              );
            })}
            {customizing ? (
              <div
                {...dropHandlers(endFolderKey)}
                className={cn(
                  "mx-2 rounded-md border border-dashed px-2 py-1.5 text-caption",
                  dropTarget === endFolderKey
                    ? "border-[var(--ff-card)] bg-white/15 text-white"
                    : "border-sidebar-border/80 text-sidebar-foreground/70",
                )}
              >
                Drop here to nest under {row.link.label}
              </div>
            ) : null}
            {customizing ? (
              addable.length > 0 ? (
                <label className="block px-2.5 py-1 text-caption text-sidebar-foreground/80">
                  <span className="sr-only">Add a link under {row.link.label}</span>
                  <select
                    aria-label={`Add a link under ${row.link.label}`}
                    className="h-7 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-1 text-caption text-white"
                    value=""
                    onChange={(event) => {
                      const id = event.target.value;
                      if (!id) return;
                      persist(addSubmenuLink(layout, row.id, id));
                      setOpenId(row.id);
                    }}
                  >
                    <option value="">Add link…</option>
                    {addable.map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="px-2.5 py-1 text-caption text-sidebar-foreground/60">
                  Every unused desk link is already placed.
                </div>
              )
            ) : null}
          </div>
        ) : customizing && !narrow ? (
          <div
            {...dropHandlers(endFolderKey)}
            className={cn(
              "mx-2 mt-0.5 rounded-md border border-dashed px-2 py-1 text-caption",
              dropTarget === endFolderKey
                ? "border-[var(--ff-card)] bg-white/15 text-white"
                : "border-transparent text-sidebar-foreground/50",
            )}
          >
            {dropTarget === endFolderKey ? `Drop into ${row.link.label}` : ""}
          </div>
        ) : null}
        {customizing && sectionRows.at(-1)?.id === row.id ? (
          <div
            {...dropHandlers(afterKey)}
            className={cn(
              "mt-1 h-2 rounded-sm",
              dropTarget === afterKey ? "bg-[var(--ff-card)]" : "bg-transparent",
            )}
            aria-hidden
          />
        ) : null}
      </div>
    );
  }

  function renderSection(rows: ResolvedNavRow[], label: string) {
    const items = visibleNavItems(rows, customizing);
    return (
      <div className="space-y-0.5" aria-label={label}>
        {rows.map((row) => {
          if (row.kind === "divider") {
            const before = dropKey({ type: "before", id: DIVIDER_ID });
            return (
              <div
                key={DIVIDER_ID}
                {...(customizing ? { ...dropHandlers(before), ...bindDrag(DIVIDER_ID, "Divider") } : {})}
                className={cn(
                  "my-2 border-t border-sidebar-border",
                  customizing ? "cursor-grab py-1" : "",
                  dropTarget === before ? "border-[var(--ff-card)] border-t-2" : "",
                )}
                role="separator"
              />
            );
          }
          return renderItem(row, items);
        })}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "ff-no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex",
        narrow ? "w-14" : "w-60",
      )}
    >
      <div className={cn("relative shrink-0 border-b border-sidebar-border", narrow ? "px-2 py-3" : "px-4 py-4")}>
        <Link href="/" className={cn("block pr-8", narrow ? "pr-0" : "")} title="FitFirst home">
          <div className={cn("font-semibold tracking-tight text-white", narrow ? "text-center text-sm" : "text-lg")}>
            {narrow ? "FF" : "FitFirst"}
          </div>
          {narrow ? null : (
            <div className="text-caption text-sidebar-foreground/80">
              Owner desk · filter-first P&amp;C
            </div>
          )}
        </Link>
        <button
          type="button"
          title={narrow ? "Expand sidebar" : "Collapse sidebar to icons"}
          aria-pressed={narrow}
          onClick={() => {
            setCustomizing(false);
            setRail((current) => (current === "narrow" ? "expanded" : "narrow"));
          }}
          className={cn(
            "absolute top-3 right-2 inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
            narrow ? "right-1 top-2" : "",
          )}
        >
          {narrow ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          <span className="sr-only">{narrow ? "Expand sidebar" : "Collapse sidebar"}</span>
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Desk">
        {renderSection(main, "Primary")}
        <div
          {...(customizing ? dropHandlers("end-primary") : {})}
          className={cn(
            "min-h-2 rounded-md",
            customizing && dropTarget === "end-primary" ? "bg-white/20 ring-2 ring-[var(--ff-card)]" : "",
          )}
        />
      </nav>
      <div className={cn("shrink-0 border-t border-sidebar-border", narrow ? "px-1.5 py-2" : "px-2 py-2")}>
        <nav className="space-y-0.5" aria-label="Utility">
          {renderSection(utility, "Utility")}
        </nav>
        {narrow ? null : (
          <div className="mt-2 space-y-1.5 border-t border-sidebar-border pt-2">
            <button
              type="button"
              aria-pressed={customizing}
              onClick={() => setCustomizing((current) => !current)}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-1.5 text-caption text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            >
              <Settings2 className="size-3.5 shrink-0" />
              {customizing ? "Done customizing" : "Customize menu"}
            </button>
            {customizing ? (
              <button
                type="button"
                onClick={resetLayout}
                className="flex w-full items-center rounded-md px-1 py-1.5 text-caption text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
              >
                Reset to default
              </button>
            ) : null}
            {saveError ? <p className="px-1 text-caption text-amber-200">{saveError}</p> : null}
            {customizing ? (
              <p className="px-1 text-caption text-sidebar-foreground/60">
                Drag any row. Drop on a folder to nest it, or on the main list to pull it out. Saved
                to your desk only.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
