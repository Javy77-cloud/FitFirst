"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, GripVertical, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { resetNavLayoutAction, saveNavLayoutAction } from "@/app/actions/nav-layout";
import { logoutDesk } from "@/app/actions/auth";
import { ActorSwitcher } from "@/components/actor-switcher";
import { pathIsActive } from "@/components/desk-nav-groups";
import type { Actor } from "@/lib/auth/rbac";
import {
  addSubmenuLink,
  availableSubmenuLinks,
  defaultStoredNavLayout,
  normalizeNavLayout,
  nudgePrimary,
  nudgeSubmenu,
  primaryIdForPath,
  removeSubmenuLink,
  reorderPrimaries,
  reorderSubmenu,
  resolveNavLayout,
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

const NAV_LAYOUT_CACHE = "ff-nav-layout:v1";

type DragPayload =
  | { kind: "primary"; id: string }
  | { kind: "sub"; primaryId: string; id: string };

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
  users,
  signedIn,
  initialLayout,
}: {
  unread: number;
  actor: Actor;
  users: Actor[];
  signedIn: boolean;
  initialLayout?: StoredNavLayout | null;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [layout, setLayout] = useState<StoredNavLayout>(() =>
    normalizeNavLayout(initialLayout ?? defaultStoredNavLayout()),
  );
  const [openId, setOpenId] = useState(() => primaryIdForPath(pathname, layout));
  const [rail, setRail] = useState<SidebarRail>("expanded");
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const persistEnabled = signedIn && Boolean(actor.id);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragPayload | null>(null);
  const layoutRef = useRef(layout);
  const narrow = rail === "narrow";
  const rows = resolveNavLayout(layout);
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
    const routePrimary = primaryIdForPath(pathname, layout);
    if (routePrimary) setOpenId(routePrimary);
  }, [pathname, ready, layout]);

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
    setDropKey(null);
    if (!payload || !key) return;
    const current = layoutRef.current;
    if (payload.kind === "primary" && key.startsWith("primary:")) {
      persist(reorderPrimaries(current, payload.id, key.slice("primary:".length)));
      return;
    }
    if (payload.kind === "sub" && key.startsWith("sub:")) {
      const rest = key.slice(4);
      const sep = rest.indexOf(":");
      if (sep < 0) return;
      const primaryId = rest.slice(0, sep);
      const targetId = rest.slice(sep + 1);
      if (payload.primaryId !== primaryId) return;
      persist(reorderSubmenu(current, primaryId, payload.id, targetId));
    }
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

  function reorderHandle(payload: DragPayload, label: string) {
    return (
      <span
        draggable
        title={`Drag to reorder ${label}`}
        aria-label={`Reorder ${label}`}
        data-nav-handle={payload.kind === "primary" ? payload.id : `${payload.primaryId}:${payload.id}`}
        className="cursor-grab px-0.5 text-sidebar-foreground/70 active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          beginDrag(payload);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          setDropKey(dropKeyFromPoint(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          if (!dragRef.current) return;
          applyDrop(dropKeyFromPoint(event.clientX, event.clientY));
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDropKey(null);
        }}
        onDragStart={(event) => {
          beginDrag(payload);
          event.dataTransfer.setData("text/plain", JSON.stringify(payload));
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          dragRef.current = null;
          setDropKey(null);
        }}
      >
        <GripVertical className="size-3.5" />
      </span>
    );
  }

  return (
    <aside
      className={cn(
        "ff-no-print sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex",
        narrow ? "w-14" : "w-60",
      )}
    >
      <div className={cn("border-b border-sidebar-border", narrow ? "px-2 py-3" : "px-4 py-4")}>
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
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Desk">
        {rows.map((row, rowIndex) => {
          const open = openId === row.id;
          const Icon = row.link.icon;
          const panelId = `ff-nav-${row.id}`;
          const primaryActive = pathIsActive(pathname, row.link);
          const showChevron = !narrow && (customizing || row.submenu.length > 0);
          const addable = customizing ? availableSubmenuLinks(layout, row.id) : [];
          const movablePrimaries = rows.filter((item) => !item.pinned);
          const primaryDrop = `primary:${row.id}`;
          return (
            <div key={row.id}>
              <div
                data-nav-drop={row.pinned ? undefined : primaryDrop}
                className={cn(
                  "flex items-center rounded-md",
                  dropKey === primaryDrop ? "ring-1 ring-white/70" : "",
                )}
                onDragOver={
                  customizing && !row.pinned
                    ? (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropKey(primaryDrop);
                      }
                    : undefined
                }
                onDragLeave={() => {
                  setDropKey((current) => (current === primaryDrop ? null : current));
                }}
                onDrop={
                  customizing && !row.pinned
                    ? (event) => {
                        event.preventDefault();
                        applyDrop(primaryDrop);
                      }
                    : undefined
                }
              >
                {customizing && !narrow && !row.pinned ? (
                  <>
                    {reorderHandle({ kind: "primary", id: row.id }, row.link.label)}
                    <span className="flex flex-col">
                      <button
                        type="button"
                        title={`Move ${row.link.label} up`}
                        aria-label={`Move ${row.link.label} up`}
                        disabled={rowIndex === 0}
                        onClick={() => persist(nudgePrimary(layout, row.id, -1))}
                        className="rounded-sm p-0 text-sidebar-foreground/70 hover:text-white disabled:opacity-30"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        title={`Move ${row.link.label} down`}
                        aria-label={`Move ${row.link.label} down`}
                        disabled={rowIndex >= movablePrimaries.length - 1}
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
                    <span className="flex-1 truncate">{row.link.label}</span>
                  )}
                </Link>
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
                      ? pathname === "/settings" && settingsSection === "phone" && item.href.includes("section=phone")
                      : pathIsActive(pathname, item);
                    const subDrop = `sub:${row.id}:${item.id}`;
                    return (
                      <div
                        key={`${row.id}-${item.id}`}
                        data-nav-drop={subDrop}
                        className={cn(
                          "flex items-center rounded-md",
                          dropKey === subDrop ? "ring-1 ring-white/70" : "",
                        )}
                        onDragOver={
                          customizing
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                event.dataTransfer.dropEffect = "move";
                                setDropKey(subDrop);
                              }
                            : undefined
                        }
                        onDragLeave={() => {
                          setDropKey((current) => (current === subDrop ? null : current));
                        }}
                        onDrop={
                          customizing
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                applyDrop(subDrop);
                              }
                            : undefined
                        }
                      >
                        {customizing ? (
                          <>
                            {reorderHandle({ kind: "sub", primaryId: row.id, id: item.id }, item.label)}
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
                        {customizing ? (
                          <button
                            type="button"
                            title={`Remove ${item.label}`}
                            aria-label={`Remove ${item.label}`}
                            onClick={() => persist(removeSubmenuLink(layout, row.id, item.id))}
                            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                          >
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
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
                        Every desk link is already here.
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className={cn("shrink-0 space-y-3 border-t border-sidebar-border py-3", narrow ? "px-1.5" : "px-3")}>
        {!narrow && users.length > 0 && actor.id ? <ActorSwitcher actor={actor} users={users} /> : null}
        {narrow ? null : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setCustomizing((current) => !current)}
              className="flex w-full items-center rounded-md px-1 py-1.5 text-caption text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            >
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
            {customizing && persistEnabled ? (
              <p className="px-1 text-caption text-sidebar-foreground/60">
                Saved to your desk. Survives refresh.
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          title={narrow ? "Expand sidebar" : "Collapse sidebar to icons"}
          aria-pressed={narrow}
          onClick={() => {
            setCustomizing(false);
            setRail((current) => (current === "narrow" ? "expanded" : "narrow"));
          }}
          className={cn(
            "flex w-full items-center rounded-md py-1.5 text-caption text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
            narrow ? "justify-center px-0" : "gap-2 px-1",
          )}
        >
          {narrow ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
          {narrow ? <span className="sr-only">Expand sidebar</span> : <span>Collapse sidebar</span>}
        </button>
        {narrow ? null : (
          <div className="flex gap-2 px-1 text-caption text-sidebar-foreground/80">
            <Link href="/login" className="hover:text-white hover:underline">
              {signedIn ? "Switch user" : "Sign in"}
            </Link>
            {signedIn ? (
              <form action={logoutDesk}>
                <button type="submit" className="hover:text-white hover:underline">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
