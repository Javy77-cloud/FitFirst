"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resetNavLayoutAction, saveNavLayoutAction } from "@/app/actions/nav-layout";
import { pathIsActive } from "@/components/desk-nav-groups";
import type { Actor } from "@/lib/auth/rbac";
import {
  addCatalogLink,
  applyNavDrop,
  defaultStoredNavLayout,
  DIVIDER_ID,
  dropKey,
  dropKeyFromElementStack,
  NAV_LAYOUT_VERSION,
  normalizeNavLayout,
  parseDropKey,
  primaryIdForPath,
  resolveNavLayout,
  splitNavSections,
  togglePrimaryHidden,
  unusedCatalogLinks,
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
const DRAG_THRESHOLD_PX = 4;

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
  return dropKeyFromElementStack(document.elementsFromPoint(clientX, clientY));
}

function zoneClass(active: boolean, kind: "gap" | "nest") {
  if (!active) return kind === "gap" ? "bg-transparent" : "";
  return kind === "gap"
    ? "bg-[var(--ff-card)] ring-2 ring-[var(--ff-card)]"
    : "bg-white/20 ring-2 ring-[var(--ff-card)]";
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const persistEnabled = signedIn && Boolean(actor.id);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistChain = useRef(Promise.resolve());
  const persistEpoch = useRef(0);
  const dragRef = useRef<DragPayload | null>(null);
  const didDragRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef(layout);
  const narrow = rail === "narrow";
  const allRows = resolveNavLayout(layout, { isAdmin });
  const { main, utility } = splitNavSections(allRows);
  const addableLinks = customizing && !narrow ? unusedCatalogLinks(layout, { isAdmin }) : [];
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
    if (!ready || customizing) return;
    const routePrimary = primaryIdForPath(pathname, layout, isAdmin);
    if (routePrimary) setOpenId(routePrimary);
  }, [pathname, ready, layout, isAdmin, customizing]);

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
    const epoch = persistEpoch.current;
    persistTimer.current = setTimeout(() => {
      persistChain.current = persistChain.current.then(async () => {
        if (epoch !== persistEpoch.current) return;
        const result = await saveNavLayoutAction(normalized);
        if (epoch !== persistEpoch.current) return;
        if (!result.ok) setSaveError(result.error);
      });
    }, 200);
  }

  function applyDrop(key: string | null) {
    const payload = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    if (!payload || !key) return;
    persist(applyNavDrop(layoutRef.current, payload.id, parseDropKey(key)));
  }

  function beginDrag(payload: DragPayload) {
    dragRef.current = payload;
    didDragRef.current = false;
    setDraggingId(payload.id);
  }

  function onChevron(id: string) {
    setOpenId((current) => toggleAccordionId(current, id));
  }

  function resetLayout() {
    persistEpoch.current += 1;
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    const next = defaultStoredNavLayout();
    setLayout(next);
    writeCachedLayout(next);
    setSaveError(null);
    if (!persistEnabled) return;
    const epoch = persistEpoch.current;
    persistChain.current = persistChain.current.then(async () => {
      if (epoch !== persistEpoch.current) return;
      const result = await resetNavLayoutAction();
      if (epoch !== persistEpoch.current) return;
      if (!result.ok) setSaveError(result.error);
      else setLayout(result.layout);
    });
  }

  function bindDrag(id: string, label: string) {
    return {
      title: customizing ? `Drag to move ${label}` : undefined,
      onPointerDown: (event: React.PointerEvent) => {
        if (!customizing || event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("button, select, input")) return;
        originRef.current = { x: event.clientX, y: event.clientY };
        beginDrag({ id });
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent) => {
        if (!dragRef.current) return;
        const dx = event.clientX - originRef.current.x;
        const dy = event.clientY - originRef.current.y;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) didDragRef.current = true;
        const key = dropKeyFromPoint(event.clientX, event.clientY);
        setDropTarget(key);
        if (key?.startsWith("into:") || key?.startsWith("end-folder:")) {
          const folderId = key.startsWith("into:") ? key.slice(5) : key.slice("end-folder:".length);
          if (folderId) setOpenId(folderId);
        }
      },
      onPointerUp: (event: React.PointerEvent) => {
        if (!dragRef.current) return;
        if (didDragRef.current) {
          event.preventDefault();
          applyDrop(dropKeyFromPoint(event.clientX, event.clientY));
          return;
        }
        dragRef.current = null;
        setDraggingId(null);
        setDropTarget(null);
      },
      onPointerCancel: () => {
        dragRef.current = null;
        setDraggingId(null);
        setDropTarget(null);
      },
      onClickCapture: (event: React.MouseEvent) => {
        if (!didDragRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        didDragRef.current = false;
      },
    };
  }

  function dropHandlers(key: string) {
    if (!customizing) return {};
    return {
      "data-nav-drop": key,
    };
  }

  function renderItem(row: ResolvedNavItem, section: "main" | "utility") {
    const open = customizing ? row.submenu.length > 0 : openId === row.id;
    const Icon = row.link.icon;
    const panelId = `ff-nav-${row.id}`;
    const primaryActive = pathIsActive(pathname, row.link);
    const showChevron = !narrow && !customizing && row.submenu.length > 0;
    const intoKey = dropKey({ type: "into", id: row.id });
    const beforeKey = dropKey({ type: "before", id: row.id });
    const afterKey = dropKey({ type: "after", id: row.id });
    const endFolderKey = dropKey({ type: "end-folder", parentId: row.id });
    const dragging = draggingId === row.id;
    const showKids = open && !narrow && row.submenu.length > 0;

    return (
      <div key={row.id} className="relative">
        {customizing ? (
          <div
            {...dropHandlers(beforeKey)}
            className={cn("mx-1 h-2.5 rounded-sm", zoneClass(dropTarget === beforeKey, "gap"))}
            aria-hidden
          />
        ) : null}
        <div
          {...dropHandlers(intoKey)}
          {...bindDrag(row.id, row.link.label)}
          data-nav-dragging={dragging ? "1" : undefined}
          className={cn(
            "flex items-center rounded-md",
            zoneClass(dropTarget === intoKey, "nest"),
            customizing && row.hidden ? "opacity-55" : "",
            customizing ? "cursor-grab active:cursor-grabbing" : "",
            dragging ? "pointer-events-none opacity-40" : "",
          )}
        >
          <Link
            href={row.link.href}
            title={row.link.label}
            draggable={false}
            className={cn(
              "flex min-w-0 flex-1 items-center rounded-md py-2 text-sm font-semibold",
              narrow ? "justify-center px-0" : "gap-2 px-2",
              primaryActive && !customizing
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
        {showKids ? (
          <div
            id={panelId}
            className={cn(
              "mt-0.5 space-y-0.5",
              !customizing && section === "utility" ? "max-h-36 overflow-y-auto" : "",
            )}
            role="region"
            aria-label={row.link.label}
          >
            {row.submenu.map((item) => {
              const SubIcon = item.icon;
              const settingsSection = search.get("section");
              const active = item.href.includes("section=")
                ? pathname === "/me" && settingsSection === "signature" && item.href.includes("section=signature")
                : pathIsActive(pathname, item);
              const beforeChild = dropKey({ type: "before", id: item.id });
              const afterChild = dropKey({ type: "after", id: item.id });
              const childDragging = draggingId === item.id;
              return (
                <div key={`${row.id}-${item.id}`} className="relative">
                  {customizing ? (
                    <div
                      {...dropHandlers(beforeChild)}
                      className={cn("mx-2 h-2 rounded-sm", zoneClass(dropTarget === beforeChild, "gap"))}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    {...dropHandlers(afterChild)}
                    {...bindDrag(item.id, item.label)}
                    data-nav-dragging={childDragging ? "1" : undefined}
                    className={cn(
                      "flex items-center rounded-md",
                      zoneClass(dropTarget === afterChild, "gap"),
                      customizing ? "cursor-grab active:cursor-grabbing" : "",
                      childDragging ? "pointer-events-none opacity-40" : "",
                    )}
                  >
                    <Link
                      href={item.href}
                      title={item.label}
                      draggable={false}
                      className={cn(
                        "flex min-w-0 flex-1 items-center rounded-md py-1.5 text-sm",
                        customizing ? "gap-2 px-2" : "gap-2 px-2.5",
                        active && !customizing
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
                className={cn("mx-2 h-2 rounded-sm", zoneClass(dropTarget === endFolderKey, "gap"))}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}
        {customizing ? (
          <div
            {...dropHandlers(afterKey)}
            className={cn("mx-1 h-2.5 rounded-sm", zoneClass(dropTarget === afterKey, "gap"))}
            aria-hidden
          />
        ) : null}
      </div>
    );
  }

  function renderSection(rows: ResolvedNavRow[], label: string, section: "main" | "utility") {
    return (
      <div className="space-y-0.5" aria-label={label}>
        {rows.map((row) => {
          if (row.kind === "item" && row.hidden && !customizing) return null;
          if (row.kind === "divider") {
            const before = dropKey({ type: "before", id: DIVIDER_ID });
            const after = dropKey({ type: "after", id: DIVIDER_ID });
            return (
              <div key={DIVIDER_ID}>
                {customizing ? (
                  <div
                    {...dropHandlers(before)}
                    className={cn("mx-1 h-2.5 rounded-sm", zoneClass(dropTarget === before, "gap"))}
                    aria-hidden
                  />
                ) : null}
                <div
                  {...(customizing ? { ...dropHandlers(after), ...bindDrag(DIVIDER_ID, "Divider") } : {})}
                  data-nav-dragging={draggingId === DIVIDER_ID ? "1" : undefined}
                  className={cn(
                    "my-1 border-t border-sidebar-border",
                    customizing ? "cursor-grab py-2" : "my-2",
                    dropTarget === after ? "border-[var(--ff-card)] border-t-2" : "",
                    draggingId === DIVIDER_ID ? "pointer-events-none opacity-40" : "",
                  )}
                  role="separator"
                  title={customizing ? "Drag to move divider" : undefined}
                />
              </div>
            );
          }
          return renderItem(row, section);
        })}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "ff-no-print sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground md:flex",
        narrow ? "w-14" : "w-60",
      )}
    >
      <div className={cn("shrink-0", narrow ? "px-1.5 pt-4" : "px-4 pt-5")}>
        <Link href="/" className="block" title="FitFirst home">
          <div className={cn("font-semibold tracking-tight text-white", narrow ? "text-center text-sm" : "text-lg")}>
            {narrow ? "FF" : "FitFirst"}
          </div>
          {narrow ? null : (
            <div className="text-caption text-sidebar-foreground/80">
              Owner desk · filter-first P&amp;C
            </div>
          )}
        </Link>
      </div>
      <div
        className={cn(
          "shrink-0 border-b border-sidebar-border",
          narrow ? "px-1.5 pb-4 pt-5" : "px-3 pb-5 pt-5",
        )}
      >
        <button
          type="button"
          title={narrow ? "Expand sidebar" : "Collapse sidebar to icons"}
          aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={narrow}
          onClick={() => {
            setCustomizing(false);
            setRail((current) => (current === "narrow" ? "expanded" : "narrow"));
          }}
          className={cn(
            "inline-flex items-center justify-center rounded-md border border-sidebar-border/80 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
            narrow ? "mx-auto flex size-9" : "h-9 w-full gap-2 px-2",
          )}
        >
          {narrow ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {narrow ? (
            <span className="sr-only">Expand sidebar</span>
          ) : (
            <span className="text-caption">Collapse sidebar</span>
          )}
        </button>
      </div>
      {customizing ? (
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3" aria-label="Desk">
          {renderSection(main, "Primary", "main")}
          {renderSection(utility, "Utility", "utility")}
          <div
            {...dropHandlers("end-primary")}
            className={cn("mx-1 mt-1 h-2.5 rounded-sm", zoneClass(dropTarget === "end-primary", "gap"))}
            aria-hidden
          />
        </nav>
      ) : (
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3" aria-label="Desk">
          {renderSection(main, "Primary", "main")}
        </nav>
      )}
      <div
        className={cn(
          "flex shrink-0 flex-col border-t border-sidebar-border",
          narrow ? "px-1.5 pt-2 pb-3" : "px-2 pt-2 pb-3",
        )}
      >
        {customizing ? null : (
          <nav className="min-h-0 space-y-0.5 overflow-y-auto" aria-label="Utility">
            {renderSection(utility, "Utility", "utility")}
          </nav>
        )}
        {narrow ? null : (
          <div className={cn("shrink-0 space-y-1.5", customizing ? "" : "mt-2 border-t border-sidebar-border pt-2")}>
            {customizing ? (
              addableLinks.length > 0 ? (
                <label className="block text-caption text-sidebar-foreground/80">
                  <span className="sr-only">Add a link to the menu</span>
                  <select
                    aria-label="Add a link to the menu"
                    className="h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-1 text-caption text-white"
                    value=""
                    onChange={(event) => {
                      const id = event.target.value;
                      if (!id) return;
                      persist(addCatalogLink(layout, id));
                    }}
                  >
                    <option value="">Add link…</option>
                    {addableLinks.map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="px-1 text-caption text-sidebar-foreground/60">
                  Every unused desk link is already on the rail.
                </p>
              )
            ) : null}
            <button
              type="button"
              data-nav-customize="1"
              aria-pressed={customizing}
              onClick={() => setCustomizing((current) => !current)}
              className="flex w-full items-center gap-1.5 rounded-md bg-sidebar-accent/50 px-1 py-1.5 text-caption text-white hover:bg-sidebar-accent"
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
          </div>
        )}
      </div>
    </aside>
  );
}
