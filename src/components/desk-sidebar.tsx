"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, GripVertical, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
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

function parseDrag(event: React.DragEvent): DragPayload | null {
  try {
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DragPayload;
    if (parsed?.kind === "primary" && typeof parsed.id === "string") return parsed;
    if (parsed?.kind === "sub" && typeof parsed.id === "string" && typeof parsed.primaryId === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
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
  const narrow = rail === "narrow";
  const rows = resolveNavLayout(layout);

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

  function onChevron(id: string) {
    setOpenId((current) => toggleAccordionId(current, id));
  }

  function onPrimaryDrop(targetId: string, event: React.DragEvent) {
    event.preventDefault();
    setDropKey(null);
    const payload = parseDrag(event);
    if (!payload || payload.kind !== "primary") return;
    persist(reorderPrimaries(layout, payload.id, targetId));
  }

  function onSubDrop(primaryId: string, targetId: string, event: React.DragEvent) {
    event.preventDefault();
    setDropKey(null);
    const payload = parseDrag(event);
    if (!payload || payload.kind !== "sub" || payload.primaryId !== primaryId) return;
    persist(reorderSubmenu(layout, primaryId, payload.id, targetId));
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

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex",
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Desk">
        {rows.map((row) => {
          const open = openId === row.id;
          const Icon = row.link.icon;
          const panelId = `ff-nav-${row.id}`;
          const primaryActive = pathIsActive(pathname, row.link);
          const showChevron = !narrow && (customizing || row.submenu.length > 0);
          const addable = customizing ? availableSubmenuLinks(layout, row.id) : [];
          return (
            <div key={row.id}>
              <div
                className={cn(
                  "flex items-center rounded-md",
                  dropKey === `primary:${row.id}` ? "ring-1 ring-white/70" : "",
                )}
                onDragOver={
                  customizing && !row.pinned
                    ? (event) => {
                        event.preventDefault();
                        setDropKey(`primary:${row.id}`);
                      }
                    : undefined
                }
                onDragLeave={() => {
                  setDropKey((current) => (current === `primary:${row.id}` ? null : current));
                }}
                onDrop={
                  customizing && !row.pinned ? (event) => onPrimaryDrop(row.id, event) : undefined
                }
              >
                {customizing && !narrow && !row.pinned ? (
                  <span
                    draggable
                    title="Drag to reorder"
                    aria-label={`Reorder ${row.link.label}`}
                    className="cursor-grab px-0.5 text-sidebar-foreground/70 active:cursor-grabbing"
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ kind: "primary", id: row.id } satisfies DragPayload),
                      );
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <GripVertical className="size-3.5" />
                  </span>
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
                  {row.submenu.map((item) => {
                    const SubIcon = item.icon;
                    const settingsSection = search.get("section");
                    const active = item.href.includes("section=")
                      ? pathname === "/settings" && settingsSection === "phone" && item.href.includes("section=phone")
                      : pathIsActive(pathname, item);
                    return (
                      <div
                        key={`${row.id}-${item.id}`}
                        className={cn(
                          "flex items-center rounded-md",
                          dropKey === `sub:${row.id}:${item.id}` ? "ring-1 ring-white/70" : "",
                        )}
                        onDragOver={
                          customizing
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setDropKey(`sub:${row.id}:${item.id}`);
                              }
                            : undefined
                        }
                        onDragLeave={() => {
                          setDropKey((current) => (current === `sub:${row.id}:${item.id}` ? null : current));
                        }}
                        onDrop={
                          customizing
                            ? (event) => {
                                event.stopPropagation();
                                onSubDrop(row.id, item.id, event);
                              }
                            : undefined
                        }
                      >
                        {customizing ? (
                          <span
                            draggable
                            title="Drag to reorder submenu"
                            aria-label={`Reorder ${item.label}`}
                            className="cursor-grab px-0.5 text-sidebar-foreground/60 active:cursor-grabbing"
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                JSON.stringify({
                                  kind: "sub",
                                  primaryId: row.id,
                                  id: item.id,
                                } satisfies DragPayload),
                              );
                              event.dataTransfer.effectAllowed = "move";
                            }}
                          >
                            <GripVertical className="size-3.5" />
                          </span>
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
      <div className={cn("space-y-3 border-t border-sidebar-border py-3", narrow ? "px-1.5" : "px-3")}>
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
